import type { PeerOptions } from "peerjs";

/** Prefix of every peer id, so rooms of this game never collide with other PeerJS apps. */
export const PEER_PREFIX = "smallworld-v1";

/** Host change attempts a client makes before giving up (each one targets the next candidate). */
export const MAX_EPOCH_PROBE = 8;

/** How long to wait for a peer before trying the next one, in ms. */
export const CONNECT_TIMEOUT = 6000;

/**
 * PeerJS only uses its public broker to introduce peers (signalling); game data then flows
 * directly between browsers over WebRTC. Swap the options here to use a self-hosted broker.
 */
export const PEER_OPTIONS: PeerOptions = {
  debug: 0,
  config: {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:global.stun.twilio.com:3478" }],
  },
};

export const hostPeerId = (code: string, epoch: number) => `${PEER_PREFIX}-${code.toUpperCase()}-${epoch}`;
