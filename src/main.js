import {
  T, MW, MH, ZOOM_MIN, ZOOM_MAX, W, SOIF_MULTIPLIER,
  RAR, MODS, PLAYER_HP, PLAYER_SPEED, FRENZY_SPEED_MUL, ACID_SPEED_MUL, REGEN_DELAY, REGEN_RATE, LOW_HP, MEDKIT_HP, ROLL,
  WALL_HP, TURRET_WALL_HP, BARREL_HP, TURRET_EVERY, KILL_POINTS, DROP_CHANCE, BLOATER_RADIUS, BLOATER_DAMAGE, MAX_ENEMIES,
  FIRST_BREAK, WAVE_BREAK, PICK_DELAY, WAVE_BONUS, BOX_FIRST, BOX_PERIOD_MIN, BOX_PERIOD_RAND, MAX_PICKUPS, BOX_HP_CHANCE,
  MAX_PARTS, FIELD_PERIOD, STICK_RADIUS, PAD_MOVE_DEADZONE, PAD_AIM_DEADZONE,
  STORAGE_BEST, STORAGE_FPS, STORAGE_OUTLINE, SHOW_FPS_BY_DEFAULT,
} from './config.js';
import { createRng } from './rules/rng.js';
import * as Mods from './rules/modifiers.js';
import { weaponsToUnlock, ammoOnUnlock } from './rules/unlock.js';
import * as Grid from './rules/map.js';
import * as Field from './rules/pathfield.js';

(() => {
'use strict';
const cv = document.getElementById('cv');
let ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const rnd = (a = 1) => (Math.random() * 2 - 1) * a; // cosmétique uniquement
// Aléatoire qui décide du gameplay : graine tirée à chaque nouvelle partie.
let rng = Math.random;
const jitter = (a = 1) => (rng() * 2 - 1) * a;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const fmt = n => Math.floor(n).toLocaleString('fr-FR');

let dpr = 1, VW = 0, VH = 0, zoom = 1;
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  VW = innerWidth; VH = innerHeight;
  cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr);
  cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
  zoom = clamp(Math.min(VW / (22 * T), VH / (14 * T)), ZOOM_MIN, ZOOM_MAX);
}
addEventListener('resize', resize); resize();


const mod = id => Mods.modLevel(S && S.mods, id);
function frenzy() { return Mods.frenzy(S.mods, S.combo); }
function fireMul() { return Mods.fireMul(S.mods, S.combo); }
function comboTime() { return Mods.comboTime(S.mods); }
function rollMax() { return Mods.rollMax(S.mods); }

/* ---------- Carte ---------- */
const map = new Uint8Array(MW * MH); // 0 sol, 1 mur, 2 caisse
const doors = [];
const doorSet = new Set();
function rect(x, y, w, h, v) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) map[j * MW + i] = v; }
function buildMap() {
  map.fill(0); doors.length = 0; doorSet.clear();
  rect(0, 0, MW, 1, 1); rect(0, MH - 1, MW, 1, 1); rect(0, 0, 1, MH, 1); rect(MW - 1, 0, 1, MH, 1);
  const cx = MW / 2 | 0, cy = MH / 2 | 0;
  for (const [x, y] of [[cx - 1, 0], [cx, 0], [cx - 1, MH - 1], [cx, MH - 1], [0, cy - 1], [0, cy], [MW - 1, cy - 1], [MW - 1, cy]]) {
    map[y * MW + x] = 0; doors.push([x, y]); doorSet.add(y * MW + x);
  }
  rect(6, 5, 5, 1, 1); rect(6, 5, 1, 4, 1);
  rect(MW - 11, 5, 5, 1, 1); rect(MW - 7, 5, 1, 4, 1);
  rect(6, MH - 6, 5, 1, 1); rect(6, MH - 9, 1, 4, 1);
  rect(MW - 11, MH - 6, 5, 1, 1); rect(MW - 7, MH - 9, 1, 4, 1);
  rect(cx - 5, 4, 3, 1, 1); rect(cx + 2, 4, 3, 1, 1);
  rect(cx - 5, MH - 5, 3, 1, 1); rect(cx + 2, MH - 5, 3, 1, 1);
  rect(4, cy - 4, 1, 3, 1); rect(4, cy + 1, 1, 3, 1);
  rect(MW - 5, cy - 4, 1, 3, 1); rect(MW - 5, cy + 1, 1, 3, 1);
  for (const [x, y] of [[15,10],[16,10],[15,11],[28,10],[27,10],[28,11],[15,19],[15,18],[16,19],[28,19],[28,18],[27,19],[11,15],[32,14],[20,10],[23,19]]) map[y * MW + x] = 2;
  // crevasses : le sol s'est effondré au nord et au sud, un pont étroit face à chaque porte
  for (const y of [7, 8, MH - 9, MH - 8]) for (let x = 14; x <= 29; x++) if (x < cx - 1 || x > cx) map[y * MW + x] = 3;
}

/* ---------- Sol (décor + traces persistantes) ---------- */
const floorC = document.createElement('canvas');
floorC.width = MW * T; floorC.height = MH * T;
const fctx = floorC.getContext('2d');
function paintFloor() {
  fctx.fillStyle = '#b3b6af'; fctx.fillRect(0, 0, floorC.width, floorC.height);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if ((x + y) & 1) { fctx.fillStyle = 'rgba(0,0,0,.035)'; fctx.fillRect(x * T, y * T, T, T); }
    fctx.fillStyle = 'rgba(0,0,0,.07)'; fctx.fillRect(x * T, y * T, T, 1); fctx.fillRect(x * T, y * T, 1, T);
  }
  for (let k = 0; k < 3000; k++) {
    fctx.fillStyle = Math.random() < .5 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.08)';
    fctx.fillRect(Math.random() * floorC.width, Math.random() * floorC.height, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  fctx.strokeStyle = 'rgba(40,40,36,.18)'; fctx.lineWidth = 1;
  for (let k = 0; k < 14; k++) {
    let x = Math.random() * floorC.width, y = Math.random() * floorC.height;
    fctx.beginPath(); fctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) { x += rnd(18); y += rnd(18); fctx.lineTo(x, y); }
    fctx.stroke();
  }
  // gravats et fissures au bord des crevasses
  for (let i = 0; i < MW * MH; i++) {
    if (map[i] !== 3) continue;
    const x = (i % MW) * T, y = (i / MW | 0) * T;
    for (let k = 0; k < 7; k++) {
      fctx.fillStyle = Math.random() < .5 ? 'rgba(60,58,52,.55)' : 'rgba(205,204,196,.7)';
      const side = Math.random() < .5 ? -3 - Math.random() * 7 : T + 1 + Math.random() * 7;
      fctx.fillRect(x + Math.random() * T, y + side, 1.5 + Math.random() * 2.5, 1.5 + Math.random() * 1.5);
    }
  }
  // marquage au sol : rectangle pointillé façon entrepôt
  fctx.strokeStyle = 'rgba(214,170,40,.55)'; fctx.lineWidth = 3; fctx.setLineDash([14, 10]);
  fctx.strokeRect(13 * T + 8, 9 * T + 8, 18 * T - 16, 12 * T - 16); fctx.setLineDash([]);
  // bandes de danger devant les portes
  for (const [x, y] of doors) {
    const g = fctx.createRadialGradient(x * T + T / 2, y * T + T / 2, 2, x * T + T / 2, y * T + T / 2, 40);
    g.addColorStop(0, 'rgba(15,16,17,.85)'); g.addColorStop(1, 'rgba(15,16,17,0)');
    fctx.fillStyle = g; fctx.fillRect(x * T - 40, y * T - 40, T + 80, T + 80);
  }
}
function stampBlood(x, y, r, a) {
  fctx.fillStyle = `rgba(${110 + Math.random() * 45 | 0},${10 + Math.random() * 14 | 0},14,${a})`;
  fctx.beginPath(); fctx.ellipse(x, y, r, r * .7, Math.random() * 3, 0, 7); fctx.fill();
}
function stampScorch(x, y, R) {
  const g = fctx.createRadialGradient(x, y, 2, x, y, R);
  g.addColorStop(0, 'rgba(25,22,20,.6)'); g.addColorStop(.6, 'rgba(25,22,20,.25)'); g.addColorStop(1, 'rgba(25,22,20,0)');
  fctx.fillStyle = g; fctx.beginPath(); fctx.arc(x, y, R, 0, 7); fctx.fill();
}

/* ---------- Audio synthétisé ---------- */
let AC = null, master = null, nbuf = null, muted = false;
const lastSfx = {};
function audio() {
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
function sfx(name, gap = 0) {
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

/* ---------- État ---------- */
let state = 'title';
let S, player, enemies, projs, grenades, rockets, parts, tracers, pops, booms, pickups, blocks, pending, bursts, fires, fallers, globs, puddles, unlocked, ammo, cam, shake;
let fieldDirty = true;
let best = 0;
try { best = +localStorage.getItem(STORAGE_BEST) || 0; } catch (e) {}

function newGame() {
  rng = createRng(Math.random() * 4294967296);
  buildMap(); paintFloor();
  S = { score: 0, wave: 0, waveActive: false, breakT: FIRST_BREAK, queue: [], spawnT: 0, combo: 0, comboT: 0, bestCombo: 0, kills: 0, time: 0, boxT: BOX_FIRST, fieldT: 0, overT: 0, mods: {}, wallCount: 0, souffleUsed: false, pickT: 0 };
  player = { x: 22 * T, y: 15 * T + 4, r: 9, hp: PLAYER_HP, fx: 0, fy: 1, cd: 0, weapon: 0, hurtT: 0, flash: 0, walk: 0, moving: false, muzzle: 0, lastHurt: -9, dead: false, roll: null, rollCd: 0, rollReady: 0, maxHp: PLAYER_HP, rollCharges: 1, invuln: 0 };
  enemies = []; projs = []; grenades = []; rockets = []; parts = []; tracers = []; pops = []; booms = []; pickups = []; pending = []; bursts = []; fires = []; fallers = []; globs = []; puddles = [];
  blocks = new Map();
  unlocked = W.map(w => w.unlock === 0);
  ammo = W.map(w => w.unlock === 0 ? Infinity : 0);
  cam = { x: player.x, y: player.y }; shake = 0; fieldDirty = true;
  slotSig = []; hudCache = {}; modsSig = '';
  buildSlots();
}

/* ---------- Collisions & grille ---------- */
function tileAt(tx, ty) { return Grid.tileAt(map, blocks, tx, ty); }
function passable(tx, ty) { return Grid.passable(map, tx, ty); }
function openT(tx, ty) { return Grid.openT(map, blocks, tx, ty); }
// fly : en l'air (roulade au-dessus d'une crevasse, ennemi projeté), le vide ne bloque plus, les murs si
function moveCircle(e, dx, dy, fly) {
  const tile = fly ? shotTile : tileAt;
  const r = e.r;
  // on ne teste que la colonne ou la rangée nouvellement atteinte : un chevauchement déjà
  // présent ne doit jamais « téléporter » l'entité de l'autre côté d'un mur
  if (dx) {
    const before = Math.floor((dx > 0 ? e.x + r : e.x - r) / T);
    e.x += dx;
    const y0 = Math.floor((e.y - r) / T), y1 = Math.floor((e.y + r) / T), tx = Math.floor((dx > 0 ? e.x + r : e.x - r) / T);
    if (tx !== before) for (let ty = y0; ty <= y1; ty++) {
      const s = tile(tx, ty);
      if (s) { e.x = dx > 0 ? tx * T - r - .01 : (tx + 1) * T + r + .01; if (s === 2) e.bump = ty * MW + tx; break; }
    }
  }
  if (dy) {
    const before = Math.floor((dy > 0 ? e.y + r : e.y - r) / T);
    e.y += dy;
    const x0 = Math.floor((e.x - r) / T), x1 = Math.floor((e.x + r) / T), ty = Math.floor((dy > 0 ? e.y + r : e.y - r) / T);
    if (ty !== before) for (let tx = x0; tx <= x1; tx++) {
      const s = tile(tx, ty);
      if (s) { e.y = dy > 0 ? ty * T - r - .01 : (ty + 1) * T + r + .01; if (s === 2) e.bump = ty * MW + tx; break; }
    }
  }
}
// filet de sécurité : une entité dont le centre finit dans un mur est ramenée sur la case libre la plus proche
function unstick(e) {
  const cx = Math.floor(e.x / T), cy = Math.floor(e.y / T);
  let best = null, bd = 1e9;
  for (let r = 1; r <= 3 && !best; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    if (!openT(cx + i, cy + j)) continue;
    const x = (cx + i) * T + T / 2, y = (cy + j) * T + T / 2, d = (x - e.x) ** 2 + (y - e.y) ** 2;
    if (d < bd) { bd = d; best = [x, y]; }
  }
  if (best) { e.x = best[0]; e.y = best[1]; e.vx = e.vy = 0; }
}
// le vide (3) arrête les corps mais laisse passer balles, roquettes et boules de feu
function shotTile(tx, ty) { return Grid.shotTile(map, blocks, tx, ty); }
const isVoid = (x, y) => Grid.isVoid(map, x, y);
function circleTouchesVoid(o, m) { return Grid.circleTouchesVoid(map, o, m); }
function walkLine(ax, ay, bx, by) { return Grid.walkLine(map, ax, ay, bx, by); }
function los(ax, ay, bx, by) { return Grid.los(map, blocks, ax, ay, bx, by); }

/* ---------- Champ de distances (Dijkstra) ---------- */
let dist = new Float32Array(MW * MH);
function computeField() {
  const ptx = clamp(Math.floor(player.x / T), 0, MW - 1), pty = clamp(Math.floor(player.y / T), 0, MH - 1);
  dist = Field.computeField(map, blocks, ptx, pty);
}
function nextStep(e) { return Field.nextStep(map, blocks, dist, e.x, e.y); }

/* ---------- Effets ---------- */
function addPart(p) { if (parts.length < MAX_PARTS) parts.push(p); }
function blood(x, y, n, dx = 0, dy = 0, spd = 90) {
  for (let k = 0; k < n; k++) addPart({ t: 'blood', x, y, z: 14 + Math.random() * 8, vx: dx * spd + rnd(70), vy: dy * spd + rnd(70), vz: 40 + Math.random() * 120, life: 2, size: 1.5 + Math.random() * 2.2, color: '#9c1a16' });
}
function gibs(x, y, n, colors) {
  for (let k = 0; k < n; k++) addPart({ t: 'gib', x, y, z: 16 + Math.random() * 10, vx: rnd(150), vy: rnd(150), vz: 120 + Math.random() * 160, life: 3, size: 3 + Math.random() * 3, color: colors[k % colors.length], bounces: 0 });
}
function sparks(x, y, n, color = '#ffd36a') {
  for (let k = 0; k < n; k++) addPart({ t: 'spark', x, y, z: 14, vx: rnd(160), vy: rnd(160), vz: 60 + Math.random() * 100, life: .25 + Math.random() * .2, size: 1.6, color });
}
function dust(x, y, n, color = 'rgba(180,176,166,') {
  for (let k = 0; k < n; k++) addPart({ t: 'smoke', x: x + rnd(10), y: y + rnd(10), z: 4 + Math.random() * 8, vx: rnd(40), vy: rnd(40), vz: 10 + Math.random() * 20, life: .7, max: .7, size: 5 + Math.random() * 5, color });
}
function pop(x, y, text, color = '#f2c230', big = false) { pops.push({ x, y, text, color, t: 1, big }); }

/* ---------- Bannière ---------- */
const bannerEl = $('banner');
let bannerCount = 0;
// kind : 'start' (début de vague), 'end' (fin de vague), 'info' (le reste) ; count : nombre qui défile dans la ligne du bas
function banner(m, s = '', kind = 'info', count = 0) {
  bannerEl.querySelector('.m').textContent = m;
  const sub = bannerEl.querySelector('.s');
  sub.textContent = s;
  bannerEl.className = kind; void bannerEl.offsetWidth; bannerEl.classList.add('on');
  const id = ++bannerCount;
  if (count) {
    const t0 = performance.now(), dur = 700;
    const step = now => {
      if (id !== bannerCount) return;
      const k = Math.min(1, (now - t0) / dur), v = Math.round(count * (1 - Math.pow(1 - k, 3)));
      sub.textContent = s + fmt(v);
      if (k < 1) requestAnimationFrame(step); else sfx('ding');
    };
    sub.textContent = s + '0'; requestAnimationFrame(step);
  }
}

/* ---------- Score, combo, déblocages ---------- */
function addScore(n) {
  S.score += n;
  for (const i of weaponsToUnlock(S.score, unlocked)) {
    unlocked[i] = true; ammo[i] = ammoOnUnlock(i);
    banner('Nouvelle arme', `${W[i].name} · touche ${i + 1}`);
    sfx('unlock');
    const el = $('slot' + i); if (el) { el.classList.remove('new'); void el.offsetWidth; el.classList.add('new'); }
  }
}
function multiplier() { return Mods.multiplier(S.combo); }

/* ---------- Ennemis ---------- */
function queueCount() { let c = 0; for (const t of S.queue) c += t[0] === 'p' ? +t.slice(1) : 1; return c; }
function spawnEnemy(type, door) {
  if (type[0] === 'p') {
    // la meute se répartit sur les différents côtés de l'arène pour prendre le joueur en tenaille
    const k = +type.slice(1), groups = {};
    for (const d of doors) { const side = d[1] === 0 ? 'n' : d[1] === MH - 1 ? 's' : d[0] === 0 ? 'o' : 'e'; (groups[side] = groups[side] || []).push(d); }
    const sides = Object.values(groups).sort(() => rng() - .5);
    for (let i = 0; i < k; i++) { const g = sides[i % sides.length]; spawnEnemy('r', g[rng() * g.length | 0]); }
    sfx('screech');
    return;
  }
  const [dx, dy] = door || doors[rng() * doors.length | 0];
  const n = S.wave;
  const e = type === 'z'
    ? { type, r: 9, hp: 55 + n * 6, sp: 44 + Math.min(32, n * 2.6) + rng() * 10 }
    : type === 'b'
    ? { type, r: 12, hp: 110 + n * 9, sp: 34 + Math.min(14, n) + rng() * 6 }
    : type === 'a'
    ? { type, r: 11, hp: 200 + n * 14, sp: 34 + Math.min(10, n) + rng() * 4, shield: 320 + n * 22 }
    : type === 's'
    ? { type, r: 9, hp: 70 + n * 6, sp: 46 + Math.min(12, n) + rng() * 6, spitCd: 1.2 + rng() * 1.5, wind: 0 }
    : type === 'r'
    ? { type, r: 8, hp: 24 + n * 1.5, sp: 112 + Math.min(22, n * 1.5) + rng() * 8 }
    : { type, r: 10, hp: 140 + n * 12, sp: 62 + Math.min(22, n * 1.6) + rng() * 6, fire: 1.6 + rng() * 2 };
  Object.assign(e, { x: dx * T + T / 2 + jitter(6), y: dy * T + T / 2 + jitter(6), vx: 0, vy: 0, fx: 0, fy: 1, flash: 0, atk: .6, walk: Math.random() * 6, moving: true, bump: -1, dead: false });
  e.shieldMax = e.shield || 0;
  e.x = clamp(e.x, e.r + 1, MW * T - e.r - 1); e.y = clamp(e.y, e.r + 1, MH * T - e.r - 1);
  enemies.push(e);
}
// kind : 'blast' (explosions, ondes de choc) et 'ap' (railgun) ignorent le bouclier du blindé
// renvoie 'blocked' quand le coup s'écrase sur le bouclier
function hurtEnemy(e, dmg, dx, dy, knock, kind) {
  if (e.dead) return;
  if (e.type === 'a') {
    knock *= kind === 'blast' ? .45 : .2;
    const fl = Math.hypot(e.fx, e.fy) || 1;
    if (e.shield > 0 && kind !== 'blast' && kind !== 'ap' && (dx || dy) && (dx * e.fx + dy * e.fy) / fl < -.45) {
      e.shield -= dmg * .85; e.hp -= dmg * .15; e.shieldFlash = .08;
      e.vx += dx * knock; e.vy += dy * knock;
      sparks(e.x + e.fx / fl * 12, e.y + e.fy / fl * 6, 4, '#dfe8ef'); sfx('clang', 45);
      if (e.shield <= 0) {
        e.shield = 0;
        gibs(e.x + e.fx * 10, e.y + e.fy * 5, 9, ['#8fa3b5', '#5f7385', '#c9d6e0']);
        sfx('shieldbreak'); pop(e.x, e.y - 48, 'Bouclier brisé', '#dfe8ef');
      }
      if (e.hp <= 0) killEnemy(e, dx, dy);
      return 'blocked';
    }
  }
  e.hp -= dmg; e.flash = .08; e.vx += dx * knock; e.vy += dy * knock;
  if (knock >= 150) e.knockT = .3;
  blood(e.x, e.y, 2 + (Math.random() * 3 | 0), dx, dy);
  sfx('hit', 35);
  if (e.hp <= 0) killEnemy(e, dx, dy);
}
// fell : l'ennemi a été projeté dans une crevasse
function killEnemy(e, dx, dy, fell) {
  e.dead = true; S.kills++; S.combo++; S.comboT = comboTime(); S.bestCombo = Math.max(S.bestCombo, S.combo);
  const m = multiplier(), pts = Math.round((e.type === 'z' ? KILL_POINTS.z : e.type === 'b' ? KILL_POINTS.b * Math.pow(2, mod('chair')) : e.type === 'r' ? KILL_POINTS.r : e.type === 's' ? KILL_POINTS.s : e.type === 'a' ? KILL_POINTS.a : KILL_POINTS.d) * m * Math.pow(1.5, mod('prime')));
  if (mod('soif') && m >= SOIF_MULTIPLIER && !player.dead) player.hp = Math.min(player.maxHp, player.hp + mod('soif'));
  addScore(pts);
  pop(e.x, e.y - 40, (fell ? 'Chute ! +' : '+') + fmt(pts), m > 1 || fell ? '#f2c230' : '#ffffff');
  const cEl = $('comboNum'); cEl.classList.add('bump'); setTimeout(() => cEl.classList.remove('bump'), 90);
  if (fell) { fallers.push({ e, t: 0 }); sfx('fall'); return; }
  blood(e.x, e.y, 12, dx, dy, 120);
  gibs(e.x, e.y, 6, e.type === 'z' ? ['#b7c49c', '#7b8a6c', '#7a1512'] : e.type === 'b' ? ['#c9b86a', '#8fd14f', '#7a4a6a'] : e.type === 'r' ? ['#c9c6bb', '#c86a2a', '#7a1512'] : e.type === 's' ? ['#9d8fa6', '#d9d4c6', '#9ed14a'] : e.type === 'a' ? ['#2b3442', '#a9b49a', '#7a1512'] : ['#c4362d', '#4a1210', '#7a1512']);
  if (e.type === 'b') bursts.push({ x: e.x, y: e.y, t: .08 });
  stampBlood(e.x + dx * 6, e.y + dy * 6, 9 + Math.random() * 6, .7);
  sfx('splat', 25);
  const drop = e.type === 'z' ? DROP_CHANCE.z : e.type === 'b' ? DROP_CHANCE.b : e.type === 'r' ? DROP_CHANCE.r : e.type === 's' ? DROP_CHANCE.s : e.type === 'a' ? DROP_CHANCE.a : DROP_CHANCE.d;
  if (rng() < drop && !isVoid(e.x, e.y)) pickups.push({ x: e.x, y: e.y, kind: rng() < .5 ? 'hp' : 'ammo', ph: Math.random() * 6 });
}

/* ---------- Joueur ---------- */
function hurtPlayer(dmg, soft) {
  if (player.dead || state !== 'play') return;
  if (player.roll && player.roll.t >= ROLL.A && player.roll.t < ROLL.B) return;
  if (player.invuln > 0) return;
  player.hp -= dmg; player.hurtT = .35; player.flash = .08; player.lastHurt = S.time;
  if (!soft) { shake = Math.min(16, shake + 4); S.comboT = Math.max(0, S.comboT - .6); }
  blood(player.x, player.y, 4);
  sfx('hurt', 120);
  if (soft) rumble(0, .15, 50); else rumble(.6, .4, 140);
  if (player.hp <= 0 && mod('souffle') && !S.souffleUsed) {
    S.souffleUsed = true; player.hp = Math.round(player.maxHp * .4); player.invuln = 1.6;
    shockwave(player.x, player.y, 110, 80);
    banner('Second souffle', 'Tu te relèves'); sfx('unlock');
    return;
  }
  if (player.hp <= 0) {
    player.hp = 0; player.dead = true; S.overT = 1.6;
    blood(player.x, player.y, 26, 0, 0, 160); gibs(player.x, player.y, 10, ['#2f5d8a', '#e2b48a', '#7a1512']);
    stampBlood(player.x, player.y, 16, .8); sfx('splat');
  }
}

/* ---------- Tirs ---------- */
// pierce : nombre d'ennemis que le tir peut toucher (Infinity pour le railgun) ; bounce : rebonds restants
function shoot(ang, range, dmg, pierce, knock, look, bounce = 0, from = null) {
  const dx = Math.cos(ang), dy = Math.sin(ang), ox = from ? from[0] : player.x, oy = from ? from[1] : player.y;
  let endT = range, hitB = null, wallHit = false, ptx = Math.floor(ox / T), pty = Math.floor(oy / T), htx = 0, hty = 0;
  for (let t = 4; t < range; t += 4) {
    const px = ox + dx * t, py = oy + dy * t, tx = Math.floor(px / T), ty = Math.floor(py / T);
    const s = shotTile(tx, ty);
    if (s) { endT = t; wallHit = true; htx = tx; hty = ty; if (s === 2) hitB = blocks.get(ty * MW + tx); break; }
    ptx = tx; pty = ty;
  }
  const hits = [];
  for (const e of enemies) {
    if (e.dead) continue;
    const ex = e.x - ox, ey = e.y - oy, tp = ex * dx + ey * dy;
    if (tp < -4 || tp > endT) continue;
    const perp = ex * ex + ey * ey - tp * tp, rr = e.r + 3;
    if (perp < rr * rr) hits.push([tp, e]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  if (hits.length >= pierce) { hits.length = pierce; endT = Math.max(0, hits[pierce - 1][0]); hitB = null; wallHit = false; }
  for (let k = 0; k < hits.length; k++) {
    if (hurtEnemy(hits[k][1], dmg, dx, dy, knock, pierce === Infinity ? 'ap' : 'bullet') === 'blocked') {
      endT = Math.max(0, hits[k][0] - 8); hitB = null; wallHit = false; break;
    }
  }
  const ex = ox + dx * endT, ey = oy + dy * endT;
  if (hitB) {
    if (hitB.kind === 'barrel') explodeBarrel(hitB); else { hitB.flash = .06; sparks(ex, ey, 3); }
  } else if (wallHit) sparks(ex, ey, 3, '#e8e2cc');
  const tipL = GUNS[W[player.weapon].id] || 8;
  const gx = from ? ox : player.x + player.fx * (10 + tipL), gy = from ? oy : player.y + player.fy * (5 + tipL * .5);
  tracers.push({ x1: gx, y1: gy, x2: ex, y2: ey, t: look.t, max: look.t, w: look.w, c: look.c });
  if (wallHit && !hitB && bounce > 0 && range - endT > 30) {
    const rdx = htx !== ptx ? -dx : dx, rdy = hty !== pty ? -dy : dy;
    const back = Math.max(0, endT - 4);
    shoot(Math.atan2(rdy, rdx), range - endT, dmg, pierce, knock, look, bounce - 1, [ox + dx * back, oy + dy * back]);
  }
}
function shockwave(x, y, R, dmg) {
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1;
    if (d < R + e.r) hurtEnemy(e, dmg, dx / d, dy / d, 340, 'blast');
  }
  booms.push({ x, y, R, t: 0, max: .38, ring: true });
  dust(x, y, 8); shake = Math.min(16, shake + 4); sfx('shock', 60);
}
function frontTile() {
  return [Math.floor((player.x + player.fx * T * .95) / T), Math.floor((player.y + player.fy * T * .95) / T)];
}
function placeBlock(kind) {
  const [tx, ty] = frontTile();
  if (tx < 1 || ty < 1 || tx >= MW - 1 || ty >= MH - 1) return false;
  const i = ty * MW + tx;
  if (map[i] || blocks.has(i) || doorSet.has(i)) return false;
  const rx = tx * T, ry = ty * T;
  const overl = e => { const cx = clamp(e.x, rx, rx + T), cy = clamp(e.y, ry, ry + T); return (e.x - cx) ** 2 + (e.y - cy) ** 2 < e.r * e.r; };
  if (overl(player) || enemies.some(e => !e.dead && overl(e))) return false;
  const hp = kind === 'wall' ? WALL_HP : BARREL_HP;
  const blk = { kind, i, tx, ty, hp, max: hp, flash: 0, drop: 1 };
  if (kind === 'wall') {
    S.wallCount++;
    if (mod('tourelle') && S.wallCount % TURRET_EVERY === 0) { blk.turret = { cd: .3, ang: Math.atan2(player.fy, player.fx), flash: 0 }; blk.hp = blk.max = TURRET_WALL_HP; }
  }
  blocks.set(i, blk);
  fieldDirty = true;
  dust(rx + T / 2, ry + T / 2, 6); sfx('thunk');
  return true;
}
function damageBlock(b, dmg) {
  if (!blocks.has(b.i)) return;
  b.hp -= dmg; b.flash = .08;
  if (b.hp <= 0) {
    if (b.kind === 'barrel') { explodeBarrel(b); return; }
    blocks.delete(b.i); fieldDirty = true;
    const cx = b.tx * T + T / 2, cy = b.ty * T + T / 2;
    gibs(cx, cy, 8, ['#a9aea9', '#878c87', '#f2c230']); dust(cx, cy, 10); sfx('crumble');
  }
}
function explodeBarrel(b) {
  if (!blocks.has(b.i)) return;
  blocks.delete(b.i); fieldDirty = true;
  explosion(b.tx * T + T / 2, b.ty * T + T / 2, 80 * Math.pow(1.4, mod('grosbaril')), 120);
}
function explosion(x, y, R, dmg) {
  { const pd = Math.hypot(player.x - x, player.y - y); if (pd < 420) rumble(.75 * (1 - pd / 420), .45 * (1 - pd / 420), 220); }
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1;
    if (d < R + e.r) { const f = 1 - Math.max(0, d - e.r) / R * .6; hurtEnemy(e, dmg * f, dx / d, dy / d, 280 * f, 'blast'); }
  }
  const pd = Math.hypot(player.x - x, player.y - y);
  if (pd < R * .9) hurtPlayer(dmg * .26 * (1 - pd / R * .5));
  for (const b of blocks.values()) {
    const bx = b.tx * T + T / 2, by = b.ty * T + T / 2, d = Math.hypot(bx - x, by - y);
    if (d < R + 12 && d > 1) {
      if (b.kind === 'barrel') { if (!b.pend) { b.pend = true; pending.push({ b, t: .13 }); } }
      else damageBlock(b, dmg * .55);
    }
  }
  booms.push({ x, y, R, t: 0, max: .5 });
  for (let k = 0; k < 18; k++) addPart({ t: 'fire', x: x + rnd(R * .3), y: y + rnd(R * .3), z: 6 + Math.random() * 14, vx: rnd(120), vy: rnd(120), vz: 30 + Math.random() * 80, life: .35 + Math.random() * .3, max: .6, size: 5 + Math.random() * 6 });
  for (let k = 0; k < 14; k++) addPart({ t: 'smoke', x: x + rnd(R * .4), y: y + rnd(R * .4), z: 8 + Math.random() * 10, vx: rnd(50), vy: rnd(50), vz: 20 + Math.random() * 30, life: 1.2, max: 1.2, size: 8 + Math.random() * 8, color: 'rgba(70,66,62,' });
  sparks(x, y, 10);
  stampScorch(x, y, R * .8);
  shake = Math.min(20, shake + 10);
  sfx('boom', 40);
}
function fireWeapon() {
  const wi = player.weapon, w = W[wi];
  if (ammo[wi] <= 0) { sfx('click'); player.weapon = 0; player.cd = .2; return; }
  const ang = Math.atan2(player.fy, player.fx);
  let ok = true;
  switch (w.id) {
    case 'pistol':
      shoot(ang + jitter(.03), 420, 34, 1 + mod('perce'), 70, { t: .07, w: 1.6, c: '255,236,170' }, mod('ricochet'));
      player.muzzle = .05; shake = Math.min(16, shake + .8); sfx('pistol'); casing(); rumble(0, .14, 35); break;
    case 'uzi':
      shoot(ang + jitter(.09), 380, 20, 1 + mod('perce'), 34, { t: .05, w: 1.3, c: '255,226,150' }, mod('ricochet'));
      player.muzzle = .04; shake = Math.min(16, shake + .5); sfx('uzi'); casing(); rumble(0, .12, 30); break;
    case 'shotgun':
      for (let k = 0; k < 8; k++) shoot(ang + jitter(.3), 220 + rng() * 30, 24, 1, 95 * (1 + mod('calibre')), { t: .08, w: 1.2, c: '255,214,140' }, mod('ricochet'));
      player.muzzle = .08; shake = Math.min(16, shake + 5); sfx('shotgun'); rumble(.35, .25, 90);
      moveCircle(player, -player.fx * 4, -player.fy * 4); break;
    case 'wall': ok = placeBlock('wall'); if (!ok) sfx('click'); break;
    case 'barrel': ok = placeBlock('barrel'); if (!ok) sfx('click'); break;
    case 'grenade':
      grenades.push({ x: player.x + player.fx * 10, y: player.y + player.fy * 10, z: 18, vx: player.fx * 250, vy: player.fy * 250, vz: 170, t: 1.15 });
      sfx('toss'); break;
    case 'rocket':
      rockets.push({ x: player.x + player.fx * 16, y: player.y + player.fy * 16, vx: player.fx * 540, vy: player.fy * 540, life: 1.4 });
      player.muzzle = .06; shake = Math.min(16, shake + 3); sfx('launch'); rumble(.25, .2, 90); break;
    case 'rail':
      shoot(ang, 760, 260, Infinity, 140, { t: .35, w: 4, c: '120,230,255' });
      player.muzzle = .1; shake = Math.min(16, shake + 7); sfx('rail'); rumble(.45, .35, 120); break;
  }
  if (ok && ammo[wi] !== Infinity) ammo[wi]--;
  player.cd = ok ? w.cd * fireMul() : .15;
}
function casing() {
  addPart({ t: 'casing', x: player.x, y: player.y, z: 16, vx: -player.fy * 60 + rnd(20), vy: player.fx * 60 + rnd(20), vz: 70 + Math.random() * 40, life: .9, max: .9, size: 2, color: '#d6a73c', bounces: 0 });
}
function selectWeapon(i) {
  if (i < 0 || i >= W.length || !unlocked[i] || ammo[i] <= 0 || player.weapon === i) return;
  player.weapon = i; sfx('click');
}
function cycleWeapon(dir) {
  for (let k = 1; k <= W.length; k++) {
    const i = (player.weapon + dir * k + W.length * 2) % W.length;
    if (unlocked[i] && ammo[i] > 0) { player.weapon = i; sfx('click'); return; }
  }
}

/* ---------- Vagues ---------- */
function startWave() {
  S.wave++; const n = S.wave;
  const z = 8 + n * 5, d = n >= 3 ? Math.floor((n - 1) * 1.4) : 0, bl = n >= 2 ? Math.floor(n * .7) : 0, pk = n >= 4 ? Math.floor((n - 2) * .6) : 0, sc = n >= 5 ? Math.floor((n - 3) * .7) : 0, ar = n >= 6 ? Math.floor((n - 4) * .5) : 0;
  const q = [];
  for (let i = 0; i < z; i++) q.push(['z', rng()]);
  for (let i = 0; i < d; i++) q.push(['d', rng() * .7]);
  for (let i = 0; i < bl; i++) q.push(['b', .2 + rng() * .8]);
  for (let i = 0; i < sc; i++) q.push(['s', .1 + rng() * .8]);
  for (let i = 0; i < ar; i++) q.push(['a', .3 + rng() * .7]);
  for (let i = 0; i < pk; i++) q.push(['p' + (3 + (rng() * 3 | 0) + Math.min(3, n / 4 | 0) + 2 * mod('prime')), .1 + rng() * .9]);
  q.sort((a, b) => a[1] - b[1]);
  S.queue = q.map(a => a[0]);
  S.waveActive = true; S.spawnT = .4;
  shake = Math.min(16, shake + 6);
  banner(`Vague ${n}`, n === 2 ? 'Les Gonflés arrivent : ils explosent' : n === 3 ? 'Les diables arrivent' : n === 4 ? 'Des coureurs arrivent en meute' : n === 5 ? 'Des cracheurs arrivent : sors de l\'acide' : n === 6 ? 'Des blindés arrivent : prends-les à revers' : `${queueCount()} ennemis`, 'start');
  sfx('wave');
}

/* ---------- Entrées ---------- */
const keys = {};
let mouseFire = false;
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const aim = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
addEventListener('keydown', e => {
  if (PREVENT.has(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (state === 'title' && (e.code === 'Enter' || e.code === 'Space')) { startGame(); return; }
  if (state === 'over' && e.code === 'Enter') { startGame(); return; }
  if (state === 'pick') { const m = /^(Digit|Numpad)([1-3])$/.exec(e.code); if (m) choosePick(+m[2] - 1); return; }
  if (e.code === 'KeyP' || e.code === 'Escape') { if (state === 'play') pause(); else if (state === 'pause') resume(); return; }
  if (e.code === 'KeyF') { setFps(!fpsOn); return; }
  if (state !== 'play') return;
  if (e.ctrlKey) e.preventDefault();
  if ((e.code === 'Space' || e.code === 'ControlLeft' || e.code === 'ControlRight') && !e.repeat) tryRoll();
  if (e.code === 'Enter' && !S.waveActive && S.wave > 0) S.breakT = 0;
  if (/^Digit[1-8]$/.test(e.code)) selectWeapon(+e.code.slice(5) - 1);
  if (/^Numpad[1-8]$/.test(e.code)) selectWeapon(+e.code.slice(6) - 1);
  if (e.code === 'KeyE') cycleWeapon(1);
  if (e.code === 'KeyQ') cycleWeapon(-1);
});
addEventListener('keyup', e => { keys[e.code] = false; });
let wheelT = 0;
addEventListener('wheel', e => {
  if (state !== 'play') return;
  const now = performance.now(); if (now - wheelT < 90) return; wheelT = now;
  cycleWeapon(e.deltaY > 0 ? 1 : -1);
}, { passive: true });
cv.addEventListener('mousedown', e => { if (e.button === 0) mouseFire = true; });
addEventListener('mouseup', () => { mouseFire = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseFire = false; if (state === 'play') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') pause(); });

// tactile
const root = document.documentElement;
if (matchMedia('(pointer: coarse)').matches) root.classList.add('is-touch');
addEventListener('touchstart', () => root.classList.add('is-touch'), { passive: true, once: true });
function bindStick(zoneId, baseId, knobId, st) {
  const zone = $(zoneId), base = $(baseId), knob = $(knobId);
  zone.addEventListener('pointerdown', e => {
    e.preventDefault(); audio();
    if (st.id !== null) return;
    st.id = e.pointerId; st.ox = e.clientX; st.oy = e.clientY; st.x = st.y = 0;
    try { zone.setPointerCapture(e.pointerId); } catch (_) {}
    base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px'; base.style.opacity = 1; knob.style.transform = '';
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== st.id) return;
    let dx = e.clientX - st.ox, dy = e.clientY - st.oy; const l = Math.hypot(dx, dy), M = STICK_RADIUS;
    if (l > M) { dx *= M / l; dy *= M / l; }
    st.x = dx / M; st.y = dy / M;
    knob.style.transform = `translate(${dx}px,${dy}px)`;
  });
  const end = e => { if (e.pointerId !== st.id) return; st.id = null; st.x = st.y = 0; base.style.opacity = 0; };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
}
bindStick('stickZone', 'stickBase', 'stickKnob', stick);
bindStick('aimZone', 'aimBase', 'aimKnob', aim);
$('swapBtn').addEventListener('pointerdown', e => { e.preventDefault(); if (state === 'play') cycleWeapon(1); });
$('rollBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); tryRoll(); });

/* ---------- Écrans ---------- */
function showBest() {
  const t = best ? `Record : ${fmt(best)} points` : '';
  $('bestTitle').textContent = t; $('bestOver').textContent = t;
}
function startGame() {
  audio(); newGame(); state = 'play';
  $('titleScreen').hidden = true; $('overScreen').hidden = true; $('pauseScreen').hidden = true; $('hud').hidden = false;
}
function pause() { state = 'pause'; $('pauseScreen').hidden = false; }
function resume() { audio(); state = 'play'; $('pauseScreen').hidden = true; }
function gameOver() {
  state = 'over';
  if (S.score > best) { best = S.score; try { localStorage.setItem(STORAGE_BEST, String(best)); } catch (e) {} }
  $('ovScore').textContent = fmt(S.score); $('ovWave').textContent = S.wave; $('ovCombo').textContent = S.bestCombo;
  $('overLine').textContent = `Tombé pendant la vague ${S.wave}, après ${S.kills} éliminations.`;
  showBest(); $('overScreen').hidden = false;
}
$('playBtn').addEventListener('click', startGame);
$('againBtn').addEventListener('click', startGame);
$('resumeBtn').addEventListener('click', resume);
$('restartBtn').addEventListener('click', startGame);
$('pauseBtn').addEventListener('click', () => { if (state === 'play') pause(); });
$('muteBtn').addEventListener('click', () => { muted = !muted; $('muteBtn').textContent = 'Son : ' + (muted ? 'coupé' : 'activé'); });

/* ---------- HUD ---------- */
let hudCache = {}, slotSig = [];
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function setStyle(id, prop, v) { const k = id + prop; if (hudCache[k] !== v) { hudCache[k] = v; $(id).style[prop] = v; } }
function buildSlots() {
  const box = $('weapons'); box.innerHTML = '';
  W.forEach((w, i) => {
    const b = document.createElement('button');
    b.className = 'slot'; b.id = 'slot' + i; b.setAttribute('aria-label', w.name);
    b.innerHTML = `<span class="k">${i + 1}</span><span class="n">${w.short}</span><span class="a"></span>`;
    b.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); selectWeapon(i); });
    box.appendChild(b);
  });
}
let modsSig = '';
function renderMods() {
  const act = MODS.filter(m => mod(m.id));
  const sig = act.map(m => m.id + mod(m.id)).join(',') + (S.souffleUsed ? 'u' : '');
  if (sig === modsSig) return;
  modsSig = sig;
  const html = act.map(m => `<span class="mchip r-${m.rar}">${m.short}${m.max > 1 ? ` <b>${mod(m.id)}</b>` : ''}${m.id === 'souffle' && S.souffleUsed ? ' <i>utilisé</i>' : ''}</span>`).join('');
  $('mods').innerHTML = html;
  $('pauseMods').innerHTML = html || `<span class="none">Aucune carte pour l'instant</span>`;
}
let pickChoices = [];
function rollCards() {
  const pool = MODS.filter(m => mod(m.id) < m.max), out = [];
  while (out.length < 3 && pool.length) {
    const tot = pool.reduce((a, m) => a + RAR[m.rar].w, 0);
    let x = rng() * tot, k = 0;
    for (; k < pool.length - 1; k++) { x -= RAR[pool[k].rar].w; if (x <= 0) break; }
    out.push(pool.splice(k, 1)[0]);
  }
  return out;
}
function openPick() {
  pickChoices = rollCards();
  if (!pickChoices.length) return;
  state = 'pick'; mouseFire = false;
  $('pickWave').textContent = `Vague ${S.wave} terminée`;
  const box = $('cards'); box.innerHTML = '';
  pickChoices.forEach((m, i) => {
    const n = mod(m.id) + 1, b = document.createElement('button');
    b.className = 'mcard r-' + m.rar; b.style.animationDelay = (i * 80) + 'ms';
    const body = m.rar === 'p'
      ? `<span class="plus">+ ${m.plus(n)}</span><span class="minus">− ${m.minus(n)}</span>`
      : `<span class="mdesc">${m.desc(n)}</span>`;
    b.innerHTML = `<span class="mtop"><span class="rar">${RAR[m.rar].name}</span><span class="mkey only-desk">${i + 1}</span></span><span class="mname">${m.name}</span>${body}<span class="mlvl">${m.max > 1 ? `Niveau ${n} sur ${m.max}` : 'Unique'}</span>`;
    b.addEventListener('click', () => choosePick(i));
    b.addEventListener('pointerenter', () => { pickFocus = i; });
    box.appendChild(b);
  });
  $('pickScreen').hidden = false;
  pickFocus = 0; if (pad.on) focusCard(0);
  sfx('pickup');
}
function choosePick(i) {
  const m = pickChoices[i];
  if (!m || state !== 'pick') return;
  S.mods[m.id] = mod(m.id) + 1;
  if (m.id === 'constitution') { player.maxHp += 25; player.hp = Math.min(player.maxHp, player.hp + 25); }
  if (m.id === 'double') player.rollCharges = Math.min(rollMax(), player.rollCharges + 1);
  $('pickScreen').hidden = true; state = 'play'; sfx('unlock');
  banner(m.name, m.rar === 'p' ? 'Pacte scellé' : mod(m.id) > 1 ? `Niveau ${mod(m.id)}` : 'Carte obtenue');
}
function updateHud() {
  setStyle('hpFill', 'width', (Math.max(0, player.hp) / player.maxHp * 100).toFixed(1) + '%');
  renderMods();
  const fz = frenzy();
  if (hudCache.fz !== fz) { hudCache.fz = fz; document.querySelector('.combo').classList.toggle('frenzy', fz); }
  const low = player.hp < LOW_HP ? 'low' : '';
  if (hudCache.low !== low) { hudCache.low = low; $('hpBar').classList.toggle('low', !!low); }
  setText('score', fmt(S.score));
  const rc = player.rollCharges <= 0 || !!player.roll;
  if (hudCache.rc !== rc) { hudCache.rc = rc; $('rollBtn').classList.toggle('cd', rc); }
  const nx = W.findIndex((w, i) => !unlocked[i]);
  const nextHtml = nx >= 0 ? `Prochaine : <b>${W[nx].name}</b> à ${fmt(W[nx].unlock)}` : 'Arsenal complet';
  if (hudCache.next !== nextHtml) { hudCache.next = nextHtml; $('next').innerHTML = nextHtml; }
  setText('waveNum', String(Math.max(1, S.wave)));
  const remaining = queueCount() + enemies.length;
  setText('left', S.waveActive ? `${remaining} restant${remaining > 1 ? 's' : ''}` : `Prochaine dans ${Math.ceil(Math.max(0, S.breakT))} s`);
  setText('comboNum', '×' + multiplier());
  setText('comboKills', S.combo + (S.combo > 1 ? ' kills' : ' kill'));
  setStyle('comboFill', 'width', (S.combo ? S.comboT / comboTime() * 100 : 0).toFixed(1) + '%');
  W.forEach((w, i) => {
    const sig = (unlocked[i] ? 'u' : 'l') + (player.weapon === i ? 's' : '') + ammo[i];
    if (slotSig[i] === sig) return; slotSig[i] = sig;
    const b = $('slot' + i);
    b.classList.toggle('locked', !unlocked[i]);
    b.classList.toggle('sel', player.weapon === i);
    b.classList.toggle('empty', unlocked[i] && ammo[i] <= 0);
    b.querySelector('.a').textContent = !unlocked[i] ? fmt(w.unlock) : ammo[i] === Infinity ? '∞' : ammo[i];
  });
}

/* ---------- Mise à jour ---------- */
function update(dt) {
  S.time += dt;
  const playing = state === 'play';

  // flaques d'acide
  player.inAcid = false;
  for (const p of puddles) { p.t -= dt; if (!player.dead && Math.hypot(player.x - p.x, (player.y - p.y) * 1.6) < p.r) player.inAcid = true; }
  puddles = puddles.filter(p => p.t > 0);
  if (player.inAcid && !player.roll && playing) {
    player.acidT = (player.acidT || 0) - dt;
    if (player.acidT <= 0) { player.acidT = .45; hurtPlayer(4, true); }
    if (Math.random() < dt * 12) addPart({ t: 'smoke', x: player.x + rnd(8), y: player.y + rnd(3), z: 2, vx: rnd(10), vy: rnd(6), vz: 18, life: .5, max: .5, size: 3, color: 'rgba(182,224,74,' });
  } else player.acidT = Math.min(player.acidT || 0, .12);
  updateGlobs(dt);

  // joueur
  if (player.rollCd > 0) { player.rollCd -= dt; if (player.rollCd <= 0) { player.rollCharges = Math.min(rollMax(), player.rollCharges + 1); player.rollReady = .3; if (player.rollCharges < rollMax()) player.rollCd = ROLL.CD; } }
  player.rollReady -= dt;
  if (playing && !player.dead && player.roll) updateRoll(dt);
  else if (playing && !player.dead) {
    let [mx, my] = moveInput();
    let ax = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
    let ay = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);
    if (aim.id !== null && Math.hypot(aim.x, aim.y) > .3) { ax = aim.x; ay = aim.y; }
    if (pad.on && (pad.ax || pad.ay)) { ax = pad.ax; ay = pad.ay; }
    const al = Math.hypot(ax, ay), aiming = al > .3;
    if (aiming) { player.fx = ax / al; player.fy = ay / al; }
    let l = Math.hypot(mx, my);
    player.moving = l > .2;
    player.strafe = aiming || !!(keys.ShiftLeft || keys.ShiftRight);
    if (player.moving) {
      if (!player.strafe) {
        const a = Math.round(Math.atan2(my, mx) / (Math.PI / 4)) * (Math.PI / 4);
        player.fx = Math.round(Math.cos(a) * 1000) / 1000; player.fy = Math.round(Math.sin(a) * 1000) / 1000;
      }
      if (l > 1) { mx /= l; my /= l; l = 1; }
      const v = PLAYER_SPEED * (frenzy() ? FRENZY_SPEED_MUL : 1) * (player.inAcid ? ACID_SPEED_MUL : 1);
      moveCircle(player, mx * v * dt, 0); moveCircle(player, 0, my * v * dt);
      player.walk += dt * 14;
    }
    player.cd -= dt;
    if ((aiming || mouseFire || pad.fire) && player.cd <= 0) fireWeapon();
    if (!mod('sansarmure') && S.time - player.lastHurt > REGEN_DELAY && player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + REGEN_RATE * dt);
  }
  player.flash -= dt; player.hurtT -= dt; player.muzzle -= dt; player.invuln -= dt;
  if (playing && !player.dead && frenzy() && Math.random() < dt * 14) addPart({ t: 'spark', x: player.x + rnd(10), y: player.y + rnd(4), z: 8 + Math.random() * 22, vx: rnd(20), vy: rnd(20), vz: 50, life: .35, size: 1.8, color: '#f2c230' });
  if (player.dead && playing) { S.overT -= dt; if (S.overT <= 0) gameOver(); }

  if (playing) {
    // vagues
    if (!S.waveActive) {
      if (S.pickT > 0) { S.pickT -= dt; if (S.pickT <= 0) openPick(); }
      else { S.breakT -= dt; if (S.breakT <= 0) startWave(); }
    }
    else {
      S.spawnT -= dt;
      if (S.queue.length && S.spawnT <= 0 && enemies.length < MAX_ENEMIES) {
        const burst = S.wave > 6 ? 2 : 1;
        for (let k = 0; k < burst && S.queue.length; k++) spawnEnemy(S.queue.pop());
        S.spawnT = Math.max(.16, .85 - S.wave * .05);
      }
      if (!S.queue.length && enemies.length === 0) {
        S.waveActive = false; S.breakT = WAVE_BREAK; S.pickT = PICK_DELAY;
        const bonus = WAVE_BONUS * S.wave; addScore(bonus);
        banner('Vague terminée', 'Bonus +', 'end', bonus);
      }
    }
    // combo
    if (S.combo) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
    // caisses de ravitaillement
    S.boxT -= dt;
    if (S.boxT <= 0) {
      S.boxT = BOX_PERIOD_MIN + rng() * BOX_PERIOD_RAND;
      if (pickups.length < MAX_PICKUPS) {
        for (let tries = 0; tries < 40; tries++) {
          const tx = 2 + rng() * (MW - 4) | 0, ty = 2 + rng() * (MH - 4) | 0;
          const x = tx * T + T / 2, y = ty * T + T / 2;
          if (!openT(tx, ty) || Math.hypot(x - player.x, y - player.y) < 140 || dist[ty * MW + tx] > 1e8) continue;
          pickups.push({ x, y, kind: rng() < BOX_HP_CHANCE ? 'hp' : 'ammo', ph: Math.random() * 6 });
          break;
        }
      }
    }
    if (Math.random() < dt * .4 && enemies.length) sfx('groan');
  }

  // champ de distances
  S.fieldT -= dt;
  if (fieldDirty || S.fieldT <= 0) { computeField(); fieldDirty = false; S.fieldT = FIELD_PERIOD; }

  // ennemis
  for (const e of enemies) {
    if (e.dead) continue;
    e.flash -= dt; e.atk -= dt; e.bump = -1;
    if (!passable(Math.floor(e.x / T), Math.floor(e.y / T))) unstick(e);
    const dxp = player.x - e.x, dyp = player.y - e.y, dp = Math.hypot(dxp, dyp) || 1;
    let tx = player.x, ty = player.y;
    if (dp > T * 1.3 || player.dead || !walkLine(e.x, e.y, player.x, player.y)) {
      const n = nextStep(e); if (n) { tx = n[0]; ty = n[1]; }
    }
    if (player.dead) { tx = e.x + Math.cos(e.walk) * 20; ty = e.y + Math.sin(e.walk * .7) * 20; }
    // cracheur : garde ses distances quand il voit le joueur, recule s'il est trop près
    let hold = false;
    if (e.type === 's' && !player.dead) {
      e.see = dp < 270 && los(e.x, e.y, player.x, player.y);
      if (e.see && dp < 115) {
        const bx = e.x - dxp / dp * 40, by = e.y - dyp / dp * 40;
        if (walkLine(e.x, e.y, bx, by)) { tx = bx; ty = by; } else hold = true;
      } else if (e.see && dp < 240) hold = true;
      if (e.wind > 0) hold = true;
      if (hold) { const sw = Math.sin(S.time * 1.3 + e.x * .1); tx = e.x - dyp / dp * 20 * sw; ty = e.y + dxp / dp * 20 * sw; }
    }
    let vx = tx - e.x, vy = ty - e.y; const l = Math.hypot(vx, vy) || 1;
    const k = Math.min(1, dt * 6);
    const sp = e.fuse !== undefined ? e.sp * .3 : hold ? (e.wind > 0 ? 0 : e.sp * .35) : e.sp;
    e.vx += (vx / l * sp - e.vx) * k; e.vy += (vy / l * sp - e.vy) * k;
    const fxT = hold ? dxp / dp : vx / l, fyT = hold ? dyp / dp : vy / l;
    const turn = Math.min(1, dt * (e.type === 'a' ? 2.4 : 8));
    e.fx += (fxT - e.fx) * turn; e.fy += (fyT - e.fy) * turn;
    const flung = e.knockT > 0; e.knockT = (e.knockT || 0) - dt;
    moveCircle(e, e.vx * dt, 0, flung); moveCircle(e, 0, e.vy * dt, flung);
    if (flung && isVoid(e.x, e.y)) { killEnemy(e, 0, 0, true); continue; }
    e.walk += dt * (e.type === 'd' ? 11 : e.type === 'b' ? 6 : e.type === 'r' ? 17 : e.type === 's' ? 7 : e.type === 'a' ? 7 : 8);
    e.shieldFlash -= dt;
    if (e.type === 'r' && Math.random() < dt * 6) dust(e.x - e.fx * 6, e.y - e.fy * 6, 1);
    if (e.type === 's' && playing && !player.dead) {
      e.spitCd -= dt;
      if (e.wind > 0) { e.wind -= dt; if (e.wind <= 0) spit(e); }
      else if (e.spitCd <= 0 && e.see && dp > 70) { e.wind = .6; sfx('gurgle', 150); }
    }
    if (e.type === 'b') {
      if (e.fuse === undefined && !player.dead && playing && dp < e.r + player.r + 14 && walkLine(e.x, e.y, player.x, player.y)) { e.fuse = .7; sfx('fuse'); }
      if (e.fuse !== undefined) {
        e.fuse -= dt;
        if (e.fuse <= 0) { e.dead = true; gibs(e.x, e.y, 8, ['#c9b86a', '#8fd14f', '#7a4a6a']); bursts.push({ x: e.x, y: e.y, t: 0 }); continue; }
      }
      if (playing && Math.random() < dt * .15) sfx('gloop', 400);
    } else if (!player.dead && dp < e.r + player.r + 6 && e.atk <= 0 && playing) {
      hurtPlayer(e.type === 'z' ? 8 : e.type === 'r' ? 5 : e.type === 's' ? 6 : e.type === 'a' ? 12 : 14); e.atk = e.type === 'r' ? .55 : e.type === 'a' ? 1.1 : .9;
      if (e.type === 'a' && !player.roll) { moveCircle(player, dxp / dp * 12, 0); moveCircle(player, 0, dyp / dp * 12); sfx('clang'); }
      e.vx += dxp / dp * 60; e.vy += dyp / dp * 60;
    }
    if (e.bump >= 0 && e.atk <= 0) {
      const b = blocks.get(e.bump);
      if (b) { damageBlock(b, e.type === 'z' ? 12 : e.type === 'b' ? 16 : e.type === 'r' ? 6 : e.type === 's' ? 10 : e.type === 'a' ? 30 : 22); e.atk = .85; if (b.kind === 'wall' && mod('barbeles')) hurtEnemy(e, 14 * mod('barbeles'), 0, 0, 0); dust(b.tx * T + T / 2, b.ty * T + T / 2, 2); }
    }
    if (e.type === 'd' && playing && !player.dead) {
      e.fire -= dt;
      if (e.fire <= 0) {
        e.fire = 2.1 + rng() * 1.6;
        if (dp < 340 && los(e.x, e.y, player.x, player.y)) {
          const a = Math.atan2(dyp, dxp) + jitter(.06);
          projs.push({ x: e.x + Math.cos(a) * 12, y: e.y + Math.sin(a) * 12, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, life: 3 });
          sfx('fire', 80);
        }
      }
    }
  }
  // séparation
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i]; if (a.dead) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j]; if (b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r - 2, d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > .001) {
        const d = Math.sqrt(d2), o = (rr - d) / d * .5;
        moveCircle(a, -dx * o, -dy * o); moveCircle(b, dx * o, dy * o);
      }
    }
    if (!player.dead) {
      const dx = player.x - a.x, dy = player.y - a.y, rr = a.r + player.r, d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > .001) {
        const d = Math.sqrt(d2), o = (rr - d) / d;
        if (player.roll) moveCircle(a, -dx * o, -dy * o);
        else { moveCircle(a, -dx * o * .7, -dy * o * .7); moveCircle(player, dx * o * .3, dy * o * .3); }
      }
    }
  }
  enemies = enemies.filter(e => !e.dead);
  for (const f of fallers) f.t += dt;
  fallers = fallers.filter(f => f.t < .7);

  // boules de feu
  for (const p of projs) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (Math.random() < .6) addPart({ t: 'fire', x: p.x, y: p.y, z: 14, vx: rnd(20), vy: rnd(20), vz: 20, life: .25, max: .25, size: 4 });
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T), s = shotTile(tx, ty);
    if (s) { if (s === 2) damageBlock(blocks.get(ty * MW + tx), 25); sparks(p.x, p.y, 5, '#ff8a3a'); p.life = 0; continue; }
    if (!player.dead && Math.hypot(p.x - player.x, p.y - player.y) < player.r + 6) { hurtPlayer(15); sparks(p.x, p.y, 6, '#ff8a3a'); p.life = 0; }
  }
  projs = projs.filter(p => p.life > 0);

  // grenades
  for (const g of grenades) {
    g.t -= dt; g.vz -= 700 * dt; g.z += g.vz * dt;
    if (g.z <= 0) { g.z = 0; if (g.vz < -60) { g.vz = -g.vz * .38; g.vx *= .65; g.vy *= .65; } else g.vz = 0; }
    if (g.z === 0) { const f = Math.pow(.15, dt); g.vx *= f; g.vy *= f; }
    const nx = g.x + g.vx * dt; if (shotTile(Math.floor(nx / T), Math.floor(g.y / T))) g.vx *= -.5; else g.x = nx;
    const ny = g.y + g.vy * dt; if (shotTile(Math.floor(g.x / T), Math.floor(ny / T))) g.vy *= -.5; else g.y = ny;
    if (g.z === 0 && isVoid(g.x, g.y)) { g.t = 0; g.fell = true; sfx('toss'); }
    if (g.t <= 0 && !g.fell) explosion(g.x, g.y, 88, 150);
  }
  grenades = grenades.filter(g => g.t > 0);

  // roquettes
  for (const r of rockets) {
    r.life -= dt;
    const nx = r.x + r.vx * dt, ny = r.y + r.vy * dt;
    addPart({ t: 'smoke', x: r.x, y: r.y, z: 14, vx: rnd(15), vy: rnd(15), vz: 8, life: .5, max: .5, size: 4, color: 'rgba(200,196,188,' });
    let hit = shotTile(Math.floor(nx / T), Math.floor(ny / T)) !== 0;
    if (!hit) for (const e of enemies) if (Math.hypot(e.x - nx, e.y - ny) < e.r + 6) { hit = true; break; }
    if (hit || r.life <= 0) {
      const tx = Math.floor(nx / T), ty = Math.floor(ny / T);
      const b = blocks.get(ty * MW + tx); if (b && b.kind === 'barrel') explodeBarrel(b);
      explosion(r.x, r.y, 72, 160); r.life = 0; continue;
    }
    r.x = nx; r.y = ny;
  }
  rockets = rockets.filter(r => r.life > 0);

  // barils en chaîne
  for (const p of pending) { p.t -= dt; if (p.t <= 0) explodeBarrel(p.b); }
  pending = pending.filter(p => p.t > 0);
  for (const b of bursts) { b.t -= dt; if (b.t <= 0) toxicBurst(b.x, b.y); }
  bursts = bursts.filter(b => b.t > 0);
  updateFires(dt);

  // ramassage
  if (!player.dead) for (const p of pickups) {
    if (mod('aimant')) {
      const ax = player.x - p.x, ay = player.y - p.y, d = Math.hypot(ax, ay);
      if (d < 160 * mod('aimant') && d > 1) { const sp = Math.min(d, 300 * dt); p.x += ax / d * sp; p.y += ay / d * sp; }
    }
    if (Math.hypot(p.x - player.x, p.y - player.y) < 20) {
      p.taken = true; sfx('pickup');
      if (p.kind === 'hp') { player.hp = Math.min(player.maxHp, player.hp + MEDKIT_HP); pop(p.x, p.y - 30, `+${MEDKIT_HP} santé`, '#62c46e'); }
      else {
        const pool = W.map((w, i) => i).filter(i => i > 0 && unlocked[i]);
        if (!pool.length) { addScore(150); pop(p.x, p.y - 30, '+150', '#ffffff'); }
        else {
          const picks = pool.sort(() => rng() - .5).slice(0, 2);
          for (const i of picks) ammo[i] += W[i].refill;
          pop(p.x, p.y - 30, picks.map(i => `+${W[i].refill} ${W[i].short}`).join(' · '), '#f2c230');
        }
      }
    }
  }
  pickups = pickups.filter(p => !p.taken);

  // blocs
  for (const b of blocks.values()) { b.flash -= dt; b.drop = Math.max(0, b.drop - dt * 6); if (b.turret && playing) updateTurret(b, dt); }

  // particules
  for (const p of parts) {
    p.life -= dt;
    if (p.t === 'smoke') { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.size += dt * 10; continue; }
    if (p.t === 'fire') { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= .92; p.vy *= .92; continue; }
    p.vz -= 520 * dt; p.z += p.vz * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.z <= 0) {
      p.z = 0;
      if (isVoid(p.x, p.y)) { p.life = 0; continue; }
      if (p.t === 'blood') { stampBlood(p.x, p.y, p.size * 1.3, .55); p.life = 0; }
      else if (p.t === 'gib' || p.t === 'casing') {
        if (p.t === 'gib') stampBlood(p.x, p.y, 2 + Math.random() * 2, .45);
        p.bounces++;
        if (p.bounces > 2 || p.vz > -50) {
          if (p.t === 'gib') { fctx.fillStyle = p.color; fctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * .7); }
          p.life = 0;
        } else { p.vz = -p.vz * .35; p.vx *= .5; p.vy *= .5; }
      } else p.life = 0;
    }
  }
  parts = parts.filter(p => p.life > 0);

  for (const t of tracers) t.t -= dt; tracers = tracers.filter(t => t.t > 0);
  for (const p of pops) { p.t -= dt * .9; p.y -= 26 * dt; } pops = pops.filter(p => p.t > 0);
  for (const b of booms) b.t += dt; booms = booms.filter(b => b.t < b.max);

  // caméra
  const lead = player.dead ? 0 : 34;
  cam.x += (player.x + player.fx * lead - cam.x) * Math.min(1, dt * 6);
  cam.y += (player.y + player.fy * lead - cam.y) * Math.min(1, dt * 6);
  const hw = VW / 2 / zoom, hh = VH / 2 / zoom;
  cam.x = MW * T < hw * 2 ? MW * T / 2 : clamp(cam.x, hw - 20, MW * T - hw + 20);
  cam.y = MH * T < hh * 2 ? MH * T / 2 : clamp(cam.y, hh - 60, MH * T - hh + 20);
  shake *= Math.pow(.004, dt);
}

/* ---------- Rendu ---------- */
const PAL = {
  p: { shirt: '#2f5d8a', top: '#4177ab', pants: '#262a31', skin: '#e2b48a', hairTop: '#4f3322', hair: '#5a3b26', arm: '#2a527a', eye: '#1a1a1a', stain: null },
  z: { shirt: '#7b8a6c', top: '#8f9e7f', pants: '#454a40', skin: '#b7c49c', hairTop: '#9fac86', hair: '#8a976f', arm: '#b7c49c', eye: '#c3271e', stain: '#7a1d17' },
  d: { shirt: '#9e1f1a', top: '#c0302a', pants: '#3e0f0d', skin: '#c4362d', hairTop: '#a52a22', hair: '#a52a22', arm: '#c4362d', eye: '#ffd23a', stain: null },
};
function drawChar(e, kind) {
  const P = PAL[kind], fl = e.flash > 0, c = k => fl ? '#ffffff' : P[k];
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y));
  if (kind === 'd') ctx.scale(1.15, 1.15);
  ctx.fillStyle = 'rgba(20,22,24,.28)'; ctx.beginPath(); ctx.ellipse(0, 1, 11, 4.5, 0, 0, 7); ctx.fill();
  const mv = e.moving !== false, ph = e.walk || 0;
  const bob = mv ? Math.abs(Math.sin(ph)) * 1.4 : 0, st = mv ? Math.sin(ph) * 3 : 0;
  let fx = e.fx, fy = e.fy; const fl2 = Math.hypot(fx, fy) || 1; fx /= fl2; fy /= fl2;
  const back = fy < -.35;
  // jambes
  ctx.fillStyle = c('pants');
  ctx.fillRect(-6, -9 - Math.max(0, st), 5, 9); ctx.fillRect(1, -9 - Math.max(0, -st), 5, 9);
  const arms = () => {
    ctx.lineCap = 'round';
    if (kind === 'p') {
      const sx = fx * 4, sy = -17 - bob, hx = fx * 11, hy = -16 - bob + fy * 5;
      ctx.strokeStyle = c('arm'); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = fl ? '#fff' : '#1c1e21'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(fx * 19, -16 - bob + fy * 9); ctx.stroke();
      if (player.muzzle > 0 && e === player) {
        ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(fx * 22, -16 - bob + fy * 11, 4 + Math.random() * 3, 0, 7); ctx.fill();
      }
    } else {
      const px = -fy * 5, py = fx * 3, sw = Math.sin(ph * .7) * 2;
      ctx.strokeStyle = c('arm'); ctx.lineWidth = 3.5;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(px * s, -18 - bob + py * s); ctx.lineTo(px * s + fx * 13, -18 - bob + py * s + fy * 7 + sw * s); ctx.stroke();
      }
    }
  };
  if (back) arms();
  // torse
  ctx.fillStyle = c('shirt'); ctx.fillRect(-8, -22 - bob, 16, 14);
  ctx.fillStyle = c('top'); ctx.fillRect(-8, -24 - bob, 16, 2);
  if (P.stain && !fl) { ctx.fillStyle = P.stain; ctx.fillRect(-3, -17 - bob, 6, 4); ctx.fillRect(2, -21 - bob, 3, 2); }
  // tête
  ctx.fillStyle = back ? c('hair') : c('skin'); ctx.fillRect(-7, -35 - bob, 14, 12);
  ctx.fillStyle = c('hairTop'); ctx.fillRect(-7, -39 - bob, 14, 4);
  if (kind === 'p' && !back) { ctx.fillStyle = c('hair'); ctx.fillRect(-7, -35 - bob, 14, 3); }
  if (!back) {
    const ex = Math.round(fx * 3);
    ctx.fillStyle = fl ? '#fff' : P.eye;
    if (Math.abs(fx) > .9) ctx.fillRect(ex > 0 ? 2 : -4, -30 - bob, 2, 3);
    else { ctx.fillRect(-4 + ex, -30 - bob, 2, 3); ctx.fillRect(2 + ex, -30 - bob, 2, 3); }
    if (kind === 'z' && !fl) { ctx.fillStyle = '#5b2420'; ctx.fillRect(-2 + ex, -26 - bob, 4, 1); }
  }
  if (kind === 'd') {
    ctx.fillStyle = fl ? '#fff' : '#efe2c4';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 7, -39 - bob); ctx.lineTo(s * 4, -39 - bob); ctx.lineTo(s * 7, -46 - bob); ctx.fill(); }
  }
  if (!back) arms();
  ctx.restore();
}
/* Gonflé : zombie boursouflé qui explose */
function toxicBurst(x, y) {
  explosion(x, y, BLOATER_RADIUS * Math.pow(1.4, mod('chair')), BLOATER_DAMAGE);
  for (let k = 0; k < 18; k++) addPart({ t: 'smoke', x: x + rnd(24), y: y + rnd(24), z: 6 + Math.random() * 12, vx: rnd(60), vy: rnd(60), vz: 14 + Math.random() * 24, life: 1.6, max: 1.6, size: 7 + Math.random() * 8, color: 'rgba(150,200,70,' });
  for (let k = 0; k < 14; k++) addPart({ t: 'blood', x, y, z: 16, vx: rnd(190), vy: rnd(190), vz: 60 + Math.random() * 140, life: 2, size: 2 + Math.random() * 2.5, color: '#8fb03c' });
  for (let k = 0; k < 6; k++) {
    fctx.fillStyle = `rgba(${120 + Math.random() * 30 | 0},${160 + Math.random() * 30 | 0},50,.45)`;
    fctx.beginPath(); fctx.ellipse(x + rnd(26), y + rnd(20), 6 + Math.random() * 10, 4 + Math.random() * 6, Math.random() * 3, 0, 7); fctx.fill();
  }
  sfx('splat');
}
/* Coureur : zombie maigre en survêtement, penché en avant */
/* Cracheur : zombie voûté en blouse d'hôpital, poche à acide sous la gorge */
function spit(e) {
  e.spitCd = 2.8 + rng() * .9;
  const [mx, my] = moveInput(), ml = Math.hypot(mx, my);
  const d = Math.hypot(player.x - e.x, player.y - e.y), fl = clamp(d / 260, .45, .9);
  const lead = ml > .2 && !player.roll ? 140 * fl * (.4 + rng() * .4) / ml : 0;
  const x1 = clamp(player.x + mx * lead, T, (MW - 1) * T), y1 = clamp(player.y + my * lead, T, (MH - 1) * T);
  globs.push({ x0: e.x + e.fx * 6, y0: e.y + e.fy * 3, x1, y1, t: 0, T: fl, H: 36 + d * .15, x: e.x, y: e.y, z: 22 });
  sfx('spit');
}
function updateGlobs(dt) {
  for (const g of globs) {
    g.t += dt;
    const k = Math.min(1, g.t / g.T);
    g.x = g.x0 + (g.x1 - g.x0) * k; g.y = g.y0 + (g.y1 - g.y0) * k; g.z = 22 * (1 - k) + 4 * g.H * k * (1 - k);
    if (Math.random() < dt * 30) addPart({ t: 'spark', x: g.x, y: g.y, z: g.z, vx: rnd(15), vy: rnd(15), vz: 0, life: .5, size: 1.8, color: '#9ed14a' });
    if (k >= 1) { g.done = true; splashAcid(g.x1, g.y1); }
  }
  globs = globs.filter(g => !g.done);
}
function splashAcid(x, y) {
  for (let k = 0; k < 12; k++) addPart({ t: 'spark', x, y, z: 4, vx: rnd(90), vy: rnd(90), vz: 60 + Math.random() * 90, life: .6, size: 2.2, color: '#b6e04a' });
  sfx('splash', 60);
  if (isVoid(x, y) || tileAt(Math.floor(x / T), Math.floor(y / T))) return;
  puddles.push({ x, y, t: 4, max: 4, r: 26 });
  fctx.fillStyle = 'rgba(110,140,40,.16)'; fctx.beginPath(); fctx.ellipse(x, y, 22, 13, 0, 0, 7); fctx.fill();
  if (Math.hypot(player.x - x, (player.y - y) * 1.4) < 24) hurtPlayer(10);
}
function drawAcidGround() {
  for (const p of puddles) {
    const grow = Math.min(1, (p.max - p.t) / .15), fade = Math.min(1, p.t / .8), r = p.r * grow;
    ctx.fillStyle = `rgba(110,160,40,${.5 * fade})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * .6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(182,224,74,${.55 * fade})`; ctx.beginPath(); ctx.ellipse(p.x - 3, p.y - 1, r * .62, r * .36, 0, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(232,250,170,${.6 * fade})`; ctx.beginPath(); ctx.ellipse(p.x - 7, p.y - 3, r * .18, r * .1, 0, 0, 7); ctx.fill();
    ctx.lineWidth = 1;
    for (let j = 0; j < 3; j++) {
      const ph = (S.time * 1.7 + j * .37 + p.x * .01) % 1;
      const bx = p.x + Math.sin(j * 2.1 + p.y) * r * .5, by = p.y + Math.cos(j * 1.3 + p.x) * r * .25;
      ctx.strokeStyle = `rgba(232,250,170,${(1 - ph) * .8 * fade})`;
      ctx.beginPath(); ctx.arc(bx, by, 1 + ph * 3, 0, 7); ctx.stroke();
    }
  }
  for (const g of globs) {
    const k = Math.min(1, g.t / g.T), rr = 24 - 12 * k;
    ctx.strokeStyle = `rgba(182,224,74,${.35 + .5 * k})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(g.x1, g.y1, rr, rr * .55, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(20,22,24,.25)'; ctx.beginPath(); ctx.ellipse(g.x, g.y, 5, 2.2, 0, 0, 7); ctx.fill();
  }
}
function drawGlobs() {
  for (const g of globs) {
    const y = g.y - g.z;
    ctx.fillStyle = '#7fae3a'; ctx.beginPath(); ctx.arc(g.x, y + .8, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#9ed14a'; ctx.beginPath(); ctx.arc(g.x, y, 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#e6f7a8'; ctx.beginPath(); ctx.arc(g.x - 1.5, y - 1.5, 1.6, 0, 7); ctx.fill();
  }
}
/* Blindé : zombie en tenue anti-émeute, casque à visière et bouclier en polycarbonate */
function drawArmored(e) {
  const fl = e.flash > 0, C = c => fl ? '#ffffff' : c;
  const R = (c, x, y, w, h) => { ctx.fillStyle = C(c); ctx.fillRect(x, y, w, h); };
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y)); ctx.scale(1.08, 1.08);
  ctx.fillStyle = 'rgba(20,22,24,.32)'; ctx.beginPath(); ctx.ellipse(0, 1, 13, 5, 0, 0, 7); ctx.fill();
  const ph = e.walk || 0, st = Math.sin(ph) * 2.2, bob = Math.abs(Math.sin(ph)) * .8;
  let fx = e.fx, fy = e.fy; const fn = Math.hypot(fx, fy) || 1; fx /= fn; fy /= fn;
  const back = fy < -.4, front = fy > .4, side = !back && !front, sx = fx >= 0 ? 1 : -1, U = -bob;
  const hasShield = e.shield > 0, wear = e.shieldMax ? 1 - e.shield / e.shieldMax : 0;
  const shield = () => {
    if (!hasShield) return;
    const sf = e.shieldFlash > 0;
    const glass = sf ? 'rgba(255,255,255,.9)' : 'rgba(150,172,192,.62)', rim = '#3a4556';
    let x, y = -32 + U, w, h = 28;
    if (side) { x = sx > 0 ? 7 : -11; w = 4; }
    else { x = -11 + fx * 4; w = 22; }
    ctx.fillStyle = glass; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = fl ? '#fff' : rim; ctx.lineWidth = 1.6; ctx.strokeRect(x - .3, y - .3, w + .6, h + .6);
    if (!side) {
      ctx.fillStyle = 'rgba(20,24,30,.55)'; ctx.fillRect(x, y + 4, w, 3);
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x + 2, y + 1, 2, h - 2);
      ctx.fillStyle = '#d9b23a'; ctx.fillRect(x, y + h - 5, w, 2);
      if (wear > .33) {
        ctx.strokeStyle = 'rgba(30,36,44,.8)'; ctx.lineWidth = 1; ctx.beginPath();
        ctx.moveTo(x + 6, y + 9); ctx.lineTo(x + 10, y + 15); ctx.lineTo(x + 8, y + 21);
        if (wear > .66) { ctx.moveTo(x + 15, y + 8); ctx.lineTo(x + 12, y + 14); ctx.lineTo(x + 17, y + 19); ctx.moveTo(x + 10, y + 15); ctx.lineTo(x + 15, y + 15); }
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + (sx > 0 ? 2.5 : 0), y + 1, 1.5, h - 2);
    }
  };
  if (back) shield();
  for (const [x, lift] of [[-6.5, Math.max(0, st)], [1.5, Math.max(0, -st)]]) {
    R('#232a35', x, -11 - lift, 5, 10);
    R('#14171c', x - .5, -3.5 - lift, 6, 3.5);
  }
  if (side && hasShield) shield();
  R('#2b3442', -8.5, -25 + U, 17, 15);
  R('#1f2530', -7, -23 + U, 14, 10);
  R('#3a4556', -10, -26 + U, 5, 5); R('#3a4556', 5, -26 + U, 5, 5);
  R('#14171c', -8.5, -11.5 + U, 17, 2);
  if (!hasShield || back) {
    ctx.lineCap = 'round'; ctx.strokeStyle = C('#2b3442'); ctx.lineWidth = 4;
    for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s2 * 8, -22 + U); ctx.lineTo(s2 * 9 + fx * 5, -12 + U + fy * 2); ctx.stroke(); }
    ctx.fillStyle = C('#a9b49a'); for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.arc(s2 * 9 + fx * 5, -12 + U + fy * 2, 2.2, 0, 7); ctx.fill(); }
  }
  // casque et visière
  R('#a9b49a', -6, -31 + U, 12, 6);
  R('#1c2028', -7.5, -40 + U, 15, 10);
  R('#2c323c', -7.5, -40 + U, 15, 2.5);
  if (!back) {
    const ex = Math.round(fx * 2.5);
    ctx.fillStyle = 'rgba(110,140,165,.8)'; ctx.fillRect(-6.5 + ex * .5, -34 + U, 13, 4.5);
    R('#c3271e', -4 + ex, -33 + U, 2, 2); R('#c3271e', 2 + ex, -33 + U, 2, 2);
    R('#3a1a14', -2 + ex, -27.5 + U, 4, 1.5);
  } else R('#2c323c', -7.5, -32 + U, 15, 2);
  if (front && hasShield) shield();
  ctx.restore();
}
function drawSpitter(e) {
  const fl = e.flash > 0, C = c => fl ? '#ffffff' : c;
  const R = (c, x, y, w, h) => { ctx.fillStyle = C(c); ctx.fillRect(x, y, w, h); };
  const E = (c, x, y, rx, ry) => { ctx.fillStyle = C(c); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); };
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y));
  ctx.fillStyle = 'rgba(20,22,24,.28)'; ctx.beginPath(); ctx.ellipse(0, 1, 10, 4.2, 0, 0, 7); ctx.fill();
  const ph = e.walk || 0, st = Math.sin(ph) * 2.5, bob = Math.abs(Math.sin(ph));
  let fx = e.fx, fy = e.fy; const fn = Math.hypot(fx, fy) || 1; fx /= fn; fy /= fn;
  const back = fy < -.4, U = -bob;
  const w = e.wind > 0 ? 1 - e.wind / .6 : 0;
  const lean = -w * 3, ox = fx * (2 + lean), oy = fy * (1 + lean * .5);
  const skin = '#9d8fa6', skinD = '#857890';
  R(skin, -5, -9 - Math.max(0, st), 3.5, 9); R(skin, 1.5, -9 - Math.max(0, -st), 3.5, 9);
  R(skinD, -5.5, -2 - Math.max(0, st), 4.5, 2); R(skinD, 1, -2 - Math.max(0, -st), 4.5, 2);
  const arms = () => {
    ctx.lineCap = 'round'; ctx.strokeStyle = C(skin); ctx.lineWidth = 2.6;
    for (const sd of [-1, 1]) {
      const sw = Math.sin(ph + (sd > 0 ? 0 : 3)) * 2;
      ctx.beginPath(); ctx.moveTo(sd * 6 + ox * .5, -21 + U); ctx.lineTo(sd * 7.5 + ox * .5 + fx * sw, -11 + U - w * 3); ctx.stroke();
    }
  };
  if (back) arms();
  R('#d9d4c6', -7 + ox * .4, -23 + U, 14, 13);
  R('#cfc9b9', -8 + ox * .4, -12 + U, 16, 3.5);
  R('#bdb6a5', -7 + ox * .4, -23 + U, 14, 2);
  if (back) { R(skin, -2 + ox * .4, -23 + U, 4, 6); R('#8f897b', -.5 + ox * .4, -17 + U, 1, 7); }
  else { R('#8aa63a', -3 + ox * .4, -18 + U, 3, 2.5); R('#7a1d17', 2 + ox * .4, -15 + U, 2, 3); }
  const hx = ox, hy = -32 + U + oy;
  R(skin, -6 + hx, hy, 12, 10); R(skinD, -6 + hx, hy, 12, 2.5);
  R('#4a4250', -4 + hx, hy - 1.5, 2, 2); R('#4a4250', 1 + hx, hy - 1, 3, 1.5);
  if (!back) {
    const sr = 3.5 + w * 3.5 + Math.sin(S.time * 6 + e.x) * .4;
    E('#7fae3a', hx + fx * 1.5, hy + 11, sr + .8, sr * .8 + .6);
    E(w > 0 ? '#c8f26a' : '#9ed14a', hx + fx * 1.5, hy + 10.5, sr, sr * .8);
    E('#e6f7a8', hx + fx * 1.5 - sr * .35, hy + 9.5, sr * .3, sr * .22);
    const ex = Math.round(fx * 2.5) + hx;
    R('#e6f25a', -4 + ex, hy + 3, 2, 2); R('#e6f25a', 2 + ex, hy + 3, 2, 2);
    R('#2a1a22', -2.5 + ex, hy + 6, 5, 2 + w * 1.5);
    R('#9ed14a', ex + 1, hy + 8 + w, 1.2, 2 + Math.sin(S.time * 4 + e.x));
  } else R('#4a4250', -5 + hx, hy + 2, 10, 2);
  if (!back) arms();
  if (w > 0 && !fl) { ctx.fillStyle = `rgba(182,224,74,${.22 * w})`; ctx.beginPath(); ctx.arc(hx, hy + 9, 10 + w * 5, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawRunner(e) {
  const fl = e.flash > 0, C = c => fl ? '#ffffff' : c;
  const R = (c, x, y, w, h) => { ctx.fillStyle = C(c); ctx.fillRect(x, y, w, h); };
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y));
  ctx.fillStyle = 'rgba(20,22,24,.26)'; ctx.beginPath(); ctx.ellipse(0, 1, 9, 3.8, 0, 0, 7); ctx.fill();
  const ph = e.walk || 0, st = Math.sin(ph) * 4, bob = Math.abs(Math.sin(ph)) * 2;
  let fx = e.fx, fy = e.fy; const fn = Math.hypot(fx, fy) || 1; fx /= fn; fy /= fn;
  const back = fy < -.4, U = -bob, lean = fx * 3, tl = lean * .6, hl = lean * 1.3;
  // jambes, grande foulée
  for (const [x, lift] of [[-5, Math.max(0, st)], [1, Math.max(0, -st)]]) {
    R('#c86a2a', x, -11 - lift, 4, 9);
    R('#f0ead8', x + (x < 0 ? 0 : 3), -11 - lift, 1, 9);
    R('#e2ddd0', x - .5, -2.5 - lift, 5, 2.5);
  }
  const arms = () => {
    ctx.lineCap = 'round'; ctx.strokeStyle = C('#c9c6bb'); ctx.lineWidth = 3;
    for (const s of [-1, 1]) {
      const sw = Math.sin(ph + (s > 0 ? 0 : Math.PI)) * 6;
      const ax = s * 6 + tl, ay = -19 + U;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + fx * sw, ay + 6 + fy * sw * .5); ctx.stroke();
    }
  };
  if (back) arms();
  // torse : veste de survêtement déchirée
  R('#c86a2a', -6 + tl, -22 + U, 12, 12);
  R('#a8561f', -6 + tl, -22 + U, 12, 2.5);
  R('#f0ead8', -6 + tl, -22 + U, 1.5, 12); R('#f0ead8', 4.5 + tl, -22 + U, 1.5, 12);
  if (!back) { R('#c9c6bb', 1 + tl, -15 + U, 3, 2.5); R('#7a1d17', -3 + tl, -18 + U, 3, 2); }
  // tête projetée vers l'avant
  R('#c9c6bb', -6 + hl, -33 + U, 12, 10);
  R('#6f6a60', -6 + hl, -35 + U, 12, 3); R('#c9c6bb', -1 + hl, -35 + U, 3, 1.5);
  if (back) { R('#6f6a60', -6 + hl, -32 + U, 12, 5); }
  else {
    const ex = Math.round(fx * 2.5) + hl;
    R(fl ? '#fff' : '#ff4a2a', -4 + ex, -30 + U, 2, 2); R(fl ? '#fff' : '#ff4a2a', 2 + ex, -30 + U, 2, 2);
    R('#3a1a14', -2 + ex, -27 + U, 4, 3); R('#e2ddd0', -2 + ex, -27 + U, 4, 1);
  }
  if (!back) arms();
  ctx.restore();
}
function drawBloater(e) {
  const fl = e.flash > 0, fuse = e.fuse !== undefined, blink = fuse && ((e.fuse * 14) | 0) % 2 === 0;
  const C = c => fl ? '#ffffff' : c;
  const R = (c, x, y, w, h) => { ctx.fillStyle = C(c); ctx.fillRect(x, y, w, h); };
  const E = (c, x, y, rx, ry) => { ctx.fillStyle = C(c); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); };
  const skin = blink ? '#e0784a' : '#c9b86a', skinDark = blink ? '#b85a34' : '#a99a52';
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y));
  ctx.fillStyle = 'rgba(20,22,24,.3)'; ctx.beginPath(); ctx.ellipse(0, 1, 15, 6, 0, 0, 7); ctx.fill();
  const ph = e.walk || 0, st = Math.sin(ph) * 2.5, bob = Math.abs(Math.sin(ph)) * 1.2;
  const swell = fuse ? (1 - Math.max(0, e.fuse) / .7) * .35 : 0;
  const p = 1 + Math.sin(S.time * 4 + e.x * .1) * .04 + swell + (fuse ? rnd(.03) : 0);
  let fx = e.fx, fy = e.fy; const fn = Math.hypot(fx, fy) || 1; fx /= fn; fy /= fn;
  const back = fy < -.4;
  // jambes courtes
  R('#5a4a3a', -8, -8 - Math.max(0, st), 6, 8); R('#5a4a3a', 2, -8 - Math.max(0, -st), 6, 8);
  R('#463a2d', -8, -2 - Math.max(0, st), 6, 2); R('#463a2d', 2, -2 - Math.max(0, -st), 6, 2);
  // bras ballants
  ctx.lineCap = 'round'; ctx.strokeStyle = C(skinDark); ctx.lineWidth = 4.5;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 11 * p, -25 - bob); ctx.lineTo(s * 14 * p + fx * 4, -13 - bob + fy * 2 + Math.sin(ph + s) * 1.5); ctx.stroke();
  }
  // ventre
  const cy = -20 - bob;
  E(skin, 0, cy, 12.5 * p, 12 * p);
  if (!fl) { ctx.fillStyle = 'rgba(90,70,30,.22)'; ctx.beginPath(); ctx.ellipse(0, cy + 6 * p, 10 * p, 5 * p, 0, 0, 7); ctx.fill(); }
  R('#6b6f4a', -8 * p, cy - 10 * p, 16 * p, 3.5);
  R('#585c3c', -8 * p, cy - 10 * p + 2.5, 5 * p, 3);
  ctx.strokeStyle = C('#7a4a6a'); ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-9 * p, cy + 1 * p); ctx.lineTo(-5 * p, cy + 3 * p); ctx.lineTo(-2 * p, cy + 1 * p);
  ctx.moveTo(8 * p, cy - 4 * p); ctx.lineTo(5 * p, cy); ctx.lineTo(7 * p, cy + 4 * p);
  ctx.stroke();
  for (const [x, y, r] of back ? [[-4, -3, 2.4], [5, 2, 3], [0, 7, 2]] : [[-5, -2, 2.6], [4, 3, 3.2], [6, -6, 2], [-3, 6, 2.2]]) {
    E('#8fd14f', x * p, cy + y * p, r * p, r * p);
    E('#d4f59a', x * p - r * .35, cy + y * p - r * .35, r * .35, r * .35);
  }
  // petite tête
  const hy = cy - 12 * p - 7;
  R('#bfc28a', -5, hy, 10, 9); R('#9fa36e', -5, hy, 10, 2.5);
  if (!back) {
    const ex = Math.round(fx * 2);
    R(fl ? '#fff' : '#c3271e', -3.5 + ex, hy + 3, 2, 2); R(fl ? '#fff' : '#c3271e', 1.5 + ex, hy + 3, 2, 2);
    R('#3a1a14', -2 + ex, hy + 6, 4, 2.2);
    R('#8fd14f', ex, hy + 8, 1.2, 2.5 + Math.sin(S.time * 3 + e.x) * .8);
  }
  ctx.restore();
}

/* ---------- Roulade ---------- */
function moveInput() {
  let mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  let my = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
  if (stick.id !== null && Math.hypot(stick.x, stick.y) > .2) { mx = stick.x; my = stick.y; }
  if (pad.on && (pad.mx || pad.my)) { mx = pad.mx; my = pad.my; }
  return [mx, my];
}
// simule la roulade en ignorant le vide : on ne saute par-dessus que si on retombe sur du sol ferme
function rollClears(dx, dy) {
  const o = { x: player.x, y: player.y, r: player.r }, h = 1 / 120;
  let t = 0, over = false;
  while (t < ROLL.D) {
    t += h;
    const v = t < ROLL.A ? 0 : t < ROLL.B ? ROLL.V * (1 - (t - ROLL.A) / (ROLL.B - ROLL.A) * .55) : 90 * (1 - (t - ROLL.B) / (ROLL.D - ROLL.B));
    if (v > 0) { moveCircle(o, dx * v * h, 0, true); moveCircle(o, 0, dy * v * h, true); }
    if (!over && circleTouchesVoid(o, 0)) over = true;
  }
  return over && !circleTouchesVoid(o, 4);
}
function tryRoll() {
  if (state !== 'play' || player.dead || player.roll || player.rollCharges <= 0) return;
  let [mx, my] = moveInput(), l = Math.hypot(mx, my);
  if (l < .2) { mx = player.fx; my = player.fy; l = Math.hypot(mx, my) || 1; }
  const dx = mx / l, dy = my / l;
  const sgn = Math.abs(dx) > .2 ? Math.sign(dx) : (player.fx >= 0 ? 1 : -1);
  player.roll = { t: 0, dx, dy, sgn, dist: 0, trail: [], trailT: 0, fireT: 0, landed: false, started: false, fly: rollClears(dx, dy) };
  player.rollCharges--;
  player.moving = false;
}
function rollPerks() {
  const lb = mod('rollboom');
  if (lb) shockwave(player.x, player.y, 50 + 22 * lb, 20 + 20 * lb);
  const la = mod('rollammo'), wi = player.weapon, w = W[wi];
  if (la && w.refill && ammo[wi] !== Infinity) {
    const n = Math.ceil(w.refill * .25 * la);
    ammo[wi] += n; pop(player.x, player.y - 46, `+${n} ${w.short}`, '#f2c230');
  }
}
function updateRoll(dt) {
  const r = player.roll;
  r.t += dt;
  let v = 0;
  if (r.t >= ROLL.A && r.t < ROLL.B) {
    if (!r.started) { r.started = true; dust(player.x - r.dx * 6, player.y - r.dy * 6, 4); sfx('roll'); rollPerks(); rumble(0, .22, 60); }
    const q = (r.t - ROLL.A) / (ROLL.B - ROLL.A);
    v = ROLL.V * (1 - q * .55);
    r.trailT -= dt;
    if (r.trailT <= 0) {
      r.trailT = .022;
      r.trail.push({ x: player.x, y: player.y, h: Math.sin(q * Math.PI) * (r.fly ? 13 : 5) });
      if (r.trail.length > 5) r.trail.shift();
    }
    if (mod('firetrail')) {
      r.fireT -= dt;
      if (r.fireT <= 0) { r.fireT = .035; fires.push({ x: player.x, y: player.y, t: 2.4, max: 2.4, tick: 0 }); }
    }
  } else if (r.t >= ROLL.B) {
    if (!r.landed) { r.landed = true; dust(player.x, player.y, 6); sfx('land'); r.trail.length = 0; }
    v = 90 * (1 - (r.t - ROLL.B) / (ROLL.D - ROLL.B));
  }
  if (v > 0) {
    const ox = player.x, oy = player.y;
    moveCircle(player, r.dx * v * dt, 0, r.fly); moveCircle(player, 0, r.dy * v * dt, r.fly);
    r.dist += Math.hypot(player.x - ox, player.y - oy);
  }
  if (r.t >= ROLL.D && circleTouchesVoid(player, 0)) unstick(player);
  if (r.t >= ROLL.D) { player.roll = null; if (player.rollCd <= 0 && player.rollCharges < rollMax()) player.rollCd = ROLL.CD; }
}
function drawRollBall(cx, cy, spin, sgn, ghost) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sgn, 1); ctx.rotate(spin);
  if (ghost) {
    ctx.fillStyle = '#6f9fd0'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill();
    ctx.fillStyle = '#c23a2e'; ctx.fillRect(3, -10, 8, 2.5);
    ctx.restore(); return;
  }
  const fl = player.flash > 0, C = c => fl ? '#ffffff' : c;
  const R = (c, x, y, w, h) => { ctx.fillStyle = C(c); ctx.fillRect(x, y, w, h); };
  R('#6b4a2e', -12, -6, 5, 12); R('#7d5a38', -12, -6, 5, 2.5); R('#4d5636', -12.5, 4, 6, 3);
  ctx.fillStyle = C('#34679c'); ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, 7); ctx.fill();
  ctx.fillStyle = C('#4a82ba'); ctx.beginPath(); ctx.arc(0, 0, 9.5, -2.6, -1.2); ctx.lineTo(0, 0); ctx.fill();
  ctx.fillStyle = C('#2a2e33'); ctx.beginPath(); ctx.arc(1, 1, 6.5, -.5, 2.1); ctx.lineTo(1, 1); ctx.fill();
  R('#4d5636', 1, 2.5, 8, 5); R('#5d6842', 1, 2.5, 8, 1.3); R('#2b221b', 8, 1, 4, 7);
  R('#e2b48a', 2.5, -12, 8.5, 8.5); R('#cf9f7b', 2.5, -5.5, 8.5, 2);
  R('#4f3322', 2.5, -13, 8.5, 3); R('#c23a2e', 2.5, -10, 8.5, 2.2);
  if (!fl) { R('#1a1a1a', 8, -8, 1.5, 2); }
  ctx.strokeStyle = C('#c23a2e'); ctx.lineWidth = 1.6; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(2.5, -9); ctx.lineTo(-2.5, -12.5); ctx.moveTo(2.5, -8.5); ctx.lineTo(-1.5, -9.5); ctx.stroke();
  ctx.strokeStyle = C('#34679c'); ctx.lineWidth = 4.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-3, -4); ctx.quadraticCurveTo(3, -3, 6.5, 4.5); ctx.stroke();
  ctx.fillStyle = C('#2a2522'); ctx.beginPath(); ctx.arc(6.5, 4.5, 2.2, 0, 7); ctx.fill();
  ctx.restore();
  // lumière fixe : haut éclairé, bas dans l'ombre, quelle que soit la rotation
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 7); ctx.clip();
  ctx.fillStyle = 'rgba(10,14,30,.22)'; ctx.fillRect(cx - 13, cy + 3, 26, 11);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(cx - 13, cy - 13, 26, 5);
  ctx.restore();
}
function squashed(sx, sy) {
  ctx.save(); ctx.translate(player.x, player.y); ctx.scale(sx, sy); ctx.translate(-player.x, -player.y);
  drawPlayer(player); ctx.restore();
}
function drawPlayerState() {
  const x = player.x, y = player.y;
  if (frenzy() && !player.dead) {
    const p = .5 + .5 * Math.sin(S.time * 10);
    ctx.strokeStyle = `rgba(242,194,48,${.35 + .35 * p})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y + 1, 16 + p * 2, 7 + p, 0, 0, 7); ctx.stroke();
  }
  const blink = player.invuln > 0 && ((player.invuln * 16) | 0) % 2 === 0;
  if (blink) ctx.globalAlpha = .4;
  drawPlayerBody();
  ctx.globalAlpha = 1;
}
function drawPlayerBody() {
  const x = player.x, y = player.y;
  // jauge de recharge de la roulade, au pied du perso
  if (player.rollCd > 0 && !player.roll) {
    const k = 1 - player.rollCd / ROLL.CD;
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(x, y + 1, 14, 6, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
  } else if (player.rollReady > 0) {
    const k = player.rollReady / .3;
    ctx.strokeStyle = `rgba(242,194,48,${k})`; ctx.lineWidth = 2 + k * 2;
    ctx.beginPath(); ctx.ellipse(x, y + 1, 14 + (1 - k) * 6, 6 + (1 - k) * 2.5, 0, 0, 7); ctx.stroke();
  }
  if (rollMax() > 1 && !player.roll) {
    for (let i = 0; i < rollMax(); i++) {
      ctx.fillStyle = i < player.rollCharges ? '#f2c230' : 'rgba(255,255,255,.3)';
      ctx.beginPath(); ctx.arc(x - 4 + i * 8, y + 10, 2.2, 0, 7); ctx.fill();
    }
  }
  const r = player.roll;
  if (!r) { drawPlayer(player); return; }
  if (r.t < ROLL.A) {
    // anticipation : il se ramasse avant de plonger
    const k = r.t / ROLL.A;
    squashed(1 + .2 * k, 1 - .28 * k);
  } else if (r.t < ROLL.B) {
    const q = (r.t - ROLL.A) / (ROLL.B - ROLL.A), hop = Math.sin(q * Math.PI) * (r.fly ? 13 : 5);
    r.trail.forEach((g, i) => {
      ctx.globalAlpha = .08 + .22 * (i + 1) / r.trail.length;
      drawRollBall(g.x, g.y - 11 - g.h, 0, r.sgn, true);
    });
    ctx.globalAlpha = 1;
    // traits de vitesse
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (const o of [-6, 0, 6]) {
      const px = -r.dy, py = r.dx, bx = x + px * o - r.dx * 14, by = y - 11 - hop + py * o * .6 - r.dy * 7;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - r.dx * (10 + Math.abs(o)), by - r.dy * (6 + Math.abs(o) * .5)); ctx.stroke();
    }
    if (!isVoid(x, y)) { ctx.fillStyle = 'rgba(20,22,24,.28)'; ctx.beginPath(); ctx.ellipse(x, y + 1, 11 - hop * .6, 4.5 - hop * .25, 0, 0, 7); ctx.fill(); }
    drawRollBall(x, y - 11 - hop, r.dist / ROLL.R, r.sgn, false);
  } else {
    // réception : écrasé puis il se redresse avec un léger rebond
    const k = (r.t - ROLL.B) / (ROLL.D - ROLL.B);
    const sy = .78 + .22 * k + Math.sin(k * Math.PI) * .07;
    squashed(1 + (1 - sy) * .7, sy);
  }
}

/* Joueur : survivant en veste bleue, gilet tactique, sac à dos et bandana rouge */
const GUNS = { pistol: 8, uzi: 12, shotgun: 18, wall: 0, barrel: 0, grenade: 4, rocket: 16, rail: 18 };
function drawGun(id, C) {
  const R = (c, x, y, w, h) => { ctx.fillStyle = C(c); ctx.fillRect(x, y, w, h); };
  switch (id) {
    case 'pistol': R('#1c1e21', -1, -2, 9, 3.5); R('#3a3f45', 0, -2, 7, 1); R('#1c1e21', 0, 1, 3, 3.5); break;
    case 'uzi': R('#23262a', -2, -2, 11, 4); R('#3a3f45', -2, -2, 11, 1); R('#17191b', 2, 1.5, 3, 5); R('#23262a', 9, -1, 3, 2); break;
    case 'shotgun': R('#6b4a2e', -7, -1.5, 7, 3.5); R('#23262a', 0, -2, 8, 3.5); R('#3a3e43', 8, -1.5, 10, 2); R('#7d5734', 9, .5, 5, 2); break;
    case 'rocket': R('#4f5a3a', -7, -3, 23, 6); R('#64714a', -7, -3, 23, 1.5); R('#2f3524', -8, -3.5, 2, 7); R('#2f3524', 14, -3.5, 2, 7); R('#1c1e21', 2, -5.5, 3, 2.5); R('#1c1e21', 1, 3, 2, 3); break;
    case 'rail': R('#2b3038', -4, -2.5, 19, 5); R('#3d444f', -4, -2.5, 19, 1.2); for (const x of [3, 7, 11]) R('#59d4ff', x, -3, 2, 6); R('#9be8ff', 15, -1.5, 3, 3); break;
    case 'grenade': ctx.fillStyle = C('#3f4a2c'); ctx.beginPath(); ctx.arc(2, 0, 3.2, 0, 7); ctx.fill(); R('#8a8f86', 1, -4.5, 2, 2); break;
  }
}
function drawPlayer(e) {
  const fl = e.flash > 0, C = c => fl ? '#ffffff' : c;
  const R = (c, x, y, w, h) => { ctx.fillStyle = C(c); ctx.fillRect(x, y, w, h); };
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y));
  ctx.fillStyle = 'rgba(20,22,24,.28)'; ctx.beginPath(); ctx.ellipse(0, 1, 11, 4.5, 0, 0, 7); ctx.fill();
  const mv = e.moving, ph = e.walk || 0;
  const bob = mv ? Math.abs(Math.sin(ph)) * 1.4 : 0, st = mv ? Math.sin(ph) * 3 : 0;
  let fx = e.fx, fy = e.fy; const fn = Math.hypot(fx, fy) || 1; fx /= fn; fy /= fn;
  const back = fy < -.4, front = fy > .4, side = !back && !front, sx = fx >= 0 ? 1 : -1;
  const U = -bob;
  const sway = mv ? Math.sin(ph * 1.3) * 1.5 : Math.sin(S.time * 2) * .6;

  // jambes en treillis + bottes
  for (const [x, lift] of [[-6, Math.max(0, st)], [1, Math.max(0, -st)]]) {
    R('#4d5636', x, -10 - lift, 5, 7);
    R('#5d6842', x, -10 - lift, 5, 1.5);
    R('#2b221b', x - .5, -3.5 - lift, 6, 3.5);
  }

  const weapon = W[e.weapon].id, tip = GUNS[weapon];
  const arms = () => {
    const hx = fx * 10, hy = -16 + U + fy * 5;
    const px = -fy, py = fx * .5;
    const k = Math.hypot(fx, fy * .5), a = Math.atan2(fy * .5, fx);
    if (tip) {
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); ctx.scale(k, 1);
      drawGun(weapon, C);
      if (e.muzzle > 0 && tip >= 8) {
        ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(tip + 3, 0, 3 + Math.random() * 3, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(tip + 2, 0, 2, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
    const shoulders = [[px * 6, -20 + U + py * 2], [-px * 6, -20 + U - py * 2]];
    const hands = tip ? [[hx, hy], [hx + fx * 5, hy + fy * 2.5]] : [[hx + px * 3, hy], [hx - px * 3, hy]];
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const [ax, ay] = shoulders[i], [bx, by] = hands[i];
      ctx.strokeStyle = C('#34679c'); ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.fillStyle = C('#2a2522'); ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, 7); ctx.fill();
    }
  };
  const pack = () => {
    if (back) {
      R('#6b4a2e', -6, -23 + U, 12, 12); R('#7d5a38', -6, -23 + U, 12, 3);
      R('#4f3520', -5, -16 + U, 10, 1.5); R('#d9b23a', -1, -19 + U, 2, 2);
      R('#4d5636', -7, -11.5 + U, 14, 3.5); R('#5d6842', -7, -11.5 + U, 14, 1);
    } else if (side) {
      const bx = sx > 0 ? -11 : 7;
      R('#6b4a2e', bx, -23 + U, 4, 12); R('#7d5a38', bx, -23 + U, 4, 3);
    }
  };
  const torso = () => {
    R('#34679c', -8, -24 + U, 16, 15);
    R('#4a82ba', -8, -24 + U, 16, 2.5);
    if (front) {
      R('#2a2e33', -6, -22 + U, 12, 11);
      R('#3b4148', -5, -17 + U, 4, 3.5); R('#3b4148', 1, -17 + U, 4, 3.5);
      R('#4a515a', -5, -17 + U, 4, 1); R('#4a515a', 1, -17 + U, 4, 1);
      R('#6b4a2e', -6, -23.5 + U, 2, 6); R('#6b4a2e', 4, -23.5 + U, 2, 6);
    } else if (side) {
      R('#2a2e33', -5 + sx, -22 + U, 10, 11);
      R('#3b4148', sx > 0 ? 2 : -6, -17 + U, 4, 3.5);
      R('#6b4a2e', -sx * 3 - 1, -24 + U, 2, 7);
    }
    R('#1c1e21', -8, -11 + U, 16, 2);
    if (front) R('#d9b23a', -1, -11 + U, 2, 2);
  };
  const head = () => {
    const y0 = -37 + U;
    ctx.lineCap = 'butt';
    if (back) {
      R('#4f3322', -7, y0, 14, 13); R('#5c3d28', -7, y0, 14, 3);
      R('#c99a74', -8, y0 + 7, 1, 3); R('#c99a74', 7, y0 + 7, 1, 3);
      R('#c23a2e', -7, y0 + 4, 14, 2.5); R('#9e2b22', -1.5, y0 + 4, 3, 3);
      ctx.strokeStyle = C('#c23a2e'); ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-.5, y0 + 6.5); ctx.lineTo(-2.5 + sway, y0 + 12); ctx.moveTo(.8, y0 + 6.5); ctx.lineTo(2.5 + sway, y0 + 11); ctx.stroke();
      return;
    }
    R('#e2b48a', -7, y0, 14, 13);
    R('#cf9f7b', -7, y0 + 10, 14, 3);
    R('#4f3322', -7, y0 - 1, 14, 4); R('#5c3d28', -7, y0 - 1, 14, 1.5);
    R('#c23a2e', -7, y0 + 3, 14, 2.5);
    if (front) {
      R('#4f3322', -7, y0 + 5.5, 1.5, 3.5); R('#4f3322', 5.5, y0 + 5.5, 1.5, 3.5);
      const ex = Math.round(fx * 2), po = fx > .25 ? 1.5 : fx < -.25 ? 0 : .75;
      R('#3a2a1e', -5 + ex, y0 + 5.8, 3, 1); R('#3a2a1e', 2 + ex, y0 + 5.8, 3, 1);
      R('#f4f1ea', -5 + ex, y0 + 7, 3, 2.5); R('#f4f1ea', 2 + ex, y0 + 7, 3, 2.5);
      R('#1a1a1a', -5 + ex + po, y0 + 7, 1.5, 2.5); R('#1a1a1a', 2 + ex + po, y0 + 7, 1.5, 2.5);
      R('#9a6a50', -1.5 + ex, y0 + 10.6, 3, 1);
    } else {
      const rear = sx > 0 ? -7 : 2;
      R('#4f3322', rear, y0 + 2, 5, 8);
      R('#c23a2e', rear, y0 + 3, 5, 2.5);
      R('#c99a74', sx > 0 ? -2 : .5, y0 + 6, 1.5, 3);
      const ex = sx > 0 ? 3 : -5.5;
      R('#3a2a1e', ex, y0 + 5.8, 2.5, 1);
      R('#f4f1ea', ex, y0 + 7, 2.5, 2.5); R('#1a1a1a', ex + (sx > 0 ? 1.2 : 0), y0 + 7, 1.3, 2.5);
      R('#9a6a50', sx > 0 ? 3.5 : -5.5, y0 + 10.6, 2, 1);
      R('#d4a47e', sx > 0 ? 7 : -8, y0 + 7.5, 1, 2);
      const bx = sx > 0 ? -7 : 7, trail = mv ? 2 : 0;
      ctx.strokeStyle = C('#c23a2e'); ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(bx, y0 + 4); ctx.lineTo(bx - sx * (5 + trail), y0 + 6 + sway);
      ctx.moveTo(bx, y0 + 5); ctx.lineTo(bx - sx * (4 + trail), y0 + 9 + sway);
      ctx.stroke();
    }
  };
  if (back) { arms(); torso(); pack(); head(); }
  else { pack(); torso(); head(); arms(); }
  ctx.restore();
}
/* ---------- Lisibilité : contour sombre autour de chaque silhouette ---------- */
// Avant chaque personnage, on rejoue son dessin à travers un « faux » contexte qui peint chaque forme
// opaque en presque noir et un peu plus grosse. Le vrai dessin vient ensuite par-dessus : il ne reste
// qu'un liseré sombre tout autour. Les ombres et effets translucides sont ignorés.
let outlineOn = true;
try { outlineOn = localStorage.getItem(STORAGE_OUTLINE) !== '0'; } catch (e) {}
const OUT = '#0f1012', OUT_W = 1.15;
const alphaCache = new Map();
function opaque(c) {
  if (typeof c !== 'string') return false;
  let v = alphaCache.get(c);
  if (v === undefined) {
    const m = /rgba\(([^)]*)\)/.exec(c);
    v = m ? parseFloat(m[1].split(',')[3]) >= .7 : true;
    alphaCache.set(c, v);
  }
  return v;
}
const OLP = (() => {
  let R = null, fs = '#000', ss = '#000', lw = 1;
  return {
    bind(real) { R = real; },
    get fillStyle() { return fs; }, set fillStyle(v) { fs = v; },
    get strokeStyle() { return ss; }, set strokeStyle(v) { ss = v; },
    get lineWidth() { return lw; }, set lineWidth(v) { lw = v; },
    get lineCap() { return R.lineCap; }, set lineCap(v) { R.lineCap = v; },
    get globalAlpha() { return R.globalAlpha; }, set globalAlpha(v) { R.globalAlpha = v; },
    get lineDashOffset() { return R.lineDashOffset; }, set lineDashOffset(v) { R.lineDashOffset = v; },
    setLineDash(v) { R.setLineDash(v); },
    save() { R.save(); }, restore() { R.restore(); },
    translate(a, b) { R.translate(a, b); }, scale(a, b) { R.scale(a, b); }, rotate(a) { R.rotate(a); },
    beginPath() { R.beginPath(); }, closePath() { R.closePath(); },
    moveTo(a, b) { R.moveTo(a, b); }, lineTo(a, b) { R.lineTo(a, b); },
    quadraticCurveTo(a, b, c, d) { R.quadraticCurveTo(a, b, c, d); },
    arc(...a) { R.arc(...a); }, ellipse(...a) { R.ellipse(...a); }, rect(...a) { R.rect(...a); },
    clip() { R.clip(); },
    createLinearGradient(...a) { return R.createLinearGradient(...a); },
    createRadialGradient(...a) { return R.createRadialGradient(...a); },
    fillRect(x, y, w, h) { if (!opaque(fs)) return; R.fillStyle = OUT; R.fillRect(x - OUT_W, y - OUT_W, w + 2 * OUT_W, h + 2 * OUT_W); },
    strokeRect(x, y, w, h) { if (!opaque(ss)) return; R.strokeStyle = OUT; R.lineWidth = lw + 2 * OUT_W; R.strokeRect(x, y, w, h); },
    fill() { if (!opaque(fs)) return; R.fillStyle = OUT; R.fill(); R.strokeStyle = OUT; R.lineWidth = 2 * OUT_W; R.stroke(); },
    stroke() { if (!opaque(ss)) return; R.strokeStyle = OUT; R.lineWidth = lw + 2 * OUT_W; R.stroke(); },
  };
})();
function outlined(ent, draw) {
  if (outlineOn) {
    const real = ctx;
    real.save(); real.lineJoin = 'round'; OLP.bind(real); ctx = OLP;
    try { draw(); } finally { ctx = real; real.restore(); }
  }
  draw();
}

/* ---------- Lisibilité : repères de jeu, au-dessus du décor ---------- */
function drawMarkers() {
  const t = S.time, pulse = .5 + .5 * Math.sin(t * 6);
  // bord lumineux et animé des flaques d'acide
  for (const p of puddles) {
    const fade = Math.min(1, p.t / .8), r = p.r * Math.min(1, (p.max - p.t) / .15) + 1;
    ctx.save(); ctx.setLineDash([6, 4]); ctx.lineDashOffset = -t * 18;
    ctx.strokeStyle = `rgba(214,255,110,${(.6 + .35 * pulse) * fade})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * .6, 0, 0, 7); ctx.stroke(); ctx.restore();
  }
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.type === 'b' && e.fuse !== undefined) {
      // Gonflé amorcé : anneau rouge serré + rayon réel de l'explosion en pointillés
      const R = 74 * Math.pow(1.4, mod('chair'));
      ctx.save(); ctx.setLineDash([5, 6]);
      ctx.strokeStyle = `rgba(255,70,50,${.25 + .2 * pulse})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + 1, R, R * .55, 0, 0, 7); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = `rgba(255,70,50,${.6 + .4 * pulse})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + 1, 24 + pulse * 4, (24 + pulse * 4) * .5, 0, 0, 7); ctx.stroke();
    } else if (e.type === 's' && e.wind > 0) {
      ctx.strokeStyle = `rgba(182,224,74,${.5 + .5 * pulse})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + 1, 16, 7, 0, 0, 7); ctx.stroke();
    } else if (e.type === 'a' && e.shield > 0) {
      // arc blanc du côté protégé par le bouclier
      const a = Math.atan2(e.fy * 2.2, e.fx);
      ctx.strokeStyle = 'rgba(235,242,248,.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(e.x, e.y + 1, 19, 8.5, 0, a - 1.05, a + 1.05); ctx.stroke();
    }
  }
  for (const p of pickups) {
    ctx.strokeStyle = p.kind === 'hp' ? 'rgba(98,196,110,.9)' : 'rgba(242,194,48,.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 13, 5.5, 0, 0, 7); ctx.stroke();
  }
}
// faisceau vertical au-dessus des caisses, visible même derrière la horde
function drawBeacons() {
  const pulse = .5 + .5 * Math.sin(S.time * 6);
  for (const p of pickups) {
    const col = p.kind === 'hp' ? '98,196,110' : '242,194,48';
    const g = ctx.createLinearGradient(0, p.y - 74, 0, p.y - 12);
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${.35 + .15 * pulse})`);
    ctx.fillStyle = g; ctx.fillRect(p.x - 4, p.y - 74, 8, 62);
  }
}
function drawTile(tx, ty, kind) {
  const x = tx * T, y = ty * T, h = kind === 1 ? 26 : 18;
  const below = tileAt(tx, ty + 1) === 1 && map[(ty + 1) * MW + tx] === kind;
  if (kind === 1) {
    if (!below || ty + 1 >= MH) { ctx.fillStyle = '#3c4245'; ctx.fillRect(x, y + T - h, T, h); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y + T - 4, T, 4); ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(x + T - 1, y + T - h, 1, h); }
    ctx.fillStyle = '#596166'; ctx.fillRect(x, y - h, T, T);
    ctx.fillStyle = '#737c81';
    const same = (dx, dy) => { const nx = tx + dx, ny = ty + dy; return nx < 0 || ny < 0 || nx >= MW || ny >= MH || map[ny * MW + nx] === 1; };
    if (!same(0, -1)) ctx.fillRect(x, y - h, T, 2);
    if (!same(-1, 0)) ctx.fillRect(x, y - h, 2, T);
    if (!same(1, 0)) { ctx.fillStyle = '#4c5357'; ctx.fillRect(x + T - 2, y - h, 2, T); }
  } else {
    ctx.fillStyle = '#8f6639'; ctx.fillRect(x + 1, y + T - h, T - 2, h);
    ctx.strokeStyle = '#6a4a28'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 2.5, y + T - h + 1.5, T - 5, h - 3);
    ctx.beginPath(); ctx.moveTo(x + 3, y + T - 2); ctx.lineTo(x + T - 3, y + T - h + 2); ctx.stroke();
    ctx.fillStyle = '#b98c55'; ctx.fillRect(x + 1, y - h + 1, T - 2, T - 2);
    ctx.fillStyle = '#a57a46'; for (let k = 1; k < 4; k++) ctx.fillRect(x + 1, y - h + 1 + k * 7.5, T - 2, 1.5);
    ctx.strokeStyle = '#7d5a31'; ctx.strokeRect(x + 1.5, y - h + 1.5, T - 3, T - 3);
  }
}
function clearShot(ax, ay, bx, by, own) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.max(1, d / 8 | 0);
  for (let k = 1; k < n; k++) {
    const tx = Math.floor((ax + (bx - ax) * k / n) / T), ty = Math.floor((ay + (by - ay) * k / n) / T);
    if (ty * MW + tx === own) continue;
    if (shotTile(tx, ty)) return false;
  }
  return true;
}
function updateTurret(b, dt) {
  const tu = b.turret; tu.cd -= dt; tu.flash -= dt;
  if (tu.cd > 0) return;
  const cx = b.tx * T + T / 2, cy = b.ty * T + T / 2;
  let best = null, bd = 290 * 290;
  for (const e of enemies) {
    if (e.dead) continue;
    const d = (e.x - cx) ** 2 + (e.y - cy) ** 2;
    if (d < bd && clearShot(cx, cy, e.x, e.y, b.i)) { bd = d; best = e; }
  }
  if (!best) { tu.cd = .15; return; }
  const d = Math.sqrt(bd) || 1, a = Math.atan2(best.y - cy, best.x - cx);
  tu.ang = a; tu.cd = .45; tu.flash = .06;
  hurtEnemy(best, 22, (best.x - cx) / d, (best.y - cy) / d, 40);
  const top = b.ty * T - 6;
  tracers.push({ x1: cx + Math.cos(a) * 16, y1: top + Math.sin(a) * .55 * 16 + 16, x2: best.x, y2: best.y, t: .06, max: .06, w: 1.4, c: '255,226,150' });
  sfx('uzi', 70);
}
function updateFires(dt) {
  if (!fires.length) return;
  const dmg = 8 * Math.max(1, mod('firetrail'));
  for (const f of fires) {
    f.t -= dt; f.tick -= dt;
    if (f.tick <= 0) {
      f.tick = .2;
      for (const e of enemies) if (!e.dead && (e.x - f.x) ** 2 + (e.y - f.y) ** 2 < 400) hurtEnemy(e, dmg, 0, 0, 0);
    }
    if (Math.random() < dt * 5) addPart({ t: 'fire', x: f.x + rnd(6), y: f.y + rnd(4), z: 2, vx: rnd(10), vy: rnd(10), vz: 30 + Math.random() * 30, life: .4, max: .4, size: 3 + Math.random() * 2 });
  }
  fires = fires.filter(f => f.t > 0);
}
function drawVoid(tx0, tx1, ty0, ty1) {
  // 1er passage : le fond noir, légèrement débordant pour éviter les liserés entre tuiles
  ctx.fillStyle = '#0c0d0e';
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (map[ty * MW + tx] === 3) ctx.fillRect(tx * T - .5, ty * T - .5, T + 1, T + 1);
  }
  // 2e passage : parois et rebords
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (map[ty * MW + tx] !== 3) continue;
    const x = tx * T, y = ty * T;
    const up = ty > 0 && map[(ty - 1) * MW + tx] === 3, dn = ty < MH - 1 && map[(ty + 1) * MW + tx] === 3;
    const lf = tx > 0 && map[ty * MW + tx - 1] === 3, rt = tx < MW - 1 && map[ty * MW + tx + 1] === 3;
    if (!up) {
      // paroi du fond de la crevasse, visible en vue 3/4
      const g = ctx.createLinearGradient(0, y, 0, y + 22);
      g.addColorStop(0, '#73776f'); g.addColorStop(.3, '#43463f'); g.addColorStop(1, 'rgba(12,13,14,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, T, 22);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x, y + 5, T, 1); ctx.fillRect(x, y + 11, T, 1);
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x + ((tx * 7) % 23) + 3, y + 1, 1, 9);
    }
    if (!lf) { const g = ctx.createLinearGradient(x, 0, x + 6, 0); g.addColorStop(0, 'rgba(110,114,106,.55)'); g.addColorStop(1, 'rgba(12,13,14,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, 6, T); }
    if (!rt) { const g = ctx.createLinearGradient(x + T, 0, x + T - 6, 0); g.addColorStop(0, 'rgba(110,114,106,.35)'); g.addColorStop(1, 'rgba(12,13,14,0)'); ctx.fillStyle = g; ctx.fillRect(x + T - 6, y, 6, T); }
    if (!dn) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x, y + T - 5, T, 3); ctx.fillStyle = '#9a9e96'; ctx.fillRect(x, y + T - 2, T, 2); }
  }
}
function drawFires() {
  for (const f of fires) {
    const k = Math.min(1, f.t / .6), fl = .8 + Math.sin(S.time * 20 + f.x) * .2;
    const g = ctx.createRadialGradient(f.x, f.y, 1, f.x, f.y, 16);
    g.addColorStop(0, `rgba(255,190,80,${.5 * k * fl})`); g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(f.x, f.y, 16, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(255,${150 + 60 * fl | 0},60,${.9 * k})`;
    for (let j = -1; j <= 1; j++) {
      const hh = (6 + 4 * Math.sin(S.time * 14 + f.x + j * 2)) * k;
      ctx.beginPath(); ctx.moveTo(f.x + j * 5 - 3, f.y); ctx.lineTo(f.x + j * 5, f.y - hh); ctx.lineTo(f.x + j * 5 + 3, f.y); ctx.fill();
    }
  }
}
function drawBlock(b) {
  const x = b.tx * T, y = b.ty * T, fl = b.flash > 0, dr = b.drop * 14;
  ctx.save(); ctx.translate(0, -dr);
  if (b.kind === 'wall') {
    const h = 20;
    ctx.fillStyle = fl ? '#fff' : '#858a85'; ctx.fillRect(x + 1, y + T - h, T - 2, h);
    if (!fl) {
      ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + T - h + 3, T - 2, 6); ctx.clip();
      for (let k = -2; k < 8; k++) { ctx.fillStyle = k & 1 ? '#1d1f20' : '#f2c230'; ctx.beginPath(); ctx.moveTo(x + k * 6, y + T - h + 9); ctx.lineTo(x + k * 6 + 6, y + T - h + 3); ctx.lineTo(x + k * 6 + 12, y + T - h + 3); ctx.lineTo(x + k * 6 + 6, y + T - h + 9); ctx.fill(); }
      ctx.restore();
    }
    ctx.fillStyle = fl ? '#fff' : '#aab0ab'; ctx.fillRect(x + 1, y - h + 2, T - 2, T - 2);
    ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(x + 1, y - h + T / 2, T - 2, 2);
    const dmg = 1 - b.hp / b.max;
    if (dmg > .3) { ctx.strokeStyle = 'rgba(30,30,30,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 6, y - h + 6); ctx.lineTo(x + 14, y - h + 14); ctx.lineTo(x + 11, y - h + 22); if (dmg > .6) { ctx.moveTo(x + 24, y - h + 4); ctx.lineTo(x + 19, y - h + 16); ctx.lineTo(x + 27, y - h + 24); } ctx.stroke(); }
    if (!fl && mod('barbeles')) {
      ctx.strokeStyle = '#2c3034'; ctx.lineWidth = 1;
      for (const off of [6, 18]) {
        ctx.beginPath();
        for (let k = 0; k <= 8; k++) { const px = x + 2 + k * (T - 4) / 8, py = y - h + off + (k & 1 ? 2.5 : -1.5); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
      }
    }
    if (b.turret) {
      const tu = b.turret, tx2 = x + T / 2, ty2 = y - h + T / 2 - 1;
      ctx.fillStyle = fl ? '#fff' : '#3a3f45'; ctx.beginPath(); ctx.ellipse(tx2, ty2 + 2, 9, 5.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = fl ? '#fff' : '#59616a'; ctx.beginPath(); ctx.ellipse(tx2, ty2, 7, 4.6, 0, 0, 7); ctx.fill();
      const ca = Math.cos(tu.ang), sa = Math.sin(tu.ang) * .55;
      ctx.strokeStyle = '#1c1e21'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx2, ty2 - 1); ctx.lineTo(tx2 + ca * 13, ty2 - 1 + sa * 13); ctx.stroke();
      ctx.fillStyle = '#f2c230'; ctx.fillRect(tx2 - 1.5, ty2 - 2.5, 3, 3);
      if (tu.flash > 0) { ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(tx2 + ca * 16, ty2 - 1 + sa * 16, 4, 0, 7); ctx.fill(); }
    }
  } else {
    const cx = x + T / 2, cy = y + T / 2 + 6;
    ctx.fillStyle = 'rgba(20,22,24,.3)'; ctx.beginPath(); ctx.ellipse(cx, cy + 1, 11, 4.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = fl ? '#fff' : '#b8312a'; ctx.fillRect(cx - 9, cy - 22, 18, 22);
    ctx.fillStyle = fl ? '#fff' : '#8e231e'; ctx.fillRect(cx - 9, cy - 16, 18, 2); ctx.fillRect(cx - 9, cy - 7, 18, 2); ctx.fillRect(cx + 5, cy - 22, 4, 22);
    ctx.fillStyle = fl ? '#fff' : '#d4473d'; ctx.beginPath(); ctx.ellipse(cx, cy - 22, 9, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7d1d18'; ctx.beginPath(); ctx.arc(cx + 3, cy - 22, 1.6, 0, 7); ctx.fill();
    if (!fl) { ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.moveTo(cx - 2, cy - 14); ctx.lineTo(cx + 3, cy - 14); ctx.lineTo(cx + .5, cy - 9); ctx.fill(); }
  }
  if (b.hp < b.max && b.kind === 'wall') {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x + 4, y - 28, T - 8, 3);
    ctx.fillStyle = '#f2c230'; ctx.fillRect(x + 4, y - 28, (T - 8) * Math.max(0, b.hp / b.max), 3);
  }
  ctx.restore();
}
function drawPickup(p) {
  const bb = Math.sin(S.time * 4 + p.ph) * 2;
  ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y));
  const pr = (S.time * 1.2 + p.ph) % 1;
  ctx.strokeStyle = `rgba(242,194,48,${.6 * (1 - pr)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 8 + pr * 12, (8 + pr * 12) * .45, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(20,22,24,.3)'; ctx.beginPath(); ctx.ellipse(0, 1, 9, 3.5, 0, 0, 7); ctx.fill();
  const hp = p.kind === 'hp', top = -16 - bb;
  ctx.fillStyle = hp ? '#cfccc4' : '#56602f'; ctx.fillRect(-8, top + 2, 16, 11);
  ctx.fillStyle = hp ? '#f0eee8' : '#707b40'; ctx.fillRect(-8, top - 5, 16, 7);
  if (hp) { ctx.fillStyle = '#d0352c'; ctx.fillRect(-1.5, top + 3, 3, 9); ctx.fillRect(-4.5, top + 6, 9, 3); }
  else { ctx.fillStyle = '#f2c230'; for (let k = -1; k <= 1; k++) ctx.fillRect(k * 4 - 1, top + 4, 2, 7); }
  ctx.restore();
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1a1c1d'; ctx.fillRect(0, 0, cv.width, cv.height);
  const s = zoom * dpr;
  const sx = shake > .3 ? rnd(shake) : 0, sy = shake > .3 ? rnd(shake) : 0;
  const ox = cv.width / 2 - (cam.x + sx) * s, oy = cv.height / 2 - (cam.y + sy) * s;
  ctx.setTransform(s, 0, 0, s, ox, oy);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(floorC, 0, 0);

  const hw = cv.width / 2 / s, hh = cv.height / 2 / s;
  const tx0 = Math.max(0, Math.floor((cam.x - hw) / T) - 1), tx1 = Math.min(MW - 1, Math.floor((cam.x + hw) / T) + 1);
  const ty0 = Math.max(0, Math.floor((cam.y - hh) / T) - 1), ty1 = Math.min(MH - 1, Math.floor((cam.y + hh + 40) / T) + 1);

  drawVoid(tx0, tx1, ty0, ty1);
  // ombres portées des murs
  ctx.fillStyle = 'rgba(30,32,30,.16)';
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const m0 = map[ty * MW + tx];
    if ((m0 === 1 || m0 === 2) && ty + 1 < MH && !map[(ty + 1) * MW + tx]) ctx.fillRect(tx * T, (ty + 1) * T, T, 7);
  }

  drawAcidGround();
  drawFires();
  drawMarkers();
  // ennemis qui tombent dans une crevasse : ils rapetissent et s'effacent dans le noir
  for (const f of fallers) {
    const e = f.e, k = f.t / .7, sc = 1 - k * .8;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k * 1.2);
    ctx.translate(e.x, e.y + k * 16); ctx.rotate(k * (e.x % 2 ? 1.2 : -1.2)); ctx.scale(sc, sc); ctx.translate(-e.x, -e.y);
    e.flash = 0; e.moving = true; e.walk = (e.walk || 0) + .4;
    if (e.type === 'b') drawBloater(e); else if (e.type === 'r') drawRunner(e); else if (e.type === 's') drawSpitter(e); else if (e.type === 'a') drawArmored(e); else drawChar(e, e.type);
    ctx.restore();
  }
  const list = [];
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const v = map[ty * MW + tx]; if (v === 1 || v === 2) list.push({ k: (ty + 1) * T, t: 0, tx, ty, v });
  }
  for (const b of blocks.values()) list.push({ k: b.ty * T + T * .75, t: 1, o: b });
  for (const p of pickups) list.push({ k: p.y, t: 2, o: p });
  for (const e of enemies) list.push({ k: e.y, t: 3, o: e });
  if (!player.dead) list.push({ k: player.y, t: 4, o: player });
  for (const g of grenades) list.push({ k: g.y, t: 5, o: g });
  for (const r of rockets) list.push({ k: r.y, t: 6, o: r });
  list.sort((a, b) => a.k - b.k);
  const vx0 = cam.x - hw - 50, vx1 = cam.x + hw + 50, vy0 = cam.y - hh - 20, vy1 = cam.y + hh + 70;
  for (const d of list) {
    if (d.t >= 2 && d.t <= 4 && (d.o.x < vx0 || d.o.x > vx1 || d.o.y < vy0 || d.o.y > vy1)) continue;
    switch (d.t) {
      case 0: drawTile(d.tx, d.ty, d.v); break;
      case 1: drawBlock(d.o); break;
      case 2: outlined(d.o, () => drawPickup(d.o)); break;
      case 3: { const e = d.o; outlined(e, () => { if (e.type === 'b') drawBloater(e); else if (e.type === 'r') drawRunner(e); else if (e.type === 's') drawSpitter(e); else if (e.type === 'a') drawArmored(e); else drawChar(e, e.type); }); break; }
      case 4: outlined(player, drawPlayerState); break;
      case 5: {
        const g = d.o;
        ctx.fillStyle = 'rgba(20,22,24,.3)'; ctx.beginPath(); ctx.ellipse(g.x, g.y, 4, 2, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#3f4a2c'; ctx.beginPath(); ctx.arc(g.x, g.y - 4 - g.z, 3.6, 0, 7); ctx.fill();
        if ((g.t * 8 | 0) & 1) { ctx.fillStyle = '#ff4a3a'; ctx.fillRect(g.x - 1, g.y - 9 - g.z, 2, 2); }
        break;
      }
      case 6: {
        const r = d.o, a = Math.atan2(r.vy, r.vx);
        ctx.save(); ctx.translate(r.x, r.y - 14); ctx.rotate(a);
        ctx.fillStyle = '#4a5155'; ctx.fillRect(-7, -2.5, 12, 5); ctx.fillStyle = '#d0352c'; ctx.fillRect(4, -2.5, 4, 5);
        ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(-9, 0, 2.5 + Math.random() * 2, 0, 7); ctx.fill();
        ctx.restore(); break;
      }
    }
  }

  // boules de feu
  for (const p of projs) {
    const g = ctx.createRadialGradient(p.x, p.y - 14, 1, p.x, p.y - 14, 10);
    g.addColorStop(0, 'rgba(255,240,180,1)'); g.addColorStop(.4, 'rgba(255,140,40,.9)'); g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y - 14, 10, 0, 7); ctx.fill();
  }
  // particules
  for (const p of parts) {
    if (p.t === 'smoke') {
      const a = Math.max(0, p.life / p.max) * .45;
      ctx.fillStyle = p.color + a.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y - p.z, p.size, 0, 7); ctx.fill();
    } else if (p.t === 'fire') {
      const k = Math.max(0, p.life / p.max);
      ctx.fillStyle = `rgba(255,${120 + k * 120 | 0},${40 + k * 60 | 0},${k})`; ctx.beginPath(); ctx.arc(p.x, p.y - p.z, p.size * k + 1, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.z - p.size / 2, p.size, p.size);
    }
  }
  drawBeacons();
  drawGlobs();
  // traçantes
  ctx.lineCap = 'round';
  for (const t of tracers) {
    const k = t.t / t.max;
    ctx.strokeStyle = `rgba(${t.c},${k})`; ctx.lineWidth = t.w * (t.w > 3 ? k + .3 : 1);
    ctx.beginPath(); ctx.moveTo(t.x1, t.y1 - 16); ctx.lineTo(t.x2, t.y2 - 16); ctx.stroke();
    if (t.w > 3) { ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  // explosions
  for (const b of booms) {
    const k = b.t / b.max;
    if (b.ring) {
      ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * .85})`; ctx.lineWidth = 1 + 4 * (1 - k);
      ctx.beginPath(); ctx.ellipse(b.x, b.y, b.R * (.25 + .85 * k), b.R * (.25 + .85 * k) * .55, 0, 0, 7); ctx.stroke();
      continue;
    }
    if (k < .3) {
      ctx.fillStyle = `rgba(255,246,214,${1 - k / .3})`; ctx.beginPath(); ctx.arc(b.x, b.y - 8, b.R * (.45 + k * 1.6), 0, 7); ctx.fill();
    }
    const g = ctx.createRadialGradient(b.x, b.y - 8, 2, b.x, b.y - 8, b.R * (.5 + k * .6));
    g.addColorStop(0, `rgba(255,220,120,${.9 * (1 - k)})`); g.addColorStop(.6, `rgba(255,120,40,${.6 * (1 - k)})`); g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y - 8, b.R * (.5 + k * .6), 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(255,190,90,${(1 - k) * .8})`; ctx.lineWidth = 5 * (1 - k);
    ctx.beginPath(); ctx.ellipse(b.x, b.y, b.R * (.3 + k), b.R * (.3 + k) * .55, 0, 0, 7); ctx.stroke();
  }
  // textes flottants
  ctx.textAlign = 'center';
  for (const p of pops) {
    ctx.globalAlpha = Math.min(1, p.t * 2);
    ctx.font = '12px "Black Ops One", Impact, sans-serif';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,22,24,.85)'; ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  // indicateur de pose de bloc
  if (state === 'play' && !player.dead && (W[player.weapon].id === 'wall' || W[player.weapon].id === 'barrel')) {
    const [tx, ty] = frontTile(); const i = ty * MW + tx;
    const ok = passable(tx, ty) && !blocks.has(i) && !doorSet.has(i);
    ctx.strokeStyle = ok ? 'rgba(242,194,48,.8)' : 'rgba(208,53,44,.7)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.strokeRect(tx * T + 2, ty * T + 2, T - 4, T - 4); ctx.setLineDash([]);
  }

  // ligne de visée quand la direction est figée
  if (state === 'play' && !player.dead && player.strafe && W[player.weapon].id !== 'wall' && W[player.weapon].id !== 'barrel') {
    ctx.strokeStyle = 'rgba(242,194,48,.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(player.x + player.fx * 24, player.y - 16 + player.fy * 24); ctx.lineTo(player.x + player.fx * 96, player.y - 16 + player.fy * 96); ctx.stroke(); ctx.setLineDash([]);
  }

  // vignette
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const pulse = player.hp < LOW_HP && !player.dead ? (.25 + .15 * Math.sin(S.time * 6)) : 0;
  const hurt = Math.max(0, player.hurtT) * 1.6 + pulse;
  if (hurt > .01) {
    const g = ctx.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * .3, cv.width / 2, cv.height / 2, Math.max(cv.width, cv.height) * .7);
    g.addColorStop(0, 'rgba(160,20,16,0)'); g.addColorStop(1, `rgba(160,20,16,${Math.min(.7, hurt)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
  }
}

/* ---------- Compteur de FPS ---------- */
const fpsEl = $('fps'), fpsTxt = $('fpsTxt'), fpsCtx = $('fpsCv').getContext('2d');
const ftHist = new Float32Array(96);
let ftI = 0, fpsAcc = 0, fpsN = 0, fpsT = 0, fpsOn = SHOW_FPS_BY_DEFAULT;
try { const saved = localStorage.getItem(STORAGE_FPS); if (saved !== null) fpsOn = saved !== '0'; } catch (e) {}
function setFps(v) {
  fpsOn = v; fpsEl.hidden = !v;
  $('fpsBtn').textContent = 'FPS : ' + (v ? 'affichés' : 'masqués');
  try { localStorage.setItem(STORAGE_FPS, v ? '1' : '0'); } catch (e) {}
}
$('fpsBtn').addEventListener('click', () => setFps(!fpsOn));
function setOutline(v) {
  outlineOn = v; $('olBtn').textContent = 'Contours : ' + (v ? 'activés' : 'désactivés');
  try { localStorage.setItem(STORAGE_OUTLINE, v ? '1' : '0'); } catch (e) {}
}
$('olBtn').addEventListener('click', () => setOutline(!outlineOn));
setOutline(outlineOn);
setFps(fpsOn);
function tickFps(ms, now) {
  ftHist[ftI] = ms; ftI = (ftI + 1) % ftHist.length;
  fpsAcc += ms; fpsN++;
  if (now - fpsT > 250) {
    const f = 1000 / (fpsAcc / fpsN);
    fpsTxt.textContent = Math.round(f) + ' fps';
    fpsEl.dataset.lvl = f >= 55 ? 'ok' : f >= 30 ? 'mid' : 'low';
    fpsAcc = fpsN = 0; fpsT = now;
  }
  if (!fpsOn) return;
  const c = fpsCtx, w = 192, h = 52, y = v => h - Math.min(v, 50) / 50 * h;
  c.clearRect(0, 0, w, h);
  for (let k = 0; k < 96; k++) {
    const v = ftHist[(ftI + k) % 96], yy = y(v);
    c.fillStyle = v <= 18 ? '#62c46e' : v <= 34 ? '#f2c230' : '#d0352c';
    c.fillRect(k * 2, yy, 2, h - yy);
  }
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(0, y(16.7), w, 1); c.fillRect(0, y(33.3), w, 1);
}

/* ---------- Manette ---------- */
// disposition « standard » : 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 Select, 9 Start, 12-15 croix
const pad = { on: false, mx: 0, my: 0, ax: 0, ay: 0, fire: false, prev: [], idx: -1, blocked: false };
let padFlick = 0, pickFocus = 0, rumbleT = 0, toastT = 0;
function deadzone(x, y, d) {
  const l = Math.hypot(x, y);
  if (l < d) return [0, 0];
  const k = Math.min(1, (l - d) / (1 - d)) / l;
  return [x * k, y * k];
}
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200);
}
function rumble(strong, weak, ms) {
  if (!pad.on) return;
  const now = performance.now(); if (now < rumbleT) return; rumbleT = now + 40;
  try {
    const gp = navigator.getGamepads()[pad.idx], va = gp && gp.vibrationActuator;
    if (va && va.playEffect) va.playEffect('dual-rumble', { startDelay: 0, duration: ms, weakMagnitude: weak, strongMagnitude: strong }).catch(() => {});
  } catch (e) {}
}
function focusCard(i) {
  const cards = $('cards').children; if (!cards.length) return;
  pickFocus = clamp(i, 0, cards.length - 1);
  for (let k = 0; k < cards.length; k++) cards[k].classList.toggle('focus', k === pickFocus);
  try { cards[pickFocus].focus({ preventScroll: false }); } catch (e) {}
}
function pollPad() {
  let list;
  try { list = navigator.getGamepads ? navigator.getGamepads() : []; }
  catch (e) { if (!pad.blocked) { pad.blocked = true; $('padHint').textContent = 'Ce navigateur bloque la manette dans cette page.'; } return; }
  let gp = null;
  for (const g of list || []) if (g && g.connected && g.axes.length >= 2) { gp = g; break; }
  if (!gp) {
    if (pad.on) { pad.on = false; pad.mx = pad.my = pad.ax = pad.ay = 0; pad.fire = false; root.classList.remove('has-pad'); toast('Manette déconnectée'); if (state === 'play') pause(); }
    return;
  }
  if (!pad.on) { pad.on = true; root.classList.add('has-pad'); toast('Manette connectée : ' + (gp.id.split('(')[0].trim() || 'manette')); audio(); }
  pad.idx = gp.index;
  const ax = gp.axes, btn = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > .5));
  const now = gp.buttons.map((_, i) => btn(i));
  [pad.mx, pad.my] = deadzone(ax[0] || 0, ax[1] || 0, PAD_MOVE_DEADZONE);
  [pad.ax, pad.ay] = ax.length >= 4 ? deadzone(ax[2] || 0, ax[3] || 0, PAD_AIM_DEADZONE) : [0, 0];
  pad.fire = !!(gp.buttons[7] && gp.buttons[7].value > .35);
  const prev = pad.prev, hit = i => now[i] && !prev[i];
  const fdir = Math.abs(ax[0] || 0) > .6 ? Math.sign(ax[0]) : Math.abs(ax[1] || 0) > .6 ? Math.sign(ax[1]) * 2 : 0;
  const flick = fdir && fdir !== padFlick ? fdir : 0; padFlick = fdir;
  pad.prev = now;
  if (state === 'title' || state === 'over') { if (hit(0) || hit(9)) startGame(); return; }
  if (state === 'pause') { if (hit(0) || hit(1) || hit(9)) resume(); return; }
  if (state === 'pick') {
    if (hit(14) || hit(12) || flick < 0) focusCard(pickFocus - 1);
    if (hit(15) || hit(13) || flick > 0) focusCard(pickFocus + 1);
    if (hit(0)) choosePick(pickFocus);
    return;
  }
  if (state !== 'play') return;
  if (hit(9)) { pause(); return; }
  if (hit(0) || hit(6)) tryRoll();
  if (hit(4) || hit(14)) cycleWeapon(-1);
  if (hit(5) || hit(15)) cycleWeapon(1);
  if (hit(3) && !S.waveActive && S.wave > 0 && S.pickT <= 0) S.breakT = 0;
}
addEventListener('gamepadconnected', () => pollPad());
addEventListener('gamepaddisconnected', () => pollPad());

/* ---------- Boucle ---------- */
let last = performance.now();
function frame(now) {
  pollPad();
  tickFps(now - last, now);
  const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
  if (state === 'play') { update(dt); updateHud(); }
  else if (state === 'title' || state === 'over') { S.time += dt; }
  render();
  requestAnimationFrame(frame);
}
newGame(); showBest();
requestAnimationFrame(frame);
})();
