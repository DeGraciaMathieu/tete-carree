// Décor du Camp de Sibérie : un camp de prisonniers dans le blizzard. Sol enneigé, palissade et barbelés peints
// une fois ; baraquements, miradors, braseros, bûches, mât et bonhomme de neige triés avec les personnages ;
// portail au-dessus de la horde ; flammes, fumées et inscriptions après le voile de neige.
import { MH, MW, T } from '../../config.js';
import { glow } from '../ambiance.js';
import { ctx, outlined } from '../canvas.js';
import { map } from '../../state/arena.js';

export const NIGHT = null, FOG = 'rgba(225,232,240,.22)', WEATHER = 'snow', VIGNETTE = 'rgba(255,255,255,.25)';
const WW = MW * T, WH = MH * T, GX = 22 * T, BH = 34; // BH : hauteur de la façade d'un baraquement
const CYR = '7px "Russo One", "Arial Black", sans-serif', CYR_GATE = '10px "Russo One", "Arial Black", sans-serif';

// Objets reconnus dans le plan par prepare()
export const covered = new Uint8Array(MW * MH);
export const objects = [];
const BARRACKS = [], TOWERS = [], BRAZIERS = [], LOGS = [];
const FLAG_X = 21.5 * T, FLAG_Y = 12.2 * T, SNOWMAN_X = 35.5 * T, SNOWMAN_Y = 13.4 * T;

/* ---------- Sol enneigé ---------- */
function trail(f, x0, y0, x1, y1, w, col) {
  f.strokeStyle = col; f.lineWidth = w; f.lineCap = 'round'; f.beginPath(); f.moveTo(x0, y0);
  for (let i = 1; i <= 10; i++) f.lineTo(x0 + (x1 - x0) * i / 10 + (Math.random() * 2 - 1) * 6, y0 + (y1 - y0) * i / 10 + (Math.random() * 2 - 1) * 6);
  f.stroke();
}
function footprints(f, x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0), n = d / 10 | 0;
  f.fillStyle = 'rgba(120,140,170,.35)';
  for (let i = 0; i < n; i++) { const s = i & 1 ? 3.5 : -3.5; f.beginPath(); f.ellipse(x0 + Math.cos(a) * i * 10 - Math.sin(a) * s, y0 + Math.sin(a) * i * 10 + Math.cos(a) * s, 3, 2, a, 0, 7); f.fill(); }
}
function wireTile(f, tx, ty) {
  const x = tx * T, y = ty * T, vert = map[(ty - 1) * MW + tx] === 3 || map[(ty + 1) * MW + tx] === 3;
  f.fillStyle = 'rgba(90,110,140,.18)'; f.fillRect(x, y + 20, T, 8);
  f.strokeStyle = '#3a3f45'; f.lineWidth = 1.1;
  if (vert) for (let k = 0; k < 4; k++) { f.beginPath(); f.ellipse(x + 16, y + 4 + k * 8, 9, 6, 0, 0, 7); f.stroke(); }
  else {
    for (let k = 0; k < 4; k++) { f.beginPath(); f.ellipse(x + 4 + k * 8, y + 14, 6, 9, 0, 0, 7); f.stroke(); }
    f.beginPath(); f.moveTo(x, y + 8); f.lineTo(x + T, y + 8); f.moveTo(x, y + 20); f.lineTo(x + T, y + 20); f.stroke();
  }
  if ((tx + ty) & 1) { f.fillStyle = '#4b392a'; f.fillRect(x + 14, y - 6, 4, 30); f.fillStyle = '#fff'; f.fillRect(x + 13, y - 8, 6, 3); }
}
// Palissade de bordure : vue de face au nord et au sud, de dessus à l'ouest et à l'est, ouverte sur les portes.
function fence(f) {
  for (let x = 0; x < WW; x += 8) {
    if (x >= 21 * T && x < 23 * T) continue;
    const h = 28 + ((x / 8) % 3) * 2, wood = (x / 8) & 1 ? '#5b4634' : '#4f3d2d';
    f.fillStyle = wood; f.fillRect(x, T - h + 4, 8, h); f.fillStyle = '#eef3f6'; f.fillRect(x, T - h + 4, 8, 3);
    f.fillStyle = wood; f.fillRect(x, WH - T + 2, 8, T - 2); f.fillStyle = '#eef3f6'; f.fillRect(x, WH - T + 2, 8, 4);
  }
  f.strokeStyle = '#2a2e33'; f.lineWidth = 1; f.beginPath();
  for (let k = 0; k < 2; k++) { f.moveTo(0, k * 5 + 2); f.lineTo(21 * T, k * 5 + 2); f.moveTo(23 * T, k * 5 + 2); f.lineTo(WW, k * 5 + 2); }
  f.stroke();
  for (const x0 of [0, WW - T]) for (let y = 0; y < WH; y += 8) {
    if (y >= 14 * T && y < 16 * T) continue;
    f.fillStyle = (y / 8) & 1 ? '#5b4634' : '#4f3d2d'; f.fillRect(x0 + 8, y, 16, 8);
    f.fillStyle = '#eef3f6'; f.fillRect(x0 + 8, y, 16, 2);
  }
}
export function paintGround(f, W, H) {
  const base = f.createLinearGradient(0, 0, W, H); base.addColorStop(0, '#e6ecf2'); base.addColorStop(1, '#d9e1ea');
  f.fillStyle = base; f.fillRect(0, 0, W, H);
  for (let k = 0; k < 7000; k++) { f.fillStyle = Math.random() < .5 ? 'rgba(90,120,160,.06)' : 'rgba(255,255,255,.6)'; f.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  // chemins de neige tassée et de gadoue, des portes à la place d'appel
  const slush = 'rgba(150,160,170,.32)', packed = 'rgba(190,200,212,.55)';
  trail(f, GX, 0, GX, H, 64, packed); trail(f, 0, 15 * T, W, 15 * T, 60, packed);
  trail(f, GX, 0, GX, 9 * T, 26, slush); trail(f, GX, 21 * T, GX, H, 26, slush);
  trail(f, 0, 15 * T, 12 * T, 15 * T, 24, slush); trail(f, 32 * T, 15 * T, W, 15 * T, 24, slush);
  // place d'appel : neige damée, marquage
  f.fillStyle = 'rgba(170,180,192,.35)'; f.fillRect(13 * T, 10 * T, 18 * T, 10 * T);
  f.strokeStyle = 'rgba(120,130,145,.25)'; f.lineWidth = 2; f.setLineDash([10, 8]); f.strokeRect(14 * T, 11 * T, 16 * T, 8 * T); f.setLineDash([]);
  // traces de chenilles depuis le portail du nord
  for (const off of [-22, 22]) {
    f.strokeStyle = 'rgba(110,120,135,.3)'; f.lineWidth = 10; f.beginPath(); f.moveTo(GX + off, 0); f.bezierCurveTo(GX + off, 5 * T, 20 * T + off, 7 * T, 16 * T + off, 8.5 * T); f.stroke();
    f.strokeStyle = 'rgba(80,90,105,.25)'; f.lineWidth = 1; for (let y = 4; y < 8 * T; y += 7) { f.beginPath(); f.moveTo(GX + off - 5, y); f.lineTo(GX + off + 5, y); f.stroke(); }
  }
  footprints(f, 4 * T, 15 * T, 12 * T, 13 * T); footprints(f, 30 * T, 21 * T, 38 * T, 25 * T); footprints(f, 18 * T, 6.5 * T, 26 * T, 6.6 * T);
  footprints(f, 9 * T, 23.5 * T, 6 * T, 18 * T); footprints(f, 33 * T, 6.5 * T, 38 * T, 7.5 * T);
  // flaques gelées
  for (const [x, y, rx, ry] of [[8 * T, 16.5 * T, 34, 12], [36 * T, 13.4 * T, 28, 10], [25 * T, 23 * T, 40, 13], [19 * T, 7 * T, 26, 9]]) {
    f.fillStyle = 'rgba(160,205,240,.55)'; f.beginPath(); f.ellipse(x, y, rx, ry, 0, 0, 7); f.fill();
    f.strokeStyle = 'rgba(255,255,255,.85)'; f.lineWidth = 1.5; f.beginPath(); f.ellipse(x, y, rx * .7, ry * .5, 0, Math.PI * 1.1, Math.PI * 1.6); f.stroke();
    f.strokeStyle = 'rgba(90,140,180,.35)'; f.lineWidth = 1; f.beginPath(); f.moveTo(x - rx * .5, y); f.lineTo(x + rx * .2, y + ry * .3); f.lineTo(x + rx * .6, y - ry * .2); f.stroke();
  }
  // neige fondue sous les braseros, ombres bleues au pied des bâtiments
  for (const b of BRAZIERS) { f.fillStyle = 'rgba(90,85,80,.35)'; f.beginPath(); f.ellipse(b.x + 16, b.y + 26, 30, 14, 0, 0, 7); f.fill(); }
  f.fillStyle = 'rgba(90,120,170,.22)';
  for (const b of BARRACKS) f.fillRect(b.x, b.y + b.d, b.w, 14);
  for (const t of TOWERS) f.fillRect(t.x + 2, t.y + 2 * T - 8, 2 * T - 4, 10);
  for (let i = 0; i < MW * MH; i++) if (map[i] === 3) wireTile(f, i % MW, i / MW | 0);
  // congères au pied de la palissade
  f.fillStyle = 'rgba(255,255,255,.85)';
  for (let x = T; x < W - T; x += 18) {
    f.beginPath(); f.ellipse(x + Math.random() * 8, T + 6, 14 + Math.random() * 8, 6, 0, 0, 7); f.fill();
    f.beginPath(); f.ellipse(x + Math.random() * 8, H - T - 4, 14 + Math.random() * 8, 6, 0, 0, 7); f.fill();
  }
  fence(f);
}

/* ---------- Objets ---------- */
function drawBarrack(b) {
  const { x, y, w: W, d: D, side } = b, fy = y + D - BH;
  ctx.fillStyle = '#5b4634'; ctx.fillRect(x, fy, W, BH);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let r = 0; r < 6; r++) ctx.fillRect(x, fy + 4 + r * 5, W, 1);
  const doorX = x + W / 2 - 9;
  for (let i = 0; i < b.win.length; i++) {
    const wx = b.win[i];
    ctx.fillStyle = '#2b2018'; ctx.fillRect(wx - 1, fy + 8, 16, 14);
    ctx.fillStyle = b.lit[i] ? '#e8b866' : '#1a1f28'; ctx.fillRect(wx, fy + 9, 14, 12);
    ctx.fillStyle = '#2b2018'; ctx.fillRect(wx + 6, fy + 9, 2, 12);
    ctx.fillStyle = '#eef3f6'; ctx.fillRect(wx - 2, fy + 21, 18, 2);
  }
  ctx.fillStyle = '#3a2c20'; ctx.fillRect(doorX, fy + 6, 18, BH - 6);
  ctx.fillStyle = '#7d8590'; ctx.fillRect(doorX + 13, fy + 18, 3, 3);
  ctx.fillStyle = '#4b392a'; ctx.fillRect(doorX - 4, fy + BH - 4, 26, 4);
  // toit enneigé vu de dessus : faîtage, avant-toit, stalactites
  const rt = y - BH;
  ctx.fillStyle = '#e9eff4'; ctx.fillRect(x - 3, rt, W + 6, D);
  ctx.fillStyle = '#d6e0ea';
  if (side) ctx.fillRect(x + W / 2 - 1, rt, W / 2 + 4, D); else ctx.fillRect(x - 3, rt + D / 2, W + 6, D / 2);
  ctx.fillStyle = 'rgba(120,150,190,.35)';
  if (side) ctx.fillRect(x + W / 2 - 2, rt, 3, D); else ctx.fillRect(x - 3, rt + D / 2 - 1, W + 6, 3);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 4, rt + D - 4, W + 8, 5);
  ctx.fillStyle = '#cfe6f7';
  for (let ix = x; ix < x + W; ix += 7) { const l = 3 + ((ix * 13) % 7); ctx.beginPath(); ctx.moveTo(ix, fy); ctx.lineTo(ix + 3, fy); ctx.lineTo(ix + 1.5, fy + l); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#3a3f45'; ctx.fillRect(b.cx - 4, b.cy, 8, 18); ctx.fillStyle = '#ffffff'; ctx.fillRect(b.cx - 5, b.cy - 2, 10, 3);
  if (b.n) { ctx.fillStyle = '#2a2f36'; ctx.fillRect(x + 8, fy + 2, 44, 9); }
}
function drawTower(t) {
  const x = t.x, base = t.y + 2 * T, top = base - 92;
  ctx.fillStyle = '#4b392a'; ctx.fillRect(x + 6, top + 30, 6, base - top - 30); ctx.fillRect(x + 2 * T - 12, top + 30, 6, base - top - 30);
  ctx.strokeStyle = '#3a2c20'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 9, base - 6); ctx.lineTo(x + 2 * T - 9, top + 34); ctx.moveTo(x + 2 * T - 9, base - 6); ctx.lineTo(x + 9, top + 34); ctx.stroke();
  ctx.fillStyle = '#6b5440'; ctx.fillRect(x + 26, top + 30, 2, base - top - 30); ctx.fillRect(x + 36, top + 30, 2, base - top - 30);
  for (let ry = top + 36; ry < base; ry += 8) ctx.fillRect(x + 26, ry, 12, 2);
  ctx.fillStyle = '#5b4634'; ctx.fillRect(x - 4, top + 22, 2 * T + 8, 10);
  ctx.fillStyle = '#4f3d2d'; ctx.fillRect(x + 2, top + 4, 2 * T - 4, 20);
  ctx.fillStyle = '#1a1f28'; ctx.fillRect(x + 8, top + 8, 2 * T - 16, 9);
  ctx.fillStyle = '#e9eff4'; ctx.beginPath(); ctx.moveTo(x - 6, top + 6); ctx.lineTo(x + T, top - 10); ctx.lineTo(x + 2 * T + 6, top + 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 6, top + 4, 2 * T + 12, 3);
  ctx.fillStyle = '#2a2e33'; ctx.beginPath(); ctx.ellipse(x + T, top + 22, 7, 5, 0, 0, 7); ctx.fill();
}
function drawBrazier(b) {
  const cx = b.x + 16, base = b.y + T - 4;
  ctx.fillStyle = '#5a3a2a'; ctx.fillRect(cx - 10, base - 24, 20, 24);
  ctx.fillStyle = '#7a4a32'; ctx.beginPath(); ctx.ellipse(cx, base - 24, 10, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(cx - 10, base - 16, 20, 2); ctx.fillRect(cx - 10, base - 7, 20, 2);
  ctx.fillStyle = 'rgba(30,20,15,.9)'; for (let k = 0; k < 4; k++) ctx.fillRect(cx - 7 + k * 4, base - 12, 2, 3);
}
function drawLogs(l) {
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6 - r; c++) {
    const lx = l.x + 8 + c * 9 + r * 4.5, ly = l.y + 22 - r * 8;
    ctx.fillStyle = '#6b4a30'; ctx.beginPath(); ctx.arc(lx, ly, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#b08a5a'; ctx.beginPath(); ctx.arc(lx, ly, 3, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(l.x + T, l.y - 2, 26, 6, 0, 0, 7); ctx.fill();
}
let flagT = 0;
function drawFlag() {
  const x = FLAG_X, y = FLAG_Y;
  ctx.fillStyle = '#7d8590'; ctx.fillRect(x - 1.5, y - 120, 3, 120); ctx.fillRect(x - 6, y - 4, 12, 4);
  ctx.fillStyle = '#c0302a'; ctx.beginPath(); ctx.moveTo(x + 1, y - 118);
  for (let i = 0; i <= 6; i++) ctx.lineTo(x + 1 + i * 6, y - 118 + Math.sin(flagT * 6 + i) * 3 * i / 6);
  for (let i = 6; i >= 0; i--) ctx.lineTo(x + 1 + i * 6, y - 96 + Math.sin(flagT * 6 + i) * 3 * i / 6);
  ctx.closePath(); ctx.fill();
}
// Le bonhomme de neige a une tête carrée, bandeau rouge compris.
function drawSnowman() {
  const x = SNOWMAN_X, y = SNOWMAN_Y;
  ctx.fillStyle = 'rgba(90,120,170,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 14, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#f4f7fa'; ctx.beginPath(); ctx.arc(x, y - 10, 12, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x, y - 28, 9, 0, 7); ctx.fill();
  ctx.fillRect(x - 8, y - 52, 16, 15);
  ctx.fillStyle = '#4f3322'; ctx.fillRect(x - 8, y - 56, 16, 5);
  ctx.fillStyle = '#c23a2e'; ctx.fillRect(x - 8, y - 50, 16, 2);
  ctx.fillStyle = '#1b1b1b'; ctx.fillRect(x - 5, y - 46, 2, 3); ctx.fillRect(x + 3, y - 46, 2, 3);
  ctx.fillStyle = '#f29a30'; ctx.fillRect(x - 1, y - 43, 6, 2);
  ctx.strokeStyle = '#4b392a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 9, y - 28); ctx.lineTo(x - 20, y - 36); ctx.moveTo(x + 9, y - 28); ctx.lineTo(x + 20, y - 34); ctx.stroke();
}
// barrière rayée relevée, devant les portes ouest et est
function drawBarrier(x) {
  const y = 14 * T - 2;
  ctx.fillStyle = '#3a3f45'; ctx.fillRect(x - 3, y - 26, 6, 26);
  ctx.save(); ctx.translate(x, y - 24); ctx.rotate(-1.25);
  for (let k = 0; k < 6; k++) { ctx.fillStyle = k & 1 ? '#efefef' : '#c0302a'; ctx.fillRect(k * 9, -2.5, 9, 5); }
  ctx.restore();
}
function drawGateTop() {
  // portail du nord : poteaux, poutre, panneau, étoile ; portail du sud : poteaux
  for (let k = 0; k < 2; k++) {
    const px = k ? 23 * T + 2 : 21 * T - 10;
    ctx.fillStyle = '#4b392a'; ctx.fillRect(px, -10, 8, T + 8); ctx.fillStyle = '#eef3f6'; ctx.fillRect(px, -10, 8, 3);
    ctx.fillStyle = '#4b392a'; ctx.fillRect(px, WH - T - 18, 8, T + 18); ctx.fillStyle = '#eef3f6'; ctx.fillRect(px, WH - T - 18, 8, 3);
  }
  ctx.fillStyle = '#5b4634'; ctx.fillRect(21 * T - 16, 2, 2 * T + 32, 10);
  ctx.fillStyle = '#eef3f6'; ctx.fillRect(21 * T - 16, 2, 2 * T + 32, 3);
  ctx.fillStyle = '#2a2f36'; ctx.fillRect(21 * T - 6, 14, 2 * T + 12, 14);
  ctx.fillStyle = '#c0302a'; ctx.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k & 1 ? 4 : 9; ctx.lineTo(GX + Math.cos(a) * r, -6 + Math.sin(a) * r); }
  ctx.closePath(); ctx.fill();
}

// Repère baraquements (blocs de murs), miradors (blocs de 2 × 2), braseros et piles de bûches dans le plan.
export function prepare() {
  if (document.fonts) document.fonts.load(CYR_GATE).catch(() => {}); // police cyrillique des inscriptions, dessinées à chaque image
  covered.fill(0); objects.length = 0; BARRACKS.length = TOWERS.length = BRAZIERS.length = LOGS.length = 0;
  for (let i = 0; i < MW * MH; i++) { const x = i % MW, y = i / MW | 0; if (map[i] === 1 && (x === 0 || y === 0 || x === MW - 1 || y === MH - 1)) covered[i] = 1; }
  let n = 0;
  for (let ty = 1; ty < MH - 1; ty++) for (let tx = 1; tx < MW - 1; tx++) {
    const i = ty * MW + tx;
    if (covered[i] || !map[i] || map[i] === 3) continue;
    if (map[i] === 1) {
      let w = 0, h = 0;
      while (map[i + w] === 1) w++;
      while (map[i + h * MW] === 1) h++;
      for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) covered[i + j * MW + k] = 1;
      const x = tx * T, y = ty * T;
      if (w === 2 && h === 2) { const t = { x, y }; TOWERS.push(t); objects.push({ k: y + 2 * T, x0: x - 8, x1: x + 2 * T + 8, draw: () => drawTower(t) }); continue; }
      const side = h > w, W = w * T, D = h * T, win = [], lit = [];
      for (let wx = x + 14; wx < x + W - 20; wx += side ? 34 : 40) { if (wx > x + W / 2 - 31 && wx < x + W / 2 + 17) continue; win.push(wx); lit.push(Math.random() < .6); }
      const b = { x, y, w: W, d: D, side, win, lit, n: side ? 0 : ++n, cx: x + (side ? W * .7 : W * .3), cy: y - BH + (side ? D * .3 : D * .35) - 18 };
      BARRACKS.push(b); objects.push({ k: y + D, x0: x - 8, x1: x + W + 8, draw: () => drawBarrack(b) });
    } else {
      const pair = map[i + 1] === 2 && !covered[i + 1];
      covered[i] = 1; if (pair) covered[i + 1] = 1;
      const o = { x: tx * T, y: ty * T };
      if (pair) { LOGS.push(o); objects.push({ k: o.y + T, x0: o.x - 4, x1: o.x + 2 * T + 4, draw: () => drawLogs(o) }); }
      else { BRAZIERS.push(o); objects.push({ k: o.y + T, x0: o.x - 4, x1: o.x + T + 4, draw: () => drawBrazier(o) }); }
    }
  }
  objects.push({ k: FLAG_Y, x0: FLAG_X - 8, x1: FLAG_X + 44, draw: drawFlag });
  objects.push({ k: SNOWMAN_Y, x0: SNOWMAN_X - 22, x1: SNOWMAN_X + 22, draw: drawSnowman });
  objects.push({ k: 14 * T, x0: T - 20, x1: T + 60, draw: () => drawBarrier(T + 8) });
  objects.push({ k: 14 * T, x0: WW - T - 20, x1: WW - T + 60, draw: () => drawBarrier(WW - T - 8) });
}

/* ---------- Image ---------- */
const SMOKE = 48, smx = new Float32Array(SMOKE), smy = new Float32Array(SMOKE), smt = new Float32Array(SMOKE).fill(-1), sml = new Float32Array(SMOKE);
let smokeT = -1, smokeNext = 0;
export function drawBack(time) { flagT = time; }
export function drawOver() { outlined(null, drawGateTop); }
// Après le voile de neige : fumées des cheminées, flammes et chaleur des braseros, inscriptions.
export function drawLights(time) {
  const dt = smokeT < 0 ? 0 : Math.max(0, Math.min(.05, time - smokeT)); smokeT = time;
  for (let i = 0; i < BARRACKS.length; i++) if (Math.random() < dt * 4) {
    const b = BARRACKS[i]; smx[smokeNext] = b.cx; smy[smokeNext] = b.cy; smt[smokeNext] = 0; sml[smokeNext] = 2.4 + Math.random(); smokeNext = (smokeNext + 1) % SMOKE;
  }
  ctx.fillStyle = '#e6ebf0';
  for (let i = 0; i < SMOKE; i++) {
    if (smt[i] < 0) continue;
    smt[i] += dt; smy[i] -= 16 * dt; smx[i] += 26 * dt;
    if (smt[i] > sml[i]) { smt[i] = -1; continue; }
    ctx.globalAlpha = .5 * (1 - smt[i] / sml[i]); ctx.beginPath(); ctx.arc(smx[i], smy[i], 5 + smt[i] * 7, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < BRAZIERS.length; i++) {
    const b = BRAZIERS[i], cx = b.x + 16, base = b.y + T - 28;
    for (let j = -2; j <= 2; j++) {
      const h = 10 + 6 * Math.sin(time * 13 + j * 2 + i) + (2 - Math.abs(j)) * 4;
      ctx.fillStyle = j & 1 ? '#f29a30' : '#f2c230'; ctx.beginPath(); ctx.moveTo(cx + j * 4 - 4, base); ctx.lineTo(cx + j * 4, base - h); ctx.lineTo(cx + j * 4 + 4, base); ctx.fill();
    }
    glow(cx, b.y + 8, 60, '255,154,58', .2);
  }
  ctx.fillStyle = '#e8edf2'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = CYR;
  for (let i = 0; i < BARRACKS.length; i++) { const b = BARRACKS[i]; if (b.n) ctx.fillText(b.label || (b.label = 'БАРАК ' + b.n), b.x + 11, b.y + b.d - BH + 7); }
  ctx.textAlign = 'center'; ctx.font = CYR_GATE; ctx.fillText('ЛАГЕРЬ № 7', GX, 21.5);
}
