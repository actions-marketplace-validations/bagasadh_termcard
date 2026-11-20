// Tiny Web Audio UI sounds, generated in code. Nothing is created until enable() runs in a user gesture.
const PENTA = [392, 440, 523.25, 587.33, 659.25];

export function createSound() {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let master = null;
  let noise = null;
  let enabled = false;
  let lastTick = 0;

  function build() {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
  }

  const live = () => enabled && ctx && ctx.state === "running";

  function blip(freq, freq2, peak, attack, decay, type = "sine", at = 0) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freq2) o.frequency.exponentialRampToValueAtTime(freq2, t + attack + decay * 0.5);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  function sweepNoise(f1, f2, dur, peak) {
    const t = ctx.currentTime;
    const s = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    s.buffer = noise;
    f.type = "bandpass";
    f.Q.value = 1.1;
    f.frequency.setValueAtTime(f1, t);
    f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t);
    s.stop(t + dur + 0.05);
  }

  return {
    get running() {
      return !!ctx && ctx.state === "running";
    },
    enable() {
      enabled = true;
      if (!ctx) build();
      if (ctx.state !== "running") ctx.resume().catch(() => {});
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.6, ctx.currentTime, 0.2);
    },
    disable() {
      enabled = false;
      if (!ctx) return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    },
    tick() {
      if (!live() || ctx.currentTime - lastTick < 0.06) return;
      lastTick = ctx.currentTime;
      blip(3520, 0, 0.03, 0.001, 0.07);
    },
    tap() {
      if (!live()) return;
      const f = PENTA[Math.floor(Math.random() * PENTA.length)];
      blip(f, 0, 0.1, 0.002, 0.4);
      blip(f * 4, 0, 0.025, 0.001, 0.06);
    },
    swoosh(open) {
      if (live()) sweepNoise(open ? 450 : 2200, open ? 2200 : 450, 0.55, 0.09);
    },
    sweep(dur = 1.5) {
      if (!live()) return;
      blip(220, 520, 0.05, 0.18, Math.max(0.4, dur * 0.6));
      sweepNoise(300, 1600, Math.max(0.4, dur * 0.6), 0.035);
    },
    chime() {
      if (!live()) return;
      blip(659.25, 0, 0.06, 0.004, 1.3);
      blip(830.61, 0, 0.06, 0.004, 1.3, "sine", 0.035);
    },
  };
}

