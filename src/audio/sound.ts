import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_PREFIX } from "@/store/storage";

/**
 * Game sounds, synthesised with the Web Audio API: no audio files to download or license,
 * and every effect is a few lines below. Browsers only allow audio after a user gesture, so
 * the context is created lazily and resumed on the first pointer/key event.
 */

export type SoundName =
  | "pick"
  | "conquer"
  | "attack"
  | "rollWon"
  | "rollLost"
  | "decline"
  | "coin"
  | "yourTurn"
  | "turn"
  | "tick"
  | "chat"
  | "join"
  | "leave"
  | "error"
  | "victory"
  | "click";

interface SoundSettings {
  /** 0..1 */
  volume: number;
  muted: boolean;
  setVolume: (volume: number) => void;
  toggleMuted: () => void;
}

export const useSoundSettings = create<SoundSettings>()(
  persist(
    (set, get) => ({
      volume: 0.6,
      muted: false,
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)), muted: volume === 0 ? get().muted : false }),
      toggleMuted: () => set({ muted: !get().muted }),
    }),
    { name: `${STORAGE_PREFIX}sound`, version: 1 }
  )
);

let context: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  if (!context) {
    context = new AudioContext();
    master = context.createGain();
    master.connect(context.destination);
    applyVolume();
  }
  if (context.state === "suspended") void context.resume();
  return { ctx: context, out: master! };
}

function applyVolume() {
  if (!master || !context) return;
  const { volume, muted } = useSoundSettings.getState();
  // Perceived loudness is roughly quadratic.
  master.gain.setTargetAtTime(muted ? 0 : volume * volume * 0.8, context.currentTime, 0.02);
}

useSoundSettings.subscribe(applyVolume);

// Unlock audio on the first interaction (autoplay policies).
if (typeof window !== "undefined") {
  const unlock = () => {
    audio();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

// ------------------------------------------------------------------ synth helpers

interface ToneOptions {
  freq: number;
  /** Frequency reached at the end (glide). */
  to?: number;
  type?: OscillatorType;
  start?: number;
  duration: number;
  gain?: number;
  attack?: number;
}

function tone(ctx: AudioContext, out: AudioNode, { freq, to, type = "sine", start = 0, duration, gain = 0.3, attack = 0.005 }: ToneOptions) {
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + duration);
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(gain, t0 + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(env).connect(out);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

interface NoiseOptions {
  start?: number;
  duration: number;
  gain?: number;
  filter?: number;
  type?: BiquadFilterType;
}

function noise(ctx: AudioContext, out: AudioNode, { start = 0, duration, gain = 0.3, filter = 1200, type = "lowpass" }: NoiseOptions) {
  const t0 = ctx.currentTime + start;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const biquad = ctx.createBiquadFilter();
  biquad.type = type;
  biquad.frequency.value = filter;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, t0);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(biquad).connect(env).connect(out);
  src.start(t0);
}

const NOTE = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };

const SOUNDS: Record<SoundName, (ctx: AudioContext, out: AudioNode) => void> = {
  click: (c, o) => tone(c, o, { freq: 900, duration: 0.04, gain: 0.12 }),
  pick: (c, o) => [NOTE.C5, NOTE.E5, NOTE.G5].forEach((freq, i) => tone(c, o, { freq, type: "triangle", start: i * 0.07, duration: 0.25, gain: 0.22 })),
  conquer: (c, o) => {
    tone(c, o, { freq: 150, to: 55, duration: 0.25, gain: 0.5 });
    noise(c, o, { duration: 0.12, gain: 0.25, filter: 900 });
  },
  attack: (c, o) => {
    noise(c, o, { duration: 0.18, gain: 0.3, filter: 3000, type: "highpass" });
    tone(c, o, { freq: 1800, to: 1200, type: "square", duration: 0.15, gain: 0.06 });
    tone(c, o, { freq: 2400, to: 1500, type: "square", start: 0.02, duration: 0.2, gain: 0.04 });
    tone(c, o, { freq: 130, to: 50, duration: 0.3, gain: 0.45 });
  },
  rollWon: (c, o) => {
    for (let i = 0; i < 5; i++) noise(c, o, { start: i * 0.05, duration: 0.03, gain: 0.25, filter: 2500, type: "bandpass" });
    [NOTE.E5, NOTE.A5].forEach((freq, i) => tone(c, o, { freq, type: "triangle", start: 0.3 + i * 0.1, duration: 0.3, gain: 0.22 }));
  },
  rollLost: (c, o) => {
    for (let i = 0; i < 5; i++) noise(c, o, { start: i * 0.05, duration: 0.03, gain: 0.25, filter: 2500, type: "bandpass" });
    tone(c, o, { freq: 300, to: 150, type: "sawtooth", start: 0.3, duration: 0.4, gain: 0.08 });
  },
  decline: (c, o) => tone(c, o, { freq: 440, to: 180, type: "triangle", duration: 0.7, gain: 0.25, attack: 0.03 }),
  coin: (c, o) => {
    tone(c, o, { freq: NOTE.G6 / 1.5, duration: 0.08, gain: 0.15 });
    tone(c, o, { freq: NOTE.G6, start: 0.07, duration: 0.35, gain: 0.15 });
  },
  yourTurn: (c, o) =>
    [NOTE.A5, NOTE.E6].forEach((freq, i) => {
      tone(c, o, { freq, start: i * 0.12, duration: 0.9, gain: 0.22 });
      tone(c, o, { freq: freq * 2, start: i * 0.12, duration: 0.5, gain: 0.05 });
    }),
  turn: (c, o) => tone(c, o, { freq: 700, to: 500, type: "triangle", duration: 0.12, gain: 0.12 }),
  tick: (c, o) => tone(c, o, { freq: 1200, type: "square", duration: 0.03, gain: 0.05 }),
  chat: (c, o) => tone(c, o, { freq: 1000, to: 1400, duration: 0.08, gain: 0.1 }),
  join: (c, o) => [NOTE.D5, NOTE.A5].forEach((freq, i) => tone(c, o, { freq, start: i * 0.09, duration: 0.2, gain: 0.15 })),
  leave: (c, o) => [NOTE.A5, NOTE.D5].forEach((freq, i) => tone(c, o, { freq, start: i * 0.09, duration: 0.2, gain: 0.15 })),
  error: (c, o) => tone(c, o, { freq: 160, type: "square", duration: 0.16, gain: 0.08 }),
  victory: (c, o) =>
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.G5, NOTE.C6].forEach((freq, i) =>
      tone(c, o, { freq, type: "triangle", start: [0, 0.12, 0.24, 0.36, 0.6, 0.72][i], duration: i === 5 ? 1 : 0.2, gain: 0.25 })
    ),
};

/** Plays a sound effect (no-op when muted or when the browser has no Web Audio). */
export function playSound(name: SoundName, delay = 0): void {
  const { muted, volume } = useSoundSettings.getState();
  if (muted || volume === 0) return;
  const run = () => {
    const a = audio();
    if (a) SOUNDS[name](a.ctx, a.out);
  };
  if (delay > 0) setTimeout(run, delay);
  else run();
}
