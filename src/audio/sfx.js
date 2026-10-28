// Sons synthétisés à la volée (Web Audio), démarrés au premier geste du joueur.
import { $ } from '../util.js';

let AC = null, master = null, nbuf = null, muted = false;
const lastSfx = {};
export function audio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = .45; master.connect(AC.destination);
    nbuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
function nz(dur, f, q, vol, type = 'bandpass', delay = 0) {
  if (!AC || muted) return;
  const t = AC.currentTime + delay, s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = nbuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  s.connect(fl).connect(g).connect(master); s.start(t, Math.random() * .4); s.stop(t + dur + .05);
}
function tn(f0, f1, dur, vol, type = 'square', delay = 0) {
  if (!AC || muted) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + .05);
}
export function sfx(name, gap = 0) {
  if (!AC || muted) return;
  const now = performance.now();
  if (gap && now - (lastSfx[name] || 0) < gap) return;
  lastSfx[name] = now;
  SFX[name]();
}
const SFX = {
  pistol() { nz(.09, 2200, .8, .4); tn(230, 70, .07, .12); },
  uzi() { nz(.05, 2700, .9, .26); tn(280, 90, .04, .06); },
  shotgun() { nz(.24, 900, .6, .75, 'lowpass'); tn(150, 40, .16, .25); },
  rail() { tn(2200, 120, .4, .14, 'sawtooth'); nz(.25, 4200, 2, .2, 'highpass'); },
  boom() { nz(.9, 520, .5, 1, 'lowpass'); tn(95, 25, .6, .4, 'sine'); },
  thunk() { tn(170, 80, .09, .25, 'triangle'); nz(.07, 700, 1, .2); },
  hit() { nz(.04, 600, 1.2, .25); },
  splat() { nz(.14, 380, .9, .4); tn(120, 60, .1, .1, 'triangle'); },
  pickup() { tn(520, 1040, .1, .12); tn(780, 1560, .12, .09, 'square', .08); },
  hurt() { tn(260, 80, .2, .2, 'sawtooth'); },
  unlock() { [1, 1.25, 1.5, 2].forEach((m, k) => tn(440 * m, 440 * m, .12, .1, 'square', k * .09)); },
  click() { tn(1100, 800, .03, .06); },
  launch() { nz(.35, 1300, .7, .3); tn(300, 120, .3, .06, 'sawtooth'); },
  fire() { nz(.25, 800, .6, .2, 'lowpass'); tn(320, 120, .2, .05, 'sawtooth'); },
  groan() { tn(100 + Math.random() * 40, 60, .7, .05, 'sawtooth'); },
  wave() { tn(520, 880, .32, .07, 'square'); tn(880, 520, .32, .07, 'square', .32); nz(.18, 120, 1, .25, 'lowpass'); },
  ding() { tn(1320, 1320, .22, .07, 'sine'); tn(1760, 1760, .35, .055, 'sine', .11); },
  crumble() { nz(.3, 300, .8, .5, 'lowpass'); },
  toss() { nz(.12, 1600, .8, .12); },
  clang() { tn(1400, 900, .12, .08, 'square'); nz(.08, 3500, 2, .12, 'highpass'); },
  shieldbreak() { nz(.4, 2500, .8, .35); tn(900, 200, .3, .1, 'square'); },
  gurgle() { tn(140, 260, .5, .07, 'sawtooth'); nz(.5, 500, 4, .08); },
  spit() { nz(.12, 1800, 1.5, .2); tn(300, 90, .1, .08, 'triangle'); },
  splash() { nz(.25, 900, .8, .2); tn(200, 60, .2, .05, 'sine'); },
  fall() { tn(760, 110, .65, .06, 'triangle'); nz(.25, 160, 1, .12, 'lowpass', .6); },
  shock() { nz(.35, 180, .7, .5, 'lowpass'); tn(160, 50, .3, .2, 'sine'); },
  roll() { nz(.3, 700, .7, .3); tn(260, 90, .25, .04, 'triangle'); },
  land() { nz(.12, 260, 1, .35, 'lowpass'); tn(120, 55, .1, .12, 'triangle'); },
  screech() { tn(900, 380, .45, .07, 'sawtooth'); tn(1250, 520, .4, .05, 'sawtooth', .06); nz(.3, 2400, 3, .08); },
  fuse() { nz(.7, 3200, 1, .2, 'highpass'); tn(420, 1500, .7, .05, 'square'); },
  gloop() { tn(70 + Math.random() * 30, 40, .9, .07, 'sawtooth'); nz(.3, 250, 2, .08); },
};
$('muteBtn').addEventListener('click', () => { muted = !muted; $('muteBtn').textContent = 'Son : ' + (muted ? 'coupé' : 'activé'); });
