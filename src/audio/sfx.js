// Sons synthétisés à la volée (Web Audio), démarrés au premier geste du joueur.
import { tr } from '../i18n/index.js';

let AC = null, master = null, nbuf = null, muted = false, silent = false;
// Démo de l'écran titre : aucun son, sans toucher au réglage du joueur.
export function silence(v) { silent = v; }
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
  if (!AC || muted || silent) return;
  const t = AC.currentTime + delay, s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = nbuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  s.connect(fl).connect(g).connect(master); s.start(t, Math.random() * .4); s.stop(t + dur + .05);
}
function tn(f0, f1, dur, vol, type = 'square', delay = 0) {
  if (!AC || muted || silent) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + .05);
}
export function sfx(name, gap = 0) {
  if (!AC || muted || silent) return;
  const now = performance.now();
  if (gap && now - (lastSfx[name] || 0) < gap) return;
  lastSfx[name] = now;
  SFX[name]();
}
// Hauteur tirée à ±6 % à chaque tir, pour casser la répétition
const vary = () => .94 + Math.random() * .12;
// À l'Uzi, la hauteur monte pendant une rafale et retombe dès qu'on relâche
let uziHeat = 0, uziLast = 0;
// Les tirs ont trois couches : claquement (aigu), corps (grave, le poids), mécanique (culasse, pompe, écho)
const SFX = {
  pistol() { const p = vary(); nz(.09, 2200 * p, .8, .4); tn(230 * p, 70, .07, .12); tn(120 * p, 40, .1, .3, 'sine'); nz(.03, 1500 * p, 3, .07, 'bandpass', .12); },
  uzi() {
    const now = performance.now();
    uziHeat = now - uziLast < 150 ? Math.min(1, uziHeat + .04) : 0; uziLast = now;
    const p = vary() * (1 + uziHeat * .2);
    nz(.05, 2700 * p, .9, .26); tn(280 * p, 90, .04, .06); tn(95 * p, 40, .05, .16, 'sine');
  },
  rifle() { const p = vary(); nz(.08, 2000 * p, .8, .36); tn(200 * p, 60, .06, .1); tn(100 * p, 35, .09, .28, 'sine'); nz(.12, 1400 * p, .7, .08, 'bandpass', .07); },
  shotgun() { const p = vary(); nz(.24, 900 * p, .6, .75, 'lowpass'); tn(150 * p, 40, .16, .25); tn(68 * p, 26, .26, .5, 'sine'); nz(.05, 1800, 2, .18, 'bandpass', .28); nz(.06, 1100, 2, .22, 'bandpass', .38); },
  rail() { const p = vary(); tn(2200 * p, 120, .4, .14, 'sawtooth'); nz(.25, 4200 * p, 2, .2, 'highpass'); tn(58, 24, .5, .5, 'sine'); nz(.6, 420, .5, .14, 'lowpass', .05); },
  boom() { nz(.9, 520, .5, 1, 'lowpass'); tn(95, 25, .6, .4, 'sine'); },
  thunk() { tn(170, 80, .09, .25, 'triangle'); nz(.07, 700, 1, .2); },
  hit() { nz(.04, 600 * vary(), 1.2, .25); },
  kill() { tn(130 * vary(), 38, .14, .4, 'sine'); nz(.06, 260, 1, .2, 'lowpass'); },
  splat() { nz(.14, 380, .9, .4); tn(120, 60, .1, .1, 'triangle'); },
  pickup() { tn(520, 1040, .1, .12); tn(780, 1560, .12, .09, 'square', .08); },
  hurt() { tn(260, 80, .2, .2, 'sawtooth'); },
  unlock() { [1, 1.25, 1.5, 2].forEach((m, k) => tn(440 * m, 440 * m, .12, .1, 'square', k * .09)); },
  click() { tn(1100, 800, .03, .06); },
  launch() { const p = vary(); nz(.35, 1300 * p, .7, .3); tn(300 * p, 120, .3, .06, 'sawtooth'); tn(80 * p, 30, .3, .35, 'sine'); },
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
// Libellé des boutons Son, dans la langue courante.
export function showMute() { for (const o of document.querySelectorAll('.optMute')) o.textContent = tr.optMute(muted); }
for (const b of document.querySelectorAll('.optMute')) b.addEventListener('click', () => { muted = !muted; showMute(); });
