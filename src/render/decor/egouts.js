// Décor des égouts : canaux d'eau sale qui coulent, passerelles, bouches de tuyaux géants sur les portes,
// piliers de brique, caisses pourries et fûts toxiques ; pénombre verdâtre percée par les rais de lumière
// des plaques d'égout et par les lampes grillagées.
import { MH, MW, T } from '../../config.js';
import { glow } from '../ambiance.js';
import { ctx } from '../canvas.js';
import { map } from '../../state/arena.js';

export const NIGHT = '#62806f', FOG = null, WEATHER = null, VIGNETTE = 'rgba(0,8,4,.55)';
const WW = MW * T, WH = MH * T, WALL_H = T + 10; // hauteur du mur du fond (bordure nord)
const SHAFTS = [[22, 15.2], [16, 4.5], [28, 25.5], [5.5, 15], [38.5, 15]].map(([x, y]) => [x * T, y * T]);
const LAMPS = [3, 8, 14, 19, 25, 30, 36, 41].map(x => x * T + 8);
const MOUTHS = [[22 * T, 22, 'n'], [22 * T, WH - 14, 's'], [14, 15 * T, 'w'], [WW - 14, 15 * T, 'e']];

export const covered = new Uint8Array(MW * MH);
export const objects = [];
const PILLARS = [], DRUMS = [];
let waterTiles = new Int32Array(0);

const at = (x, y) => x < 0 || y < 0 || x >= MW || y >= MH ? 1 : map[y * MW + x];
const wet = (x, y) => at(x, y) === 3;
// passerelle : case de sol jetée sur un canal, de l'eau de part et d'autre (à une ou deux cases)
const bridge = (x, y) => at(x, y) === 0 && (((wet(x - 1, y) || wet(x - 2, y)) && (wet(x + 1, y) || wet(x + 2, y))) || ((wet(x, y - 1) || wet(x, y - 2)) && (wet(x, y + 1) || wet(x, y + 2))));
// sens du courant : vers l'est dans un canal horizontal, vers le sud dans un canal vertical
const flowsEast = (x, y) => wet(x - 1, y) || wet(x + 1, y);

/* ---------- Sol, mur du fond, bouches de tuyaux ---------- */
function pipeMouth(f, x, y, side) {
  const r = 40, lateral = side === 'w' || side === 'e';
  f.save(); f.translate(x, y); f.scale(lateral ? .55 : 1, 1);
  f.fillStyle = '#3d4549'; f.beginPath(); f.arc(0, 0, r + 8, 0, 7); f.fill();
  f.fillStyle = '#5b666b'; f.beginPath(); f.arc(0, 0, r + 4, 0, 7); f.fill();
  f.fillStyle = '#0a0d0b'; f.beginPath(); f.arc(0, 0, r, 0, 7); f.fill();
  f.fillStyle = 'rgba(110,150,60,.5)'; f.beginPath(); f.ellipse(0, r * .55, r * .8, r * .3, 0, 0, 7); f.fill();
  f.fillStyle = '#2b3236'; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; f.beginPath(); f.arc(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6), 2, 0, 7); f.fill(); }
  f.restore();
}
export function paintGround(f, W, H) {
  f.fillStyle = '#48544b'; f.fillRect(0, 0, W, H);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (wet(x, y)) continue;
    const v = Math.random(); f.fillStyle = v < .33 ? '#4e5a51' : v < .66 ? '#46524a' : '#4a564d'; f.fillRect(x * T + 1, y * T + 1, T - 2, T - 2);
    f.fillStyle = 'rgba(0,0,0,.18)'; f.fillRect(x * T, y * T, T, 1); f.fillRect(x * T, y * T, 1, T);
  }
  for (let k = 0; k < 6000; k++) { f.fillStyle = Math.random() < .5 ? 'rgba(0,0,0,.12)' : 'rgba(200,220,190,.05)'; f.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  for (let k = 0; k < 40; k++) { f.fillStyle = 'rgba(25,40,30,.35)'; f.beginPath(); f.ellipse(Math.random() * W, Math.random() * H, 14 + Math.random() * 30, 6 + Math.random() * 12, 0, 0, 7); f.fill(); }
  for (const [x, y, rx, ry] of [[19, 12, 40, 13], [26, 18.5, 34, 11], [6, 20, 30, 10], [38, 11, 30, 10], [15, 26, 36, 12]]) {
    f.fillStyle = 'rgba(15,28,22,.6)'; f.beginPath(); f.ellipse(x * T, y * T, rx, ry, 0, 0, 7); f.fill();
    f.strokeStyle = 'rgba(190,220,190,.18)'; f.lineWidth = 1; f.beginPath(); f.ellipse(x * T, y * T, rx * .7, ry * .5, 0, Math.PI * 1.1, Math.PI * 1.7); f.stroke();
  }
  // grilles d'évacuation
  for (const [x, y] of [[7, 4], [37, 4.5], [16, 20], [29, 10], [6, 26], [38, 26]]) {
    f.fillStyle = '#1b221d'; f.fillRect(x * T - 13, y * T - 8, 26, 16);
    f.fillStyle = '#56615a'; for (let i = 0; i < 6; i++) f.fillRect(x * T - 11 + i * 4.4, y * T - 7, 2, 14);
  }
  // margelles des canaux, mousse ; passerelles en caillebotis
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (wet(x, y)) {
      f.fillStyle = '#21423b'; f.fillRect(x * T, y * T, T, T);
      if (!wet(x, y - 1) && at(x, y - 1) === 0) { f.fillStyle = '#2b342e'; f.fillRect(x * T, y * T, T, 7); f.fillStyle = 'rgba(110,150,60,.45)'; f.fillRect(x * T, y * T + 7, T, 2); }
      if (!wet(x, y + 1) && at(x, y + 1) === 0) { f.fillStyle = '#5d6a60'; f.fillRect(x * T, y * T + T - 3, T, 3); }
      if (!wet(x - 1, y) && at(x - 1, y) === 0) { f.fillStyle = 'rgba(30,40,34,.8)'; f.fillRect(x * T, y * T, 4, T); }
      if (!wet(x + 1, y) && at(x + 1, y) === 0) { f.fillStyle = 'rgba(30,40,34,.8)'; f.fillRect(x * T + T - 4, y * T, 4, T); }
    } else if (bridge(x, y)) {
      f.fillStyle = '#2a312c'; f.fillRect(x * T, y * T, T, T);
      f.fillStyle = '#6d7378'; f.fillRect(x * T + 1, y * T + 1, T - 2, T - 2);
      f.fillStyle = 'rgba(0,0,0,.4)'; for (let k = 0; k < 7; k++) f.fillRect(x * T + 3 + k * 4.2, y * T + 2, 1.6, T - 4);
    }
  }
  // mur du fond : briques, tuyau horizontal, descentes, tags sans texte
  for (let r = 0; r * 6 < WALL_H; r++) for (let x = -(r & 1) * 6; x < W; x += 12) { const v = Math.random(); f.fillStyle = v < .4 ? '#4b3d33' : v < .8 ? '#43362d' : '#544437'; f.fillRect(x + 1, r * 6 + 1, 11, 5); }
  f.fillStyle = 'rgba(0,0,0,.25)'; f.fillRect(0, WALL_H - 4, W, 4);
  f.fillStyle = '#5f6b70'; f.fillRect(0, 8, W, 5); f.fillStyle = '#7b878c'; f.fillRect(0, 8, W, 1.5);
  for (const px of [6, 17, 27, 38]) { f.fillStyle = '#5f6b70'; f.fillRect(px * T, 8, 6, WALL_H - 8); f.fillStyle = '#3f4a4e'; f.fillRect(px * T + 4, 8, 2, WALL_H - 8); }
  f.lineWidth = 3; f.globalAlpha = .55;
  for (const [x, c] of [[12 * T, '#d0352c'], [29 * T, '#4fb2ff'], [34 * T, '#f2c230']]) { f.strokeStyle = c; f.beginPath(); f.moveTo(x, 30); f.quadraticCurveTo(x + 14, 14, x + 26, 28); f.quadraticCurveTo(x + 36, 36, x + 48, 20); f.stroke(); }
  f.globalAlpha = 1;
  // bordures ouest, est et sud : dessus du mur, sombre
  f.fillStyle = '#1d2420'; f.fillRect(0, WALL_H, T, H - WALL_H); f.fillRect(W - T, WALL_H, T, H - WALL_H); f.fillRect(0, H - T, W, T);
  f.fillStyle = '#2b3530'; f.fillRect(T - 3, WALL_H, 3, H - WALL_H - T); f.fillRect(W - T, WALL_H, 3, H - WALL_H - T); f.fillRect(T, H - T, W - 2 * T, 3);
  for (const [x, y, side] of MOUTHS) pipeMouth(f, x, y, side);
}

/* ---------- Objets ---------- */
function drawPillar(p) {
  const x = p.x, y = p.y, H = 30, W = 2 * T, D = 2 * T;
  ctx.fillStyle = '#3e3229'; ctx.fillRect(x, y + D - H, W, H);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { ctx.fillStyle = (r + c) & 1 ? '#4b3d33' : '#43362d'; ctx.fillRect(x + c * 11 - (r & 1) * 5 + 1, y + D - H + r * 6 + 1, 10, 5); }
  ctx.fillStyle = 'rgba(100,140,60,.65)'; ctx.fillRect(x, y + D - 6, W, 6); ctx.fillRect(x + 6, y + D - 12, 10, 6);
  ctx.fillStyle = '#6a5a4c'; ctx.fillRect(x, y - H, W, D);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) { ctx.fillStyle = (r * 3 + c) % 4 ? '#77665a' : '#5f5045'; ctx.fillRect(x + 2 + c * 12 + (r & 1) * 6, y - H + 2 + r * 8, 11, 7); }
  ctx.fillStyle = '#8c7a6c'; ctx.fillRect(x, y - H, W, 3); ctx.fillRect(x, y - H, 3, D);
  ctx.fillStyle = '#4a3e35'; ctx.fillRect(x + W - 3, y - H, 3, D); ctx.fillRect(x, y - H + D - 3, W, 3);
  ctx.fillStyle = 'rgba(110,160,60,.75)'; ctx.fillRect(x + 4, y - H + D - 8, 18, 5); ctx.fillRect(x + 40, y - H + 4, 14, 4); ctx.fillRect(x + 2, y - H + 20, 4, 14);
  ctx.fillStyle = '#2a2e2b'; ctx.fillRect(x + W / 2 - 6, y + D - H + 4, 12, 10);
  ctx.fillStyle = '#f2d77a'; ctx.fillRect(x + W / 2 - 4, y + D - H + 6, 8, 6);
  ctx.fillStyle = '#2a2e2b'; ctx.fillRect(x + W / 2 - 1, y + D - H + 6, 2, 6);
}
function drawCrate(c) {
  const x = c.x, y = c.y, h = 18;
  ctx.fillStyle = '#5c4f36'; ctx.fillRect(x + 1, y + T - h, T - 2, h);
  ctx.strokeStyle = '#3d3424'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 2.5, y + T - h + 1.5, T - 5, h - 3);
  ctx.beginPath(); ctx.moveTo(x + 3, y + T - 2); ctx.lineTo(x + T - 3, y + T - h + 2); ctx.stroke();
  ctx.fillStyle = '#7a6a4a'; ctx.fillRect(x + 1, y - h + 1, T - 2, T - 2);
  ctx.fillStyle = '#6c5d40'; for (let k = 1; k < 4; k++) ctx.fillRect(x + 1, y - h + 1 + k * 7.5, T - 2, 1.5);
  ctx.fillStyle = 'rgba(70,110,50,.7)'; ctx.fillRect(x + 1, y + T - 6, T - 2, 4); ctx.fillRect(x + 4, y - h + 3, 8, 5);
}
function drawDrum(d) {
  const cx = d.x + 16, base = d.y + T - 3;
  ctx.fillStyle = '#3f5a2a'; ctx.fillRect(cx - 10, base - 26, 20, 26);
  ctx.fillStyle = '#4f6e35'; ctx.beginPath(); ctx.ellipse(cx, base - 26, 10, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#2f4520'; ctx.fillRect(cx - 10, base - 19, 20, 2); ctx.fillRect(cx - 10, base - 8, 20, 2);
  ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.moveTo(cx, base - 17); ctx.lineTo(cx + 5, base - 9); ctx.lineTo(cx - 5, base - 9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1b1b1b'; ctx.fillRect(cx - .7, base - 15, 1.4, 3);
  ctx.fillStyle = '#9ed14a'; ctx.beginPath(); ctx.moveTo(cx + 6, base - 26); ctx.quadraticCurveTo(cx + 9, base - 16, cx + 7, base - 2); ctx.lineTo(cx + 4, base - 2); ctx.quadraticCurveTo(cx + 6, base - 16, cx + 3, base - 25); ctx.closePath(); ctx.fill();
}

// Repère piliers (blocs de 2 × 2), caisses et fûts (fûts dans les salles du nord et du sud) et cases d'eau.
export function prepare() {
  covered.fill(0); objects.length = 0; PILLARS.length = DRUMS.length = 0;
  const water = [];
  for (let i = 0; i < MW * MH; i++) {
    const x = i % MW, y = i / MW | 0;
    if (map[i] === 3) water.push(i);
    if (map[i] === 1 && (x === 0 || y === 0 || x === MW - 1 || y === MH - 1)) covered[i] = 1;
  }
  waterTiles = Int32Array.from(water);
  for (let ty = 1; ty < MH - 1; ty++) for (let tx = 1; tx < MW - 1; tx++) {
    const i = ty * MW + tx;
    if (covered[i] || (map[i] !== 1 && map[i] !== 2)) continue;
    const o = { x: tx * T, y: ty * T };
    if (map[i] === 1) {
      covered[i] = covered[i + 1] = covered[i + MW] = covered[i + MW + 1] = 1;
      PILLARS.push(o); objects.push({ k: o.y + 2 * T, x0: o.x - 4, x1: o.x + 2 * T + 4, draw: () => drawPillar(o) });
    } else if (ty < 7 || ty > MH - 8) {
      covered[i] = 1; DRUMS.push(o); objects.push({ k: o.y + T, x0: o.x - 4, x1: o.x + T + 4, draw: () => drawDrum(o) });
    } else {
      covered[i] = 1; objects.push({ k: o.y + T, x0: o.x - 4, x1: o.x + T + 4, draw: () => drawCrate(o) });
    }
  }
}

/* ---------- Eau animée, gouttes, poussière dans les rais de lumière ---------- */
const DROPS = 16, RIPPLES = 24, MOTES = 100;
const dx = new Float32Array(DROPS), dy = new Float32Array(DROPS), dz = new Float32Array(DROPS).fill(-1);
const rx = new Float32Array(RIPPLES), ry = new Float32Array(RIPPLES), rt = new Float32Array(RIPPLES).fill(-1);
const ma = new Float32Array(MOTES).map(() => Math.random() * 7), mr = new Float32Array(MOTES).map(() => Math.random()), mh = new Float32Array(MOTES).map(() => Math.random() * 160);
let waterT = -1, nextDrop = 0, nextRipple = 0;
// Avant les personnages : l'eau qui coule sur les cases visibles, les déchets, les ronds et les gouttes.
export function drawBack(time, ambiance, tx0, tx1, ty0, ty1) {
  const dt = waterT < 0 ? 0 : Math.max(0, Math.min(.05, time - waterT)); waterT = time;
  ctx.fillStyle = 'rgba(190,235,150,.38)';
  for (let n = 0; n < waterTiles.length; n++) {
    const i = waterTiles[n], x = i % MW, y = i / MW | 0;
    if (x < tx0 || x > tx1 || y < ty0 || y > ty1) continue;
    const east = flowsEast(x, y) && !(wet(x, y - 1) && wet(x, y + 1));
    for (let k = 0; k < 2; k++) {
      if (east) { const o = (time * 26 + x * 13 + k * 16 + y * 7) % T; ctx.fillRect(x * T + o - 6, y * T + 9 + k * 12, 10, 1.5); }
      else { const o = (time * 26 + y * 13 + k * 16 + x * 7) % T; ctx.fillRect(x * T + 9 + k * 12, y * T + o - 6, 1.5, 10); }
    }
  }
  if (!ambiance || !waterTiles.length) return;
  if (Math.random() < dt * 6) { const i = waterTiles[Math.random() * waterTiles.length | 0]; dx[nextDrop] = (i % MW) * T + Math.random() * T; dy[nextDrop] = (i / MW | 0) * T + Math.random() * T; dz[nextDrop] = 120; nextDrop = (nextDrop + 1) % DROPS; }
  ctx.fillStyle = 'rgba(200,225,200,.8)';
  for (let i = 0; i < DROPS; i++) {
    if (dz[i] < 0) continue;
    dz[i] -= 260 * dt;
    if (dz[i] <= 0) { rx[nextRipple] = dx[i]; ry[nextRipple] = dy[i]; rt[nextRipple] = 0; nextRipple = (nextRipple + 1) % RIPPLES; dz[i] = -1; continue; }
    ctx.fillRect(dx[i], dy[i] - dz[i], 1.5, 5);
  }
  ctx.strokeStyle = 'rgba(200,230,190,.5)'; ctx.lineWidth = 1;
  for (let i = 0; i < RIPPLES; i++) {
    if (rt[i] < 0) continue;
    rt[i] += dt; if (rt[i] > 1) { rt[i] = -1; continue; }
    ctx.globalAlpha = 1 - rt[i]; ctx.beginPath(); ctx.ellipse(rx[i], ry[i], 2 + rt[i] * 12, 1 + rt[i] * 5, 0, 0, 7); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
export function drawOver() {}
// Après la pénombre : rais de lumière et leur poussière, lampes, lueurs des fûts et des tuyaux.
export function drawLights(time) {
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(220,235,200,.06)';
  for (let i = 0; i < SHAFTS.length; i++) {
    const x = SHAFTS[i][0], y = SHAFTS[i][1];
    ctx.beginPath(); ctx.moveTo(x - 18, y - 260); ctx.lineTo(x + 18, y - 260); ctx.lineTo(x + 34, y); ctx.lineTo(x - 34, y); ctx.closePath(); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < SHAFTS.length; i++) glow(SHAFTS[i][0], SHAFTS[i][1], 70, '220,235,200', .32);
  ctx.fillStyle = 'rgba(230,240,210,.3)';
  for (let i = 0; i < MOTES; i++) {
    const s = SHAFTS[i % SHAFTS.length], h = (mh[i] + time * 8) % 160;
    ctx.fillRect(s[0] + Math.sin(ma[i] + time * .7) * (10 + mr[i] * 18), s[1] - h, 1.5, 1.5);
  }
  for (let i = 0; i < LAMPS.length; i++) {
    const x = LAMPS[i];
    ctx.fillStyle = '#2a2e2b'; ctx.fillRect(x - 6, 15, 12, 10); ctx.fillStyle = '#ffe6a0'; ctx.fillRect(x - 4, 17, 8, 6); ctx.fillStyle = '#2a2e2b'; ctx.fillRect(x - 1, 17, 2, 6);
    glow(x, 30, 90, '255,210,122', .3);
  }
  for (let i = 0; i < PILLARS.length; i++) glow(PILLARS[i].x + T, PILLARS[i].y + 2 * T - 21, 70, '255,210,122', .3);
  for (let i = 0; i < DRUMS.length; i++) glow(DRUMS[i].x + 16, DRUMS[i].y + 16, 40, '158,209,74', .25);
  for (let i = 0; i < MOUTHS.length; i++) glow(MOUTHS[i][0], MOUTHS[i][1] + (MOUTHS[i][2] === 'n' ? 18 : 0), 50, '158,209,74', .18);
}
