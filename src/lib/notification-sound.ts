// Plays a synthesized "cash register / cha-ching" sound using WebAudio.
// No external audio file needed.
let cachedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!Ctor) return null;
  if (!cachedCtx) cachedCtx = new Ctor();
  if (cachedCtx.state === "suspended") cachedCtx.resume().catch(() => {});
  return cachedCtx;
}

function blip(ctx: AudioContext, freq: number, startAt: number, duration = 0.18, gain = 0.25, type: OscillatorType = "triangle") {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, startAt);
  g.gain.linearRampToValueAtTime(gain, startAt + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

export function playCashRegister() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  // Two bright "ching" bell tones
  blip(ctx, 1568, t, 0.18, 0.22, "triangle");          // G6
  blip(ctx, 2093, t + 0.06, 0.22, 0.18, "triangle");   // C7
  // Soft ding tail
  blip(ctx, 1318, t + 0.22, 0.35, 0.12, "sine");       // E6
  // Tiny drawer click
  blip(ctx, 220, t + 0.42, 0.08, 0.08, "square");
}

/** Call once on a user gesture (e.g. button click) to unlock audio on iOS. */
export function unlockAudio() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
}
