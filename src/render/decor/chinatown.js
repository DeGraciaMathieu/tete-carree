// Décor de Chinatown : rue de nuit sous la pluie. Façades et enseignes peintes une fois hors écran,
// objets du plan (taxis, étals, tables de mahjong, caisses) et réverbères triés avec les personnages,
// portique au-dessus de la horde, puis lumières posées après la teinte de nuit.
import { MH, MW, T } from '../../config.js';
import { glow } from '../ambiance.js';
import { ctx, outlined } from '../canvas.js';
import { map } from '../../state/arena.js';

export const NIGHT = '#6f7aa8';
export const RAIN = true;
const WW = MW * T, FH = 4 * T, GX = 22 * T; // FH : hauteur des façades, de la bordure au trottoir
const HAN = '900 12px "Noto Serif SC", "Songti SC", "SimSun", serif', HAN_GATE = '900 14px "Noto Serif SC", "Songti SC", "SimSun", serif';
const rgb = hex => { const n = parseInt(hex.slice(1), 16); return `${n >> 16},${n >> 8 & 255},${n & 255}`; };

// flaques qui reflètent les néons, bouche de vapeur, plaques d'égout (peinture au sol, sans effet sur le jeu)
const PUDDLES = [[9, 10.2, 58, 20, '#ff4057'], [29, 9.6, 44, 15, '#4fb2ff'], [15, 16.8, 50, 17, '#ff5fa8'], [34, 19.5, 40, 14, '#ffcf3f'], [24.5, 21.4, 46, 15, '#3fe0b0'], [5, 19, 36, 12, '#ff4057']]
  .map(([x, y, rx, ry, c]) => ({ x: x * T, y: y * T, rx, ry, rgb: rgb(c), ripple: `rgba(${rgb(c)},.28)` }));
const VENT_X = 17.5 * T, VENT_Y = 19.5 * T;
const MANHOLES = [[27.5 * T, 12.5 * T], [7.5 * T, 17.5 * T]];

// Dix boutiques : [début, fin] en cases, mur, moulure, enseigne, encre, néon, vitrine, néon vertical, canards laqués
const SHOPS = [
  [1, 5, '#5e2622', '#7c332c', '麵家', '#f2c230', '#ff4057', '#ffb86b', 1, 0],
  [5, 9, '#26403b', '#335750', '茶館', '#e9e2cf', '#3fe0b0', '#9ff0d0', 0, 0],
  [9, 13, '#4e4033', '#64523f', '藥房', '#f2c230', '#ffcf3f', '#ffe6a0', 1, 0],
  [13, 16, '#2c3142', '#3b425a', '書局', '#e9e2cf', '#4fb2ff', '#bfe2ff', 0, 0],
  [16, 19, '#5c331f', '#784128', '餅家', '#f2c230', '#ff7a2e', '#ffd09a', 0, 0],
  [25, 28, '#6a2833', '#873443', '福記', '#f2c230', '#ff5fa8', '#ffc49a', 0, 1],
  [28, 31, '#26403b', '#335750', '金行', '#f2c230', '#ffcf3f', '#ffe6a0', 0, 0],
  [31, 35, '#2c3142', '#3b425a', '龍宮', '#e9e2cf', '#4fb2ff', '#bfe2ff', 1, 0],
  [35, 39, '#5c331f', '#784128', '酒樓', '#f2c230', '#ff7a2e', '#ffd09a', 0, 0],
  [39, 43, '#4e2a3a', '#6a3850', '當鋪', '#e9e2cf', '#ff5fa8', '#ffc49a', 1, 0],
].map(([x0, x1, wall, trim, sign, ink, neon, glass, v, ducks]) => ({ x: x0 * T, w: (x1 - x0) * T, wall, trim, sign, ink, neon: rgb(neon), neonCss: neon, glass, glassRgb: rgb(glass), v, ducks, ph: 0, win: [], sx1: 0 }));
const NEONS = SHOPS.filter(s => s.v);

/* ---------- Sol ---------- */
function bricks(f, y0, h, a, b, c, mortar) {
  f.fillStyle = mortar; f.fillRect(T, y0, WW - 2 * T, h);
  for (let r = 0; r * 8 < h; r++) {
    const y = y0 + r * 8, off = (r & 1) * 8;
    for (let x = T - off; x < WW - T; x += 16) { const v = Math.random(); f.fillStyle = v < .33 ? a : v < .66 ? b : c; f.fillRect(Math.max(T, x + 1), y + 1, 15, 7); }
  }
}
export function paintGround(f, W, H) {
  f.fillStyle = '#22252d'; f.fillRect(0, 0, W, H);
  for (let k = 0; k < 9000; k++) { f.fillStyle = Math.random() < .5 ? 'rgba(0,0,0,.14)' : 'rgba(255,255,255,.04)'; f.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  // trottoirs de brique et bordures
  bricks(f, 4 * T, 2 * T, '#4b2826', '#552e2a', '#43221f', '#2b1817'); bricks(f, 24 * T, 2 * T, '#4b2826', '#552e2a', '#43221f', '#2b1817');
  f.fillStyle = '#5b606b'; f.fillRect(T, 6 * T - 4, W - 2 * T, 4); f.fillRect(T, 24 * T, W - 2 * T, 4);
  f.fillStyle = 'rgba(0,0,0,.35)'; f.fillRect(T, 6 * T, W - 2 * T, 3);
  // passages piétons devant le portique et la ruelle, ligne médiane
  f.fillStyle = 'rgba(225,222,210,.26)';
  for (let i = 0; i < 6; i++) { f.fillRect(19.7 * T + i * 22, 6 * T + 8, 12, 2 * T - 14); f.fillRect(19.7 * T + i * 22, 22 * T + 6, 12, 2 * T - 14); }
  f.fillStyle = 'rgba(242,194,48,.35)';
  for (let x = T + 8; x < W - T; x += 44) if (x < 19 * T || x > 25 * T) f.fillRect(x, 15 * T - 2, 24, 3);
  f.strokeStyle = 'rgba(0,0,0,.4)'; f.lineWidth = 1;
  for (let k = 0; k < 22; k++) {
    let x = T + Math.random() * (W - 2 * T), y = 6.5 * T + Math.random() * 17 * T;
    f.beginPath(); f.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (Math.random() * 2 - 1) * 18; y += (Math.random() * 2 - 1) * 18; f.lineTo(x, y); } f.stroke();
  }
  for (const [mx, my] of MANHOLES) {
    f.fillStyle = '#17191e'; f.beginPath(); f.ellipse(mx, my, 15, 10, 0, 0, 7); f.fill();
    f.fillStyle = '#30333b'; f.beginPath(); f.ellipse(mx, my, 13, 8.5, 0, 0, 7); f.fill();
    f.strokeStyle = 'rgba(0,0,0,.45)'; for (let i = -2; i <= 2; i++) { f.beginPath(); f.moveTo(mx + i * 4, my - 7); f.lineTo(mx + i * 4, my + 7); f.stroke(); }
  }
  f.fillStyle = '#121418'; f.fillRect(VENT_X - 14, VENT_Y - 7, 28, 14);
  f.fillStyle = '#3a3e47'; for (let i = 0; i < 6; i++) f.fillRect(VENT_X - 12 + i * 5, VENT_Y - 6, 2, 12);
  for (const p of PUDDLES) {
    f.fillStyle = 'rgba(10,12,18,.6)'; f.beginPath(); f.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, 7); f.fill();
    f.strokeStyle = 'rgba(170,180,200,.16)'; f.beginPath(); f.ellipse(p.x, p.y, p.rx, p.ry, 0, Math.PI * 1.1, Math.PI * 1.9); f.stroke();
  }
  // papiers de pétards
  for (let k = 0; k < 160; k++) {
    const c = [[22 * T, 7 * T], [12 * T, 12.5 * T], [32 * T, 17 * T]][k % 3];
    f.fillStyle = Math.random() < .5 ? 'rgba(200,36,40,.75)' : 'rgba(236,90,60,.7)';
    f.fillRect(c[0] + (Math.random() * 2 - 1) * 80, c[1] + (Math.random() * 2 - 1) * 30, 3, 2);
  }
  // mur de briques du sud vu de haut, ruelle sombre sur la porte
  bricks(f, 26 * T - 14, 4 * T + 14, '#3a201e', '#43251f', '#331b19', '#1d1110');
  f.fillStyle = '#22252d'; f.fillRect(20 * T, 26 * T - 14, 4 * T, 4 * T + 14);
  f.fillStyle = 'rgba(0,0,0,.45)'; f.fillRect(20 * T, 26 * T - 14, 4 * T, 4 * T + 14);
  f.fillStyle = '#5b2f2a'; f.fillRect(T, 26 * T - 14, 19 * T, 3); f.fillRect(24 * T, 26 * T - 14, 19 * T, 3);
  // ombre portée des façades
  const gr = f.createLinearGradient(0, FH, 0, FH + 24); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  f.fillStyle = gr; f.fillRect(0, FH, W, 24);
  // bords ouest et est : toits sombres, ouverts devant les portes
  f.fillStyle = '#0d0f14'; f.fillRect(0, 0, T, H); f.fillRect(W - T, 0, T, H);
  f.fillStyle = '#22252d'; f.fillRect(0, 14 * T, T, 2 * T); f.fillRect(W - T, 14 * T, T, 2 * T);
}

/* ---------- Façades (calques peints une fois) ---------- */
const facadeC = document.createElement('canvas'), glowC = document.createElement('canvas'), signC = document.createElement('canvas');
for (const c of [facadeC, glowC, signC]) { c.width = WW; c.height = FH; }
function paintFacades() {
  const g = facadeC.getContext('2d');
  g.clearRect(0, 0, WW, FH);
  // rue sombre derrière le portique
  const bg = g.createLinearGradient(0, 0, 0, FH); bg.addColorStop(0, '#06070a'); bg.addColorStop(1, '#171a22');
  g.fillStyle = bg; g.fillRect(19 * T, 0, 6 * T, FH);
  g.fillStyle = '#0d0f15'; g.fillRect(20 * T, 14, 34, 90); g.fillRect(20 * T + 44, 30, 30, 74); g.fillRect(24 * T - 44, 22, 44, 82);
  g.fillStyle = '#0d0f14'; g.fillRect(0, 0, T, FH); g.fillRect(WW - T, 0, T, FH);
  for (const s of SHOPS) {
    const { x, w } = s;
    g.fillStyle = s.wall; g.fillRect(x, 0, w, FH);
    g.fillStyle = s.trim; g.fillRect(x, 0, w, 5); g.fillRect(x, 33, w, 3); g.fillRect(x, 64, w, 3);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + w - 2, 0, 2, FH);
    for (const wn of s.win) for (const [wy, lit] of [[9, wn.lit], [40, wn.lit2]]) {
      g.fillStyle = lit ? '#e8b866' : '#141720'; g.fillRect(wn.x, wy, 14, 19);
      g.fillStyle = s.trim; g.fillRect(wn.x + 6, wy, 2, 19); g.fillRect(wn.x - 1, wy + 19, 16, 2);
      if (wn.ac && wy === 40) { g.fillStyle = '#9aa0a8'; g.fillRect(wn.x + 1, wy + 13, 12, 7); g.fillStyle = '#6c7179'; g.fillRect(wn.x + 3, wy + 15, 8, 1); g.fillRect(wn.x + 3, wy + 17, 8, 1); }
    }
    g.fillStyle = '#121318'; g.fillRect(x + 8, 68, s.sx1 - x - 8, 16);
    g.strokeStyle = s.ink; g.globalAlpha = .7; g.lineWidth = 1; g.strokeRect(x + 8.5, 68.5, s.sx1 - x - 9, 15); g.globalAlpha = 1;
    for (let ax = x + 4, i = 0; ax < x + w - 4; ax += 8, i++) {
      g.fillStyle = i & 1 ? s.trim : '#d9cfb8'; g.fillRect(ax, 87, Math.min(8, x + w - 4 - ax), 8);
      g.beginPath(); g.arc(ax + 4, 95, 4, 0, Math.PI); g.fill();
    }
    g.fillStyle = s.glass; g.globalAlpha = .55; g.fillRect(x + 6, 100, w - 12, 22); g.globalAlpha = 1;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 6, 110, w - 12, 2); g.fillRect(x + 6, 118, w - 12, 2);
    g.fillStyle = s.trim; for (let mx = x + 6; mx < x + w - 6; mx += 22) g.fillRect(mx, 100, 2, 22);
    const dx = x + (w >> 1) - 8; g.fillStyle = '#121318'; g.fillRect(dx, 98, 16, 30);
    g.fillStyle = s.glass; g.globalAlpha = .3; g.fillRect(dx + 3, 101, 10, 10); g.globalAlpha = 1;
    if (s.ducks) for (let k = 0; k < 4; k++) {
      const kx = x + 12 + k * 9 + (k > 1 ? 26 : 0);
      g.fillStyle = '#2a2a2a'; g.fillRect(kx, 100, 1, 3);
      g.fillStyle = '#9b4318'; g.beginPath(); g.ellipse(kx, 108, 3.5, 6, 0, 0, 7); g.fill();
      g.fillStyle = '#d0702f'; g.fillRect(kx - 1, 104, 2, 6);
    }
    g.fillStyle = '#16171c'; g.fillRect(x, FH - 6, w, 6);
    if (s.v) { g.fillStyle = '#101116'; g.fillRect(x + w - 24, 6, 16, 56); }
  }
  // piliers du portique
  for (const px of [19 * T + 6, 24 * T + 6]) {
    g.fillStyle = '#7d7f84'; g.fillRect(px - 3, FH - 12, 26, 12);
    g.fillStyle = '#a82329'; g.fillRect(px, 30, 20, FH - 42);
    g.fillStyle = '#c8433c'; g.fillRect(px + 3, 30, 4, FH - 42);
    g.fillStyle = '#f2c230'; g.fillRect(px, 70, 20, 3); g.fillRect(px, FH - 30, 20, 3);
  }
}
// Ce qui éclaire, posé après la nuit : halos des vitrines et fenêtres (« lighter »), enseignes (par-dessus).
function paintLights() {
  const g = glowC.getContext('2d'), t = signC.getContext('2d');
  g.clearRect(0, 0, WW, FH); t.clearRect(0, 0, WW, FH);
  for (const s of SHOPS) {
    const { x, w } = s;
    g.fillStyle = `rgba(${s.glassRgb},.2)`; g.fillRect(x + 6, 100, w - 12, 22);
    for (const wn of s.win) { g.fillStyle = 'rgba(255,200,120,.22)'; if (wn.lit) g.fillRect(wn.x, 9, 14, 19); if (wn.lit2) g.fillRect(wn.x, 40, 14, 19); }
    t.fillStyle = s.ink; t.font = HAN; t.textAlign = 'center'; t.textBaseline = 'middle';
    t.fillText(s.sign.split('').join(' '), (x + 8 + s.sx1) / 2, 76.5);
  }
  t.fillStyle = '#7a1414'; t.font = HAN_GATE; t.fillText('唐 人 街', GX, 42.5);
}
let fontsAsked = false;
function paintLayers() {
  paintFacades(); paintLights();
  // les enseignes attendent la police chinoise : repeintes une fois chargée
  if (!fontsAsked && document.fonts) { fontsAsked = true; document.fonts.load(HAN).then(paintLights, () => {}); }
}

/* ---------- Objets du plan, triés avec les personnages ---------- */
const STALL_CLOTH = ['#7a2a24', '#2f4a6b', '#2f5a45', '#7a2a24'], GOODS = [['#f39a2b', '#7fbf4f'], ['#e8d9a0', '#d6312c'], ['#f39a2b', '#f2c230'], ['#7fbf4f', '#e8513a']];
function drawStall(tx, ty, k) {
  const x = tx * T, y = ty * T, w = 2 * T, h = 16, goods = GOODS[k % 4];
  ctx.fillStyle = '#2b2b2b'; ctx.fillRect(x + 4, y - 52, 2, 40); ctx.fillRect(x + w - 6, y - 52, 2, 40);
  ctx.fillStyle = '#6f4e2c'; ctx.fillRect(x + 2, y - h, w - 4, T - 2);
  ctx.fillStyle = STALL_CLOTH[k % 4]; ctx.fillRect(x + 2, y + T - h, w - 4, h);
  ctx.fillStyle = '#f2c230'; ctx.fillRect(x + 2, y + T - h, w - 4, 2);
  ctx.fillStyle = '#b98c55'; ctx.fillRect(x + 6, y - 12, 24, 18); ctx.fillRect(x + 34, y - 12, 24, 18);
  ctx.fillStyle = '#7d5a31'; ctx.fillRect(x + 6, y + 2, 24, 4); ctx.fillRect(x + 34, y + 2, 24, 4);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    ctx.fillStyle = goods[0]; ctx.beginPath(); ctx.arc(x + 11 + i * 7, y - 7 + j * 6, 3.4, 0, 7); ctx.fill();
    ctx.fillStyle = goods[1]; ctx.beginPath(); ctx.arc(x + 39 + i * 7, y - 7 + j * 6, 3.4, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#2b2b2b'; ctx.fillRect(x + 4, y - 12, 2, T + 10); ctx.fillRect(x + w - 6, y - 12, 2, T + 10);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i & 1 ? '#efe6d2' : '#c9302c'; ctx.fillRect(x + i * 8, y - 62, 8, 12);
    ctx.beginPath(); ctx.arc(x + i * 8 + 4, y - 50, 4, 0, Math.PI); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y - 62, w, 3);
}
function stool(sx, sy, c) {
  ctx.fillStyle = '#7a1d1a'; ctx.fillRect(sx - 4, sy - 6, 2, 7); ctx.fillRect(sx + 2, sy - 6, 2, 7);
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(sx, sy - 7, 6, 3.5, 0, 0, 7); ctx.fill();
}
function drawMahjong(tx, ty) {
  const x = tx * T, y = ty * T;
  stool(x - 6, y + 10, '#c9302c'); stool(x + T + 6, y + 12, '#2f6fb3'); stool(x + T / 2, y + T + 4, '#c9302c');
  ctx.fillStyle = '#3d2a18'; ctx.fillRect(x + 4, y + 8, 3, 18); ctx.fillRect(x + T - 7, y + 8, 3, 18);
  ctx.fillStyle = '#5a3d22'; ctx.fillRect(x, y + 4, T, 5);
  ctx.fillStyle = '#2a6b50'; ctx.fillRect(x, y - 22, T, 26);
  ctx.fillStyle = '#6f4e2c'; ctx.fillRect(x, y - 22, T, 2); ctx.fillRect(x, y + 2, T, 2);
  ctx.fillStyle = '#efe9da';
  for (let k = 0; k < 5; k++) { ctx.fillRect(x + 4 + k * 5, y - 18, 4, 3); ctx.fillRect(x + 4 + k * 5, y - 3, 4, 3); }
  for (let k = 0; k < 3; k++) { ctx.fillRect(x + 3, y - 13 + k * 4, 3, 3); ctx.fillRect(x + T - 6, y - 13 + k * 4, 3, 3); }
}
function drawCrate(tx, ty) {
  const x = tx * T, y = ty * T, h = 18;
  ctx.fillStyle = '#7d5a34'; ctx.fillRect(x + 1, y + T - h, T - 2, h);
  ctx.strokeStyle = '#5a3f22'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 2.5, y + T - h + 1.5, T - 5, h - 3);
  ctx.beginPath(); ctx.moveTo(x + 3, y + T - 2); ctx.lineTo(x + T - 3, y + T - h + 2); ctx.stroke();
  ctx.fillStyle = '#a17a4a'; ctx.fillRect(x + 1, y - h + 1, T - 2, T - 2);
  ctx.fillStyle = '#8d6a3e'; for (let k = 1; k < 4; k++) ctx.fillRect(x + 1, y - h + 1 + k * 7.5, T - 2, 1.5);
  ctx.strokeStyle = '#6a4d2c'; ctx.strokeRect(x + 1.5, y - h + 1.5, T - 3, T - 3);
}
function drawTaxi(tx, ty, k) {
  const x = tx * T, y = ty * T, w = 3 * T, red = k % 2 === 0;
  ctx.fillStyle = 'rgba(10,12,18,.45)'; ctx.fillRect(x + 4, y + T - 6, w - 8, 8);
  ctx.fillStyle = '#141518'; ctx.fillRect(x + 8, y + T - 12, 16, 12); ctx.fillRect(x + w - 24, y + T - 12, 16, 12);
  ctx.fillStyle = red ? '#7e1f1b' : '#9c998f'; ctx.fillRect(x + 2, y + 2, w - 4, T - 10);
  ctx.fillStyle = red ? '#b5302a' : '#d9d6cc'; ctx.fillRect(x + 2, y - 14, w - 4, 18);
  ctx.fillStyle = red ? '#c9c4b8' : '#e9e6dc'; ctx.fillRect(x + 22, y - 30, w - 44, 18);
  ctx.fillStyle = '#1d2533'; ctx.fillRect(x + 16, y - 14, w - 32, 7);
  ctx.fillStyle = '#2b3a52'; ctx.fillRect(x + 24, y - 28, w - 48, 4);
  ctx.fillStyle = red ? '#f2c230' : '#3fa0e0'; ctx.fillRect(x + w / 2 - 9, y - 35, 18, 5);
  ctx.fillStyle = '#e8e0c8'; ctx.fillRect(x + 3, y + 4, 6, 4); ctx.fillRect(x + w - 9, y + 4, 6, 4);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x + w / 2 - 1, y + 2, 2, T - 12);
}
// réverbères sur les deux trottoirs : décor seul, la horde passe au travers
const POSTS = [];
for (const px of [3.5, 12.5, 31.5, 40.5]) { POSTS.push({ x: px * T, y: 5.8 * T }); POSTS.push({ x: px * T, y: 25.6 * T }); }
function drawPost(p) {
  ctx.fillStyle = '#1f3a33'; ctx.fillRect(p.x - 2, p.y - 84, 4, 84); ctx.fillRect(p.x - 5, p.y - 8, 10, 8);
  ctx.fillStyle = '#e8c36a'; ctx.fillRect(p.x - 5, p.y - 96, 10, 12);
  ctx.fillStyle = '#2a6b50'; ctx.beginPath(); ctx.moveTo(p.x - 10, p.y - 95); ctx.quadraticCurveTo(p.x, p.y - 106, p.x + 10, p.y - 95); ctx.closePath(); ctx.fill();
}
function drawGateTop() {
  ctx.fillStyle = '#a82329'; ctx.fillRect(GX - 100, 52, 200, 12);
  ctx.fillStyle = '#f2c230'; ctx.fillRect(GX - 100, 52, 200, 2); ctx.fillRect(GX - 40, 32, 80, 20);
  ctx.fillStyle = '#2a6b50';
  ctx.beginPath(); ctx.moveTo(GX - 118, 4); ctx.quadraticCurveTo(GX - 104, 18, GX - 90, 28); ctx.lineTo(GX + 90, 28);
  ctx.quadraticCurveTo(GX + 104, 18, GX + 118, 4); ctx.lineTo(GX + 92, 13); ctx.lineTo(GX - 92, 13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.22)'; for (let k = -84; k < 84; k += 7) ctx.fillRect(GX + k, 14, 2, 13);
  ctx.fillStyle = '#f2c230'; ctx.fillRect(GX - 92, 11, 184, 2);
}

// Cases dessinées par ce décor (le rendu générique des tuiles les saute) et objets triés en profondeur.
export const covered = new Uint8Array(MW * MH);
export const objects = [];

/* ---------- Lampions : guirlandes le long des trottoirs, entre les réverbères et le portique ---------- */
// Aucune guirlande au-dessus de la chaussée : au cadrage du jeu, ses lampions couvraient la horde.
const STRINGS = [], LANTERNS = [];
const SEG = 24;
function stringsFrom() {
  const top = i => [POSTS[i].x, POSTS[i].y - 92];
  // POSTS : nord aux index pairs, sud aux impairs, d'ouest en est
  const n = [0, 2, 4, 6].map(top), s = [1, 3, 5, 7].map(top);
  const defs = [
    [...n[0], ...n[1], 22], [...n[1], GX - 100, 58, 30], [GX + 100, 58, ...n[2], 30], [...n[2], ...n[3], 22],
    [...s[0], ...s[1], 22], [...s[1], ...s[2], 46], [...s[2], ...s[3], 22],
  ];
  const at = (d, u) => [d[0] + (d[2] - d[0]) * u, d[1] + (d[3] - d[1]) * u + d[4] * 4 * u * (1 - u)];
  STRINGS.length = 0; LANTERNS.length = 0;
  LANTERNS.push({ x: GX - 66, y: 62, k: 1.3, rgb: '224,53,63', col: '#e0353f', ph: 1 }, { x: GX + 66, y: 62, k: 1.3, rgb: '224,53,63', col: '#e0353f', ph: 2 });
  defs.forEach((d, di) => {
    const pts = new Float32Array((SEG + 1) * 2);
    for (let i = 0; i <= SEG; i++) { const p = at(d, i / SEG); pts[2 * i] = p[0]; pts[2 * i + 1] = p[1]; }
    STRINGS.push(pts);
    const n = Math.max(3, Math.round(Math.hypot(d[2] - d[0], d[3] - d[1]) / 58));
    for (let i = 1; i < n; i++) {
      const p = at(d, i / n), gold = (i + di) % 4 === 0;
      LANTERNS.push({ x: p[0], y: p[1], k: 1, rgb: gold ? '242,161,58' : '224,53,63', col: gold ? '#f2a13a' : '#e0353f', ph: di * 3 + i });
    }
  });
}

// Appelé une fois l'arène construite : repère les objets du plan, prépare façades, lumières et guirlandes.
export function prepare() {
  covered.fill(0); objects.length = 0;
  for (let i = 0; i < MW * MH; i++) {
    const x = i % MW, y = i / MW | 0;
    if (map[i] === 1 && (y <= 3 || y >= 26 || x === 0 || x === MW - 1)) covered[i] = 1; // façades, mur du sud, bords
  }
  let taxis = 0, stalls = 0;
  for (let ty = 4; ty < 26; ty++) for (let tx = 1; tx < MW - 1; tx++) {
    const i = ty * MW + tx, v = map[i];
    if (!v || covered[i]) continue;
    const base = { k: (ty + 1) * T, x0: tx * T - 8, x1: tx * T + T + 8, draw: null };
    if (v === 1 && map[i + 1] === 1 && map[i + 2] === 1) {
      covered[i] = covered[i + 1] = covered[i + 2] = 1; const k = taxis++;
      base.x1 += 2 * T; base.draw = () => drawTaxi(tx, ty, k);
    } else if (v === 2 && map[i - MW] !== 2 && map[i + MW] !== 2 && map[i + 1] === 2 && !covered[i + 1]) {
      covered[i] = covered[i + 1] = 1; const k = stalls++;
      base.x1 += T; base.draw = () => drawStall(tx, ty, k);
    } else if (v === 2 && map[i - MW] !== 2 && map[i + MW] !== 2 && map[i - 1] !== 2) {
      covered[i] = 1; base.x0 -= 16; base.x1 += 16; base.draw = () => drawMahjong(tx, ty);
    } else if (v === 2) {
      covered[i] = 1; base.draw = () => drawCrate(tx, ty);
    } else continue;
    objects.push(base);
  }
  for (const p of POSTS) objects.push({ k: p.y, x0: p.x - 12, x1: p.x + 12, draw: () => drawPost(p) });
  for (const s of SHOPS) {
    s.ph = Math.random() * 100; s.win.length = 0;
    for (let wx = s.x + 10; wx + 14 < s.x + s.w - (s.v ? 24 : 6); wx += 26) s.win.push({ x: wx, lit: Math.random() < .55, lit2: Math.random() < .45, ac: Math.random() < .3 });
    s.sx1 = s.x + s.w - (s.v ? 30 : 8);
  }
  stringsFrom();
  paintLayers();
}

/* ---------- Image ---------- */
const STEAM = 24, smx = new Float32Array(STEAM), smy = new Float32Array(STEAM), smt = new Float32Array(STEAM).fill(-1), sml = new Float32Array(STEAM);
let steamT = -1, steamNext = 0, steamAcc = 0;
// Avant les personnages : façades et vapeur de la bouche d'égout (la vapeur suit S.time).
export function drawBack(time, ambiance) {
  ctx.drawImage(facadeC, 0, 0);
  if (!ambiance) return;
  const dt = steamT < 0 ? 0 : Math.max(0, Math.min(.05, time - steamT)); steamT = time; steamAcc += dt;
  if (steamAcc > .12) { steamAcc = 0; smx[steamNext] = VENT_X + (Math.random() * 2 - 1) * 8; smy[steamNext] = VENT_Y; smt[steamNext] = 0; sml[steamNext] = 1.6 + Math.random(); steamNext = (steamNext + 1) % STEAM; }
  for (let i = 0; i < STEAM; i++) {
    if (smt[i] < 0) continue;
    smt[i] += dt; smy[i] -= 20 * dt; smx[i] += Math.sin(time * 2 + i) * 6 * dt;
    if (smt[i] > sml[i]) { smt[i] = -1; continue; }
    const a = 1 - smt[i] / sml[i], r = 6 + smt[i] * 10;
    ctx.globalAlpha = .22 * a; ctx.fillStyle = '#d7deeb';
    ctx.beginPath(); ctx.ellipse(smx[i], smy[i] - smt[i] * 10, r, r * .7, 0, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
// Après les personnages : le portique, sous lequel passe la horde.
export function drawOver() { outlined(null, drawGateTop); }
function neonOn(ph, time) { return Math.sin(time * 37 + ph) > .9 && Math.sin(time * 1.3 + ph) > .5 ? .25 : 1; }
// Après la nuit : tout ce qui éclaire.
export function drawLights(time) {
  // reflets de néon dans les flaques
  for (let i = 0; i < PUDDLES.length; i++) {
    const p = PUDDLES[i];
    ctx.save(); ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, 7); ctx.clip();
    glow(p.x, p.y, p.rx, p.rgb, .32);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = p.ripple;
    for (let k = 0; k < 3; k++) ctx.fillRect(p.x - p.rx * .6 + Math.sin(time * 2 + k * 2) * 6, p.y - p.ry * .5 + k * p.ry * .4, p.rx * 1.2, 1);
    ctx.restore();
  }
  // vitrines, fenêtres, enseignes, lumière des vitrines sur le trottoir
  ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowC, 0, 0); ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < SHOPS.length; i++) { const s = SHOPS[i]; glow(s.x + s.w / 2, FH + 6, s.w * .5, s.glassRgb, .22); }
  ctx.drawImage(signC, 0, 0);
  ctx.font = HAN; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < NEONS.length; i++) {
    const s = NEONS[i], b = neonOn(s.ph, time), nx = s.x + s.w - 24;
    ctx.globalAlpha = b; ctx.strokeStyle = s.neonCss; ctx.fillStyle = s.neonCss; ctx.lineWidth = 1.5;
    ctx.strokeRect(nx + 1.5, 7.5, 13, 53); ctx.fillText(s.sign[0], nx + 8, 22); ctx.fillText(s.sign[1], nx + 8, 44);
    ctx.globalAlpha = 1; glow(nx + 8, 34, 60, s.neon, .45 * b);
  }
  // réverbères
  for (let i = 0; i < POSTS.length; i++) {
    const p = POSTS[i];
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(p.x - 4, p.y - 95, 8, 10);
    glow(p.x, p.y - 90, 74, '255,200,100', .35); glow(p.x, p.y, 60, '255,200,100', .12);
  }
  // guirlandes et lampions
  ctx.strokeStyle = 'rgba(28,20,18,.9)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let s = 0; s < STRINGS.length; s++) { const p = STRINGS[s]; ctx.moveTo(p[0], p[1]); for (let i = 1; i <= SEG; i++) ctx.lineTo(p[2 * i], p[2 * i + 1]); }
  ctx.stroke();
  for (let i = 0; i < LANTERNS.length; i++) {
    const l = LANTERNS[i];
    ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(Math.sin(time * 1.7 + l.ph) * .12); ctx.scale(l.k, l.k);
    ctx.fillStyle = '#2a1a12'; ctx.fillRect(-.5, 0, 1, 5);
    ctx.fillStyle = '#c99a2a'; ctx.fillRect(-4, 4, 8, 2); ctx.fillRect(-4, 21, 8, 2);
    ctx.fillStyle = l.col; ctx.beginPath(); ctx.ellipse(0, 13.5, 8, 8.5, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 13.5, 4, 8.5, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,230,170,.45)'; ctx.beginPath(); ctx.ellipse(-2.5, 11, 2, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#c99a2a'; ctx.fillRect(-.5, 23, 1, 7);
    ctx.restore();
    glow(l.x, l.y + 13 * l.k, 34 * l.k, l.rgb, .3);
  }
}
