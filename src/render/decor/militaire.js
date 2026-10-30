// Décor du camp militaire : la base où tout a commencé, au crépuscule. Conteneurs et laboratoires mobiles,
// postes de sacs de sable et leurs mitrailleuses, caisses de munitions, héliport, clôture grillagée et postes
// de garde ; projecteur qui balaie l'arène, réverbères de chantier, cendres.
import { MH, MW, T } from '../../config.js';
import { glow } from '../ambiance.js';
import { ctx } from '../canvas.js';
import { map } from '../../state/arena.js';

export const NIGHT = '#a28fb0', FOG = null, WEATHER = 'ash', VIGNETTE = 'rgba(25,8,30,.5)';
const WW = MW * T, WH = MH * T, CX = 22, CY = 15, BOX_H = 40; // BOX_H : hauteur d'un conteneur
const TINT = { olive: ['#6a7a44', '#5d6b3a', '#4b5730'], rust: ['#9c5a38', '#8a4b2e', '#6e3a23'], blue: ['#3a6a8c', '#2f5a7a', '#244a66'], lab: ['#d9dcd6', '#c2c6bf', '#9ea39b'] };
const KINDS = ['olive', 'rust', 'blue'];
const POSTS = [[13.5, 6.5], [30.5, 6.5], [13.5, 23.6], [30.5, 23.6]].map(([x, y]) => [x * T, y * T]);
const BOOTHS = [[19 * T, 1.6 * T], [25 * T, 29 * T]];
const LABEL_FONT = '11px "Black Ops One", Impact, sans-serif';

export const covered = new Uint8Array(MW * MH);
export const objects = [];
const BOXES = [];

/* ---------- Sol, clôture ---------- */
function hazard(f, x, y, w, h) {
  f.save(); f.beginPath(); f.rect(x, y, w, h); f.clip(); f.fillStyle = '#f2c230';
  for (let k = -h; k < w; k += 16) { f.beginPath(); f.moveTo(x + k, y + h); f.lineTo(x + k + 8, y + h); f.lineTo(x + k + 8 + h, y); f.lineTo(x + k + h, y); f.closePath(); f.fill(); }
  f.restore();
}
export function paintGround(f, W, H) {
  f.fillStyle = '#a8946c'; f.fillRect(0, 0, W, H);
  for (let k = 0; k < 9000; k++) { const v = Math.random(); f.fillStyle = v < .4 ? 'rgba(60,40,20,.12)' : v < .8 ? 'rgba(255,240,200,.1)' : 'rgba(90,90,90,.25)'; f.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2.5, 1 + Math.random() * 2); }
  // dalle de béton et héliport au centre
  const px = (CX - 7) * T, py = (CY - 5) * T;
  f.fillStyle = '#8d8a82'; f.fillRect(px, py, 14 * T, 10 * T);
  f.strokeStyle = 'rgba(0,0,0,.15)'; f.lineWidth = 1;
  for (let x = 0; x <= 14; x += 2) { f.beginPath(); f.moveTo(px + x * T, py); f.lineTo(px + x * T, py + 10 * T); f.stroke(); }
  for (let y = 0; y <= 10; y += 2) { f.beginPath(); f.moveTo(px, py + y * T); f.lineTo(px + 14 * T, py + y * T); f.stroke(); }
  for (let k = 0; k < 1500; k++) { f.fillStyle = Math.random() < .5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.06)'; f.fillRect(px + Math.random() * 14 * T, py + Math.random() * 10 * T, 2, 2); }
  const hx = CX * T, hy = CY * T;
  f.strokeStyle = 'rgba(242,194,48,.85)'; f.lineWidth = 8; f.beginPath(); f.ellipse(hx, hy, 3.2 * T, 2.9 * T, 0, 0, 7); f.stroke();
  f.fillStyle = 'rgba(240,240,232,.85)'; f.fillRect(hx - 44, hy - 46, 18, 92); f.fillRect(hx + 26, hy - 46, 18, 92); f.fillRect(hx - 26, hy - 9, 52, 18);
  // traces de pneus depuis les portes, taches d'huile
  f.strokeStyle = 'rgba(70,52,34,.28)'; f.lineWidth = 6;
  for (const [x0, y0, x1, y1, x2, y2] of [[0, 15 * T - 20, 10 * T, 14 * T, 15 * T, 14.5 * T], [W, 15 * T + 20, 34 * T, 16 * T, 29 * T, 15.5 * T], [22 * T - 20, 0, 21 * T, 5 * T, 21.5 * T, 10 * T], [22 * T + 20, H, 23 * T, 25 * T, 22.5 * T, 20 * T]])
    for (const o of [0, 14]) { f.beginPath(); f.moveTo(x0 + o, y0 + o); f.quadraticCurveTo(x1 + o, y1 + o, x2 + o, y2 + o); f.stroke(); }
  for (const [x, y, r] of [[19, 6, 22], [27, 24, 26], [7, 15, 18], [37, 14, 20], [24, 12, 14]]) {
    f.fillStyle = 'rgba(25,20,25,.5)'; f.beginPath(); f.ellipse(x * T, y * T, r, r * .55, 0, 0, 7); f.fill();
    f.fillStyle = 'rgba(120,80,160,.18)'; f.beginPath(); f.ellipse(x * T - 4, y * T - 2, r * .5, r * .2, 0, 0, 7); f.fill();
  }
  hazard(f, 20 * T, T, 4 * T, 10); hazard(f, 20 * T, H - T - 10, 4 * T, 10);
  f.fillStyle = 'rgba(40,25,40,.25)'; for (const b of BOXES) f.fillRect(b.x, b.y + b.d, b.w, 12);
  // clôture grillagée : de face au nord et au sud, de dessus à l'ouest et à l'est, ouverte sur les portes
  for (const y0 of [0, H - T]) {
    f.fillStyle = 'rgba(40,40,45,.35)'; f.fillRect(0, y0 + 4, W, T - 6);
    f.strokeStyle = 'rgba(170,170,175,.55)'; f.lineWidth = 1; f.beginPath();
    for (let x = -T; x < W + T; x += 8) { f.moveTo(x, y0 + 4); f.lineTo(x + T - 6, y0 + T - 2); f.moveTo(x + T - 6, y0 + 4); f.lineTo(x, y0 + T - 2); }
    f.stroke();
    f.fillStyle = '#7d7f84'; for (let x = 0; x < W; x += 3 * T) f.fillRect(x + 2, y0, 6, T);
    f.strokeStyle = '#2a2a30'; f.beginPath(); for (let x = 0; x < W; x += 8) { f.moveTo(x, y0 + 4); f.arc(x + 4, y0 + 4, 4, Math.PI, 0); } f.stroke();
  }
  f.fillStyle = '#a8946c'; f.fillRect(21 * T, 0, 2 * T, T); f.fillRect(21 * T, H - T, 2 * T, T);
  for (const x0 of [0, W - T]) {
    f.fillStyle = 'rgba(40,40,45,.35)'; f.fillRect(x0 + 10, 0, 12, H);
    f.fillStyle = '#7d7f84'; for (let y = 0; y < H; y += 3 * T) f.fillRect(x0 + 8, y, 16, 6);
    f.fillStyle = '#a8946c'; f.fillRect(x0, 14 * T, T, 2 * T);
  }
  // horizon orangé sur le haut de l'arène
  const hz = f.createLinearGradient(0, 0, 0, 5 * T); hz.addColorStop(0, 'rgba(255,150,90,.25)'); hz.addColorStop(1, 'rgba(255,150,90,0)');
  f.fillStyle = hz; f.fillRect(0, 0, W, 5 * T);
}

/* ---------- Objets ---------- */
function drawBox(b) {
  const { x, y, w: W, d: D, kind, vert } = b, [top, face, dark] = TINT[kind], lab = kind === 'lab', H = BOX_H;
  ctx.fillStyle = face; ctx.fillRect(x, y + D - H, W, H);
  ctx.fillStyle = dark; for (let k = 4; k < W; k += 8) ctx.fillRect(x + k, y + D - H + 2, 2, H - 4);
  if (vert || lab) {
    ctx.fillStyle = dark; ctx.fillRect(x + W / 2 - 1, y + D - H + 2, 2, H - 4);
    ctx.fillStyle = '#c9ccc4'; ctx.fillRect(x + W / 2 - 10, y + D - H + 4, 2, H - 8); ctx.fillRect(x + W / 2 + 6, y + D - H + 4, 2, H - 8);
  }
  if (lab) {
    ctx.fillStyle = '#1f2a24'; ctx.fillRect(x + 12, y + D - H + 10, 26, 14); ctx.fillStyle = '#9ed14a'; ctx.fillRect(x + 14, y + D - H + 12, 22, 10);
    ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.moveTo(x + W - 34, y + D - H + 26); ctx.lineTo(x + W - 22, y + D - H + 6); ctx.lineTo(x + W - 10, y + D - H + 26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(x + W - 22, y + D - H + 19, 3.5, 0, 7); ctx.fill();
  }
  ctx.fillStyle = top; ctx.fillRect(x, y - H, W, D);
  ctx.fillStyle = dark;
  if (vert) for (let k = 6; k < D; k += 8) ctx.fillRect(x + 2, y - H + k, W - 4, 2);
  else for (let k = 6; k < W; k += 8) ctx.fillRect(x + k, y - H + 2, 2, D - 4);
  ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(x, y - H, W, 2);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y - H + D - 2, W, 2);
}
function drawBags(o) {
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const bx = o.x + 6 + c * 10 + (r ? 5 : 0), by = o.y + 22 - r * 9;
    ctx.fillStyle = r ? '#c9b37e' : '#b29d68'; ctx.beginPath(); ctx.ellipse(bx, by, 7, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(bx - 1, by - 4, 1, 8);
  }
  if (!o.gun) return;
  // mitrailleuse sur trépied, canon tourné vers l'extérieur du poste
  const x = o.x + 16, y = o.y + 6;
  ctx.fillStyle = '#2a2e33'; ctx.fillRect(x - 1, y - 2, 3, 10);
  ctx.strokeStyle = '#2a2e33'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 6, y + 8); ctx.lineTo(x, y); ctx.lineTo(x + 6, y + 8); ctx.stroke();
  ctx.fillStyle = '#3a4048'; ctx.fillRect(x - 8, y - 6, 16, 6); ctx.fillStyle = '#2a2e33'; ctx.fillRect(x + (o.gun > 0 ? 8 : -20), y - 4, 12, 2);
}
function drawCrate(o) {
  const x = o.x, y = o.y, h = 16;
  ctx.fillStyle = '#4b5730'; ctx.fillRect(x + 2, y + T - h, T - 4, h);
  ctx.fillStyle = '#f2c230'; ctx.fillRect(x + 2, y + T - h + 5, T - 4, 3);
  ctx.fillStyle = '#5d6b3a'; ctx.fillRect(x + 2, y - h + 2, T - 4, T - 4);
  ctx.fillStyle = '#3e4826'; ctx.fillRect(x + 2, y - h + T / 2, T - 4, 2);
  ctx.fillStyle = '#e8e0c8'; ctx.fillRect(x + 8, y - h + 8, 4, 2); ctx.fillRect(x + 14, y - h + 8, 9, 2);
}
function drawPost(p) {
  const x = p[0], y = p[1];
  ctx.fillStyle = '#5a5e64'; ctx.fillRect(x - 2, y - 96, 4, 96); ctx.fillRect(x - 7, y - 6, 14, 6);
  ctx.fillStyle = '#3a3e44'; ctx.fillRect(x - 14, y - 102, 28, 8);
  ctx.fillStyle = '#f4f2e8'; ctx.fillRect(x - 12, y - 96, 10, 4); ctx.fillRect(x + 2, y - 96, 10, 4);
}
function drawBooth(p) {
  const x = p[0], y = p[1];
  ctx.fillStyle = '#c9ccc4'; ctx.fillRect(x - 16, y - 34, 32, 34);
  ctx.fillStyle = '#2a3a52'; ctx.fillRect(x - 12, y - 28, 24, 12);
  ctx.fillStyle = '#5d6b3a'; ctx.fillRect(x - 19, y - 40, 38, 7);
  ctx.fillStyle = '#e08a2a'; ctx.fillRect(x - 3, y - 46, 6, 6);
}
function drawBoom(x, y, ang) {
  ctx.fillStyle = '#3a3f45'; ctx.fillRect(x - 3, y - 24, 6, 24);
  ctx.save(); ctx.translate(x, y - 22); ctx.rotate(ang);
  for (let k = 0; k < 6; k++) { ctx.fillStyle = k & 1 ? '#efefef' : '#c0302a'; ctx.fillRect(k * 9, -2.5, 9, 5); }
  ctx.restore();
}
function drawTires(x, y) {
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = '#1e1e22'; ctx.beginPath(); ctx.ellipse(x, y - k * 7, 13, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a3a40'; ctx.beginPath(); ctx.ellipse(x, y - k * 7, 6, 2.5, 0, 0, 7); ctx.fill();
  }
}
function drawAntenna() {
  const x = 36.5 * T, y = 7.5 * T;
  ctx.strokeStyle = '#7d7f84'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 140); ctx.moveTo(x - 10, y); ctx.lineTo(x, y - 60); ctx.lineTo(x + 10, y); ctx.stroke();
  ctx.fillStyle = '#d0352c'; ctx.fillRect(x - 2, y - 144, 4, 4);
}

// Repère conteneurs (blocs de murs pleins, laboratoires près du centre), sacs de sable (le reste des murs,
// mitrailleuse au bout de rangée tourné vers le centre) et caisses de munitions.
export function prepare() {
  covered.fill(0); objects.length = 0; BOXES.length = 0;
  for (let i = 0; i < MW * MH; i++) { const x = i % MW, y = i / MW | 0; if (map[i] === 1 && (x === 0 || y === 0 || x === MW - 1 || y === MH - 1)) covered[i] = 1; }
  let n = 0;
  for (let ty = 1; ty < MH - 1; ty++) for (let tx = 1; tx < MW - 1; tx++) {
    const i = ty * MW + tx;
    if (covered[i] || !map[i]) continue;
    if (map[i] === 2) { covered[i] = 1; const o = { x: tx * T, y: ty * T }; objects.push({ k: o.y + T, x0: o.x - 4, x1: o.x + T + 4, draw: () => drawCrate(o) }); continue; }
    let w = 0, h = 0;
    while (map[i + w] === 1 && !covered[i + w]) w++;
    while (map[i + h * MW] === 1 && !covered[i + h * MW]) h++;
    let full = w >= 2 && h >= 2;
    for (let j = 0; full && j < h; j++) for (let k = 0; k < w; k++) if (map[i + j * MW + k] !== 1) { full = false; break; }
    if (full) {
      for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) covered[i + j * MW + k] = 1;
      const near = Math.abs(tx + w / 2 - CX) < 12 && Math.abs(ty + h / 2 - CY) < 9 && w > h;
      const b = { x: tx * T, y: ty * T, w: w * T, d: h * T, vert: h > w, kind: near ? 'lab' : KINDS[n++ % 3], label: near ? '' : 'C-' + String(7 + BOXES.length).padStart(2, '0') };
      BOXES.push(b); objects.push({ k: b.y + b.d, x0: b.x - 4, x1: b.x + b.w + 4, draw: () => drawBox(b) });
    } else {
      // rangée de sacs : la mitrailleuse se pose sur le bout le plus proche du centre
      for (let k = 0; k < w; k++) covered[i + k] = 1;
      const end = Math.abs(tx - CX) < Math.abs(tx + w - 1 - CX) ? 0 : w - 1;
      for (let k = 0; k < w; k++) {
        const o = { x: (tx + k) * T, y: ty * T, gun: w >= 3 && k === end ? (end ? 1 : -1) : 0 };
        objects.push({ k: o.y + T + (o.gun ? 1 : 0), x0: o.x - 24, x1: o.x + T + 24, draw: () => drawBags(o) });
      }
    }
  }
  for (const p of POSTS) objects.push({ k: p[1], x0: p[0] - 16, x1: p[0] + 16, draw: () => drawPost(p) });
  for (const p of BOOTHS) objects.push({ k: p[1], x0: p[0] - 20, x1: p[0] + 20, draw: () => drawBooth(p) });
  objects.push({ k: 1.7 * T, x0: 20 * T, x1: 22.5 * T, draw: () => drawBoom(20.6 * T, 1.7 * T, -1.2) });
  objects.push({ k: 29.4 * T, x0: 21.5 * T, x1: 24 * T, draw: () => drawBoom(23.4 * T, 29.4 * T, -1.95) });
  objects.push({ k: 14 * T, x0: 0, x1: 3 * T, draw: () => drawBoom(T + 8, 14 * T - 2, -1.25) });
  objects.push({ k: 14 * T, x0: WW - 3 * T, x1: WW, draw: () => drawBoom(WW - T - 8, 14 * T - 2, -1.9) });
  objects.push({ k: 24.8 * T, x0: 17.5 * T, x1: 18.5 * T, draw: () => drawTires(18 * T, 24.8 * T) });
  objects.push({ k: 5.6 * T, x0: 26.5 * T, x1: 27.5 * T, draw: () => drawTires(27 * T, 5.6 * T) });
  objects.push({ k: 7.5 * T, x0: 36 * T, x1: 37 * T, draw: drawAntenna });
}

/* ---------- Image ---------- */
export function drawBack() {}
export function drawOver() {}
// Après le crépuscule : numéros des conteneurs, projecteur, réverbères, gyrophares, laboratoires.
export function drawLights(time) {
  ctx.fillStyle = 'rgba(240,235,220,.75)'; ctx.font = LABEL_FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (let i = 0; i < BOXES.length; i++) { const b = BOXES[i]; if (b.label) ctx.fillText(b.label, b.x + 8, b.y + b.d - BOX_H + 14); }
  // projecteur du poste de garde du nord : faisceau et tache au sol
  const lx = BOOTHS[0][0], ly = 6, sx = CX * T + Math.sin(time * .35) * 15 * T, sy = CY * T + Math.cos(time * .27) * 8 * T;
  const a = Math.atan2(sy - ly, sx - lx), px = -Math.sin(a), py = Math.cos(a);
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,248,220,.07)';
  ctx.beginPath(); ctx.moveTo(lx + px * 3, ly + py * 3); ctx.lineTo(sx + px * 64, sy + py * 34); ctx.lineTo(sx - px * 64, sy - py * 34); ctx.lineTo(lx - px * 3, ly - py * 3); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.translate(sx, sy); ctx.scale(1, .55); glow(0, 0, 80, '255,248,220', .42); ctx.restore();
  for (let i = 0; i < POSTS.length; i++) { glow(POSTS[i][0], POSTS[i][1] - 94, 40, '255,246,224', .6); glow(POSTS[i][0], POSTS[i][1], 110, '255,242,208', .32); }
  const on = Math.sin(time * 6) > 0;
  for (let i = 0; i < BOOTHS.length; i++) glow(BOOTHS[i][0], BOOTHS[i][1] - 43, on ? 46 : 20, '255,154,42', on ? .55 : .2);
  for (let i = 0; i < BOXES.length; i++) if (BOXES[i].kind === 'lab') glow(BOXES[i].x + 25, BOXES[i].y + BOXES[i].d - 23, 50, '158,209,74', .35);
}
