// Synthesized sound effects via Web Audio API — no audio assets to fetch,
// just oscillators that compose into short, kid-friendly chimes.
//
// Mutable mute toggle persisted in localStorage so a setting can flip it.
// Audio context unlock: browsers refuse to start audio before a user
// gesture, so we lazily create the context on the first attempted play
// and resume it. The first sound a user hears is also the one that
// unlocks playback for the rest of the session.

const MUTE_KEY = "growquest:muted";

let ctx: AudioContext | null = null;

function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    if (muted) localStorage.setItem(MUTE_KEY, "1");
    else localStorage.removeItem(MUTE_KEY);
  } catch {
    /* ignore */
  }
}

export function getMuted(): boolean {
  return isMuted();
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (isMuted()) return null;
  if (!ctx) {
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AC = W.AudioContext ?? W.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
  return ctx;
}

interface Note {
  freq: number;
  when: number;
  duration: number;
  gain?: number;
  type?: OscillatorType;
}

function play(notes: Note[]): void {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime;
  for (const n of notes) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.value = n.freq;
    const gain = n.gain ?? 0.15;
    g.gain.setValueAtTime(0, t0 + n.when);
    g.gain.linearRampToValueAtTime(gain, t0 + n.when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + n.when + n.duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t0 + n.when);
    osc.stop(t0 + n.when + n.duration + 0.02);
  }
}

// C5 E5 G5 C6 — classic coin pickup arpeggio
export function playWinChime(): void {
  play([
    { freq: 523, when: 0.0, duration: 0.18 },
    { freq: 659, when: 0.1, duration: 0.18 },
    { freq: 784, when: 0.2, duration: 0.2 },
    { freq: 1047, when: 0.32, duration: 0.35, gain: 0.2 }
  ]);
}

// Quick rising whoosh — confirmation that a mission was submitted
export function playSubmit(): void {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "triangle";
  const t = c.currentTime;
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(900, t + 0.18);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.16, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(t + 0.25);
}

// Soft "pop" for tab switches and small UI moments
export function playPop(): void {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  const t = c.currentTime;
  osc.frequency.setValueAtTime(900, t);
  osc.frequency.exponentialRampToValueAtTime(450, t + 0.08);
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(t + 0.12);
}

// Sad descending tone for rejection
export function playReject(): void {
  play([
    { freq: 440, when: 0.0, duration: 0.18, type: "triangle" },
    { freq: 330, when: 0.12, duration: 0.25, type: "triangle" }
  ]);
}

// Celebratory ta-daa when a savings goal is fully funded
export function playGoalReached(): void {
  play([
    { freq: 523, when: 0.0, duration: 0.12 },
    { freq: 659, when: 0.08, duration: 0.12 },
    { freq: 784, when: 0.16, duration: 0.12 },
    { freq: 1047, when: 0.24, duration: 0.5, gain: 0.22 }
  ]);
}
