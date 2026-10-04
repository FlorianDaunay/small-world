import type Peer from "peerjs";
import type { DataConnection } from "peerjs";
import { applyAction, applySystem, createGame, normalizeGame, type GameAction, type GameSettings, type GameState, type SystemAction } from "@/core/game";
import { defaultMap } from "@/core/map/defaults";
import type { GameMap } from "@/core/map/types";
import { randomSeed } from "@/core/util/rng";
import { roomCode, uid } from "@/core/util/id";
import { CONNECT_TIMEOUT, MAX_EPOCH_PROBE, hostPeerId } from "./config";
import { NetError, connectTo, openPeer, sleep, waitForMessage } from "./peer";
import {
  HEARTBEAT_TIMEOUT,
  MAX_CHAT,
  MAX_CHAT_LENGTH,
  PROTOCOL_VERSION,
  type ClientMessage,
  type HostMessage,
  type RejectReason,
  type RoomSnapshot,
} from "./protocol";

export type SessionRole = "host" | "client";
export type SessionStatus = "connected" | "migrating" | "closed";

/** What the UI sees of a session. */
export interface SessionView {
  role: SessionRole;
  status: SessionStatus;
  /** Id of the local player in this room (may differ from the profile id after a seat match). */
  me: string;
  room: RoomSnapshot;
  /** Why the session closed (`kicked`, `hostLost`, ...). */
  error: string | null;
  /** Last action the host refused, with a timestamp so the UI can show it once. */
  refusal: { error: string; at: number } | null;
}

export interface HostOptions {
  playerId: string;
  name: string;
  password: string;
  passwordHash: string;
  settings: GameSettings;
  customMap: GameMap | null;
  /** Resume this game instead of opening a fresh lobby. */
  game?: GameState;
  code?: string;
}

export interface JoinOptions {
  playerId: string;
  name: string;
  passwordHash: string;
  code: string;
}

/** Grace period after a host change before absent players are marked disconnected. */
const RECONNECT_GRACE = 20000;
const SYSTEM = "system";

/**
 * A multiplayer room over WebRTC. The host holds the authoritative state, validates every
 * action with the game engine and broadcasts the result. Every peer keeps a full copy of the
 * room, so when the host disappears the next player in join order takes over: it registers
 * the next host id (`<code>-<epoch+1>`) and the others reconnect to it.
 */
export class Session {
  private peer: Peer | null = null;
  private hostConn: DataConnection | null = null;
  private readonly conns = new Map<string, DataConnection>();
  private readonly kicked = new Set<string>();
  /** Last time each peer (or the host, under the key "host") was heard from. */
  private readonly lastSeen = new Map<string, number>();
  private readonly listeners = new Set<(view: SessionView) => void>();
  private tick: ReturnType<typeof setInterval> | null = null;
  private view: SessionView;

  private constructor(role: SessionRole, me: string, room: RoomSnapshot, private readonly name: string) {
    this.view = { role, status: "connected", me, room, error: null, refusal: null };
  }

  // ---------------------------------------------------------------- creation

  static async host(options: HostOptions): Promise<Session> {
    const players = options.game?.players ?? [];
    const room: RoomSnapshot = {
      code: options.code ?? roomCode(),
      epoch: 0,
      hostId: options.playerId,
      passwordHash: options.passwordHash,
      settings: options.settings,
      customMap: options.customMap,
      lobby: options.game
        ? players.map((p) => ({ id: p.id, name: p.name, connected: false }))
        : [{ id: options.playerId, name: options.name, connected: true }],
      game: options.game ?? null,
      chat: [],
    };
    let me = options.playerId;
    if (room.game) {
      // Resuming: the host takes back their own seat (or the first one when it is not theirs).
      const seat = room.game.players.find((p) => p.id === me) ?? room.game.players[0];
      me = seat.id;
      room.hostId = me;
      room.game = normalizeGame(room.game);
      for (const p of room.game.players) p.connected = p.id === me;
      room.lobby.forEach((p) => (p.connected = p.id === me));
      if (room.game.turn.deadline) room.game.turn.deadline = Date.now() + room.game.settings.turnSeconds * 1000;
    }
    const session = new Session("host", me, room, options.name);
    for (let attempt = 0; ; attempt++) {
      try {
        await session.listen();
        return session;
      } catch (error) {
        // A code already in use (very unlikely): draw another one.
        if (error instanceof NetError && error.code === "idTaken" && !options.code && attempt < 3) room.code = roomCode();
        else throw error;
      }
    }
  }

  static async join(options: JoinOptions): Promise<Session> {
    const peer = await openPeer();
    const code = options.code.trim().toUpperCase();
    try {
      for (let epoch = 0; epoch <= MAX_EPOCH_PROBE; epoch++) {
        let conn: DataConnection;
        try {
          conn = await connectTo(peer, hostPeerId(code, epoch), CONNECT_TIMEOUT);
        } catch {
          continue;
        }
        const welcome = await Session.handshake(conn, options.playerId, options.name, options.passwordHash);
        const session = new Session("client", welcome.playerId, welcome.room, options.name);
        session.peer = peer;
        session.attachHost(conn);
        return session;
      }
    } catch (error) {
      peer.destroy();
      throw error;
    }
    peer.destroy();
    throw new NetError("notFound");
  }

  private static async handshake(conn: DataConnection, playerId: string, name: string, passwordHash: string) {
    const hello: ClientMessage = { t: "hello", version: PROTOCOL_VERSION, playerId, name, passwordHash };
    conn.send(hello);
    const reply = await waitForMessage(
      conn,
      (data) => {
        const msg = data as HostMessage;
        return msg && (msg.t === "welcome" || msg.t === "reject") ? msg : undefined;
      },
      CONNECT_TIMEOUT
    );
    if (reply.t === "reject") {
      conn.close();
      throw new NetError(reply.reason);
    }
    return reply as Extract<HostMessage, { t: "welcome" }>;
  }

  // ---------------------------------------------------------------- public API

  get current(): SessionView {
    return this.view;
  }

  subscribe(listener: (view: SessionView) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Plays a game action as the local player. */
  dispatch(action: GameAction): void {
    if (this.view.role === "host") this.handleAction(this.view.me, action);
    else this.send({ t: "action", action });
  }

  chat(text: string): void {
    const clean = text.trim().slice(0, MAX_CHAT_LENGTH);
    if (!clean) return;
    if (this.view.role === "host") this.addChat(this.view.me, clean);
    else this.send({ t: "chat", text: clean });
  }

  /** Host: lobby settings (only before the game starts). */
  updateSettings(settings: GameSettings, customMap: GameMap | null): void {
    if (this.view.role !== "host" || this.view.room.game) return;
    this.mutate((room) => {
      room.settings = settings;
      room.customMap = customMap;
    });
  }

  /** Host: starts the game with everyone in the lobby. */
  start(): void {
    const { room, role } = this.view;
    if (role !== "host" || room.game) return;
    const players = room.lobby.filter((p) => p.connected);
    if (players.length < 2) return;
    const map = room.customMap ?? defaultMap(players.length);
    const game = createGame({ id: uid(), settings: room.settings, map, players, seed: randomSeed(), now: Date.now() });
    this.mutate((r) => {
      r.game = game;
      r.lobby = game.players.map((p) => ({ id: p.id, name: p.name, connected: true }));
    });
  }

  /** Host: removes a player from the room for good. */
  kick(playerId: string): void {
    if (this.view.role !== "host" || playerId === this.view.me) return;
    this.kicked.add(playerId);
    const conn = this.conns.get(playerId);
    if (conn) {
      conn.send({ t: "reject", reason: "kicked" } satisfies HostMessage);
      setTimeout(() => conn.close(), 300);
    }
    this.setConnected(playerId, false);
  }

  /** Host: ends the turn of a player who is away. */
  skipTurn(): void {
    if (this.view.role === "host") this.system({ type: "timeout" });
  }

  leave(): void {
    this.close(null);
  }

  // ---------------------------------------------------------------- host side

  private async listen(): Promise<void> {
    const peer = await openPeer(hostPeerId(this.view.room.code, this.view.room.epoch));
    this.peer = peer;
    peer.on("connection", (conn) => this.acceptConnection(conn));
    this.startTicking(() => this.onTick());
  }

  private acceptConnection(conn: DataConnection): void {
    let playerId: string | null = null;
    conn.on("data", (data) => {
      const msg = data as ClientMessage;
      if (!msg || typeof msg !== "object") return;
      if (playerId) this.lastSeen.set(playerId, Date.now());
      if (!playerId) {
        if (msg.t !== "hello") return conn.close();
        const admission = this.admit(msg);
        if ("reason" in admission) {
          conn.send({ t: "reject", reason: admission.reason } satisfies HostMessage);
          setTimeout(() => conn.close(), 300);
          return;
        }
        playerId = admission.id;
        this.lastSeen.set(playerId, Date.now());
        const previous = this.conns.get(playerId);
        this.conns.set(playerId, conn);
        previous?.close();
        this.setConnected(playerId, true, msg.name);
        conn.send({ t: "welcome", playerId, room: this.view.room } satisfies HostMessage);
        return;
      }
      if (msg.t === "action") this.handleAction(playerId, msg.action);
      else if (msg.t === "chat") this.addChat(playerId, String(msg.text).slice(0, MAX_CHAT_LENGTH));
    });
    const onGone = () => {
      if (playerId && this.conns.get(playerId) === conn) {
        this.conns.delete(playerId);
        this.setConnected(playerId, false);
      }
    };
    conn.on("close", onGone);
    conn.on("error", onGone);
  }

  /** Decides which seat a newcomer gets, or why they are refused. */
  private admit(hello: Extract<ClientMessage, { t: "hello" }>): { id: string } | { reason: RejectReason } {
    const { room } = this.view;
    if (hello.version !== PROTOCOL_VERSION) return { reason: "version" };
    if (hello.passwordHash !== room.passwordHash) return { reason: "password" };
    if (this.kicked.has(hello.playerId)) return { reason: "kicked" };
    if (hello.playerId === this.view.me) return { reason: "started" };

    if (!room.game) {
      if (room.lobby.some((p) => p.id === hello.playerId)) return { id: hello.playerId };
      if (room.lobby.filter((p) => p.connected).length >= room.settings.maxPlayers) return { reason: "full" };
      return { id: hello.playerId };
    }
    // Game in progress: same player id first, then a free seat with the same name, then any free seat.
    const seats = room.game.players;
    const free = seats.filter((p) => !this.conns.has(p.id) && p.id !== this.view.me && !this.kicked.has(p.id));
    const seat =
      seats.find((p) => p.id === hello.playerId && p.id !== this.view.me) ??
      free.find((p) => p.name.toLowerCase() === hello.name.trim().toLowerCase()) ??
      free.find((p) => !p.connected);
    return seat ? { id: seat.id } : { reason: "started" };
  }

  private handleAction(playerId: string, action: GameAction): void {
    const game = this.view.room.game;
    if (!game) return;
    const result = applyAction(game, playerId, action, Date.now());
    if (result.ok) {
      this.mutate((room) => (room.game = result.state));
    } else if (playerId === this.view.me) {
      this.update({ refusal: { error: result.error, at: Date.now() } });
    } else {
      this.conns.get(playerId)?.send({ t: "refused", error: result.error } satisfies HostMessage);
    }
  }

  private system(action: SystemAction): void {
    const game = this.view.room.game;
    if (!game) return;
    const result = applySystem(game, action, Date.now());
    if (result.ok) this.mutate((room) => (room.game = result.state));
  }

  private setConnected(playerId: string, connected: boolean, name?: string): void {
    this.mutate((room) => {
      const entry = room.lobby.find((p) => p.id === playerId);
      if (!room.game && !connected) {
        room.lobby = room.lobby.filter((p) => p.id !== playerId);
      } else if (entry) {
        entry.connected = connected;
        if (name && !room.game) entry.name = name.trim().slice(0, 24) || entry.name;
      } else if (connected) {
        room.lobby.push({ id: playerId, name: (name ?? "?").trim().slice(0, 24) || "?", connected });
      }
      if (room.game) {
        const result = applySystem(room.game, { type: "setConnected", playerId, connected }, Date.now());
        if (result.ok) room.game = result.state;
      }
    });
  }

  private addChat(from: string, text: string): void {
    if (!text.trim()) return;
    const name = this.view.room.lobby.find((p) => p.id === from)?.name ?? "?";
    this.mutate((room) => {
      room.chat = [...room.chat, { from, name, text, at: Date.now() }].slice(-MAX_CHAT);
    });
  }

  private onTick(): void {
    const now = Date.now();
    for (const [id, conn] of this.conns) {
      if (now - (this.lastSeen.get(id) ?? now) > HEARTBEAT_TIMEOUT) {
        // Silent for too long (crash, network loss): free the seat without waiting for WebRTC.
        this.conns.delete(id);
        conn.close();
        this.setConnected(id, false);
      } else if (conn.open) {
        conn.send({ t: "ping" } satisfies HostMessage);
      }
    }
    const game = this.view.room.game;
    if (game?.turn.deadline && game.turn.phase !== "finished" && Date.now() > game.turn.deadline) this.system({ type: "timeout" });
  }

  /** Host: applies a change to the room and sends it to everyone. */
  private mutate(change: (room: RoomSnapshot) => void): void {
    const room = structuredClone(this.view.room);
    change(room);
    this.update({ room });
    const message: HostMessage = { t: "room", room };
    for (const conn of this.conns.values()) if (conn.open) conn.send(message);
  }

  // ---------------------------------------------------------------- client side

  private attachHost(conn: DataConnection): void {
    this.hostConn = conn;
    this.lastSeen.set("host", Date.now());
    this.startTicking(() => {
      if (this.hostConn !== conn) return;
      if (Date.now() - (this.lastSeen.get("host") ?? 0) > HEARTBEAT_TIMEOUT) {
        this.hostConn = null;
        conn.close();
        void this.migrate();
      } else if (conn.open) {
        conn.send({ t: "ping" } satisfies ClientMessage);
      }
    });
    conn.on("data", (data) => {
      const msg = data as HostMessage;
      if (!msg || typeof msg !== "object") return;
      this.lastSeen.set("host", Date.now());
      if (msg.t === "room") this.update({ room: msg.room, status: "connected" });
      else if (msg.t === "refused") this.update({ refusal: { error: msg.error, at: Date.now() } });
      else if (msg.t === "reject") this.close(msg.reason);
    });
    conn.on("close", () => {
      if (this.hostConn === conn && !this.isClosed()) void this.migrate();
    });
  }

  private send(message: ClientMessage): void {
    if (this.hostConn?.open) this.hostConn.send(message);
  }

  /** The host is gone: take over or reconnect to whoever does. */
  private async migrate(): Promise<void> {
    if (this.view.status === "migrating") return;
    this.stopTicking();
    this.hostConn = null;
    this.update({ status: "migrating" });
    const old = this.view.room;
    const candidates = old.lobby.filter((p) => p.id !== old.hostId && p.connected);

    for (let attempt = 0; attempt < candidates.length; attempt++) {
      if (this.isClosed()) return;
      const epoch = old.epoch + 1 + attempt;
      if (candidates[attempt].id === this.view.me) {
        await this.takeOver(old, epoch);
        return;
      }
      const giveUpAt = Date.now() + 15000;
      while (Date.now() < giveUpAt && !this.isClosed()) {
        try {
          if (!this.peer || this.peer.destroyed) this.peer = await openPeer();
          const conn = await connectTo(this.peer, hostPeerId(old.code, epoch), 4000);
          const welcome = await Session.handshake(conn, this.view.me, this.name, old.passwordHash);
          this.update({ me: welcome.playerId, room: welcome.room, status: "connected" });
          this.attachHost(conn);
          return;
        } catch (error) {
          if (error instanceof NetError && ["password", "kicked", "full", "started", "version"].includes(error.code)) {
            this.close(error.code);
            return;
          }
          await sleep(1500);
        }
      }
    }
    this.close("hostLost");
  }

  private async takeOver(old: RoomSnapshot, epoch: number): Promise<void> {
    this.peer?.destroy();
    this.peer = null;
    const room = structuredClone(old);
    room.epoch = epoch;
    room.hostId = this.view.me;
    room.chat = [...room.chat, { from: SYSTEM, name: "", text: "hostChanged", at: Date.now() }].slice(-MAX_CHAT);
    this.view = { ...this.view, role: "host", room };
    try {
      await this.listen();
    } catch {
      this.close("hostLost");
      return;
    }
    this.setConnected(old.hostId, false);
    this.update({ status: "connected" });
    // Players who never come back after the grace period are marked as away.
    setTimeout(() => {
      if (this.isClosed()) return;
      for (const p of this.view.room.lobby) {
        if (p.id !== this.view.me && p.connected && !this.conns.has(p.id)) this.setConnected(p.id, false);
      }
    }, RECONNECT_GRACE);
  }

  // ---------------------------------------------------------------- shared

  /** A method rather than an inline check: the status changes across awaits. */
  private isClosed(): boolean {
    return this.view.status === "closed";
  }

  private update(patch: Partial<SessionView>): void {
    this.view = { ...this.view, ...patch };
    for (const listener of this.listeners) listener(this.view);
  }

  private startTicking(task: () => void): void {
    this.stopTicking();
    this.tick = setInterval(task, 1000);
  }

  private stopTicking(): void {
    if (this.tick) clearInterval(this.tick);
    this.tick = null;
  }

  private close(error: string | null): void {
    if (this.isClosed()) return;
    this.stopTicking();
    this.update({ status: "closed", error });
    for (const conn of this.conns.values()) conn.close();
    this.conns.clear();
    this.hostConn?.close();
    this.hostConn = null;
    this.peer?.destroy();
    this.peer = null;
  }
}

export const SYSTEM_SENDER = SYSTEM;
