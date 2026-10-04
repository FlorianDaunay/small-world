import Peer, { type DataConnection, type PeerError } from "peerjs";
import { PEER_OPTIONS } from "./config";

/** Thin promise helpers around PeerJS events. */

export class NetError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

/** Registers on the signalling broker, with a fixed id (host) or a random one (client). */
export function openPeer(id?: string): Promise<Peer> {
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id, PEER_OPTIONS) : new Peer(PEER_OPTIONS);
    const onError = (error: PeerError<string>) => {
      peer.destroy();
      reject(new NetError(error.type === "unavailable-id" ? "idTaken" : error.type === "browser-incompatible" ? "browser" : "broker"));
    };
    peer.once("open", () => {
      peer.off("error", onError);
      // Losing the broker does not cut existing connections, but new peers could not reach us.
      peer.on("disconnected", () => {
        if (!peer.destroyed) setTimeout(() => !peer.destroyed && peer.disconnected && peer.reconnect(), 1500);
      });
      resolve(peer);
    });
    peer.once("error", onError);
  });
}

/** Opens a reliable data channel to `targetId`; fails fast if nobody holds that id. */
export function connectTo(peer: Peer, targetId: string, timeout: number): Promise<DataConnection> {
  return new Promise((resolve, reject) => {
    if (peer.disconnected && !peer.destroyed) peer.reconnect();
    const conn = peer.connect(targetId, { reliable: true, serialization: "json" });
    const cleanup = () => {
      clearTimeout(timer);
      peer.off("error", onPeerError);
    };
    const fail = (code: string) => {
      cleanup();
      conn.close();
      reject(new NetError(code));
    };
    const onPeerError = (error: PeerError<string>) => {
      if (error.type === "peer-unavailable" && error.message.includes(targetId)) fail("unavailable");
    };
    const timer = setTimeout(() => fail("timeout"), timeout);
    peer.on("error", onPeerError);
    conn.once("open", () => {
      cleanup();
      resolve(conn);
    });
    conn.once("error", () => fail("connection"));
  });
}

/** Resolves with the first message received on `conn` that `accept` returns a value for. */
export function waitForMessage<T>(conn: DataConnection, accept: (data: unknown) => T | undefined, timeout: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const onData = (data: unknown) => {
      const value = accept(data);
      if (value !== undefined) {
        cleanup();
        resolve(value);
      }
    };
    const onClose = () => {
      cleanup();
      reject(new NetError("closed"));
    };
    const cleanup = () => {
      clearTimeout(timer);
      conn.off("data", onData);
      conn.off("close", onClose);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new NetError("timeout"));
    }, timeout);
    conn.on("data", onData);
    conn.on("close", onClose);
  });
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
