// Sol de l'arène peint hors écran, et traces persistantes (sang, brûlures).
import { MH, MW, T } from '../config.js';
import { themeOf } from './themes.js';
import { doors, map, mapId } from '../state/arena.js';
import { rnd } from '../util.js';

export const floorC = document.createElement('canvas');
floorC.width = MW * T; floorC.height = MH * T;
export const fctx = floorC.getContext('2d');
export function paintFloor() {
  const th = themeOf(mapId), f = th.floor;
  fctx.fillStyle = f.base; fctx.fillRect(0, 0, floorC.width, floorC.height);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if ((x + y) & 1) { fctx.fillStyle = f.check; fctx.fillRect(x * T, y * T, T, T); }
    fctx.fillStyle = f.joint; fctx.fillRect(x * T, y * T, T, 1); fctx.fillRect(x * T, y * T, 1, T);
  }
  for (let k = 0; k < 3000; k++) {
    fctx.fillStyle = Math.random() < .5 ? f.speckDark : f.speckLight;
    fctx.fillRect(Math.random() * floorC.width, Math.random() * floorC.height, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  paintMarks(f);
  // gravats et fissures au bord des crevasses
  for (let i = 0; i < MW * MH; i++) {
    if (map[i] !== 3 || th.void.kind !== 'pit') continue;
    const x = (i % MW) * T, y = (i / MW | 0) * T;
    for (let k = 0; k < 7; k++) {
      fctx.fillStyle = Math.random() < .5 ? 'rgba(60,58,52,.55)' : 'rgba(205,204,196,.7)';
      const side = Math.random() < .5 ? -3 - Math.random() * 7 : T + 1 + Math.random() * 7;
      fctx.fillRect(x + Math.random() * T, y + side, 1.5 + Math.random() * 2.5, 1.5 + Math.random() * 1.5);
    }
  }
  // marquage au sol : rectangle pointillé façon entrepôt
  if (f.marking) {
    fctx.strokeStyle = 'rgba(214,170,40,.55)'; fctx.lineWidth = 3; fctx.setLineDash([14, 10]);
    fctx.strokeRect(13 * T + 8, 9 * T + 8, 18 * T - 16, 12 * T - 16); fctx.setLineDash([]);
  }
  // bandes de danger devant les portes
  for (const [x, y] of doors) {
    const g = fctx.createRadialGradient(x * T + T / 2, y * T + T / 2, 2, x * T + T / 2, y * T + T / 2, 40);
    g.addColorStop(0, 'rgba(15,16,17,.85)'); g.addColorStop(1, 'rgba(15,16,17,0)');
    fctx.fillStyle = g; fctx.fillRect(x * T - 40, y * T - 40, T + 80, T + 80);
  }
}
// Motif du sol propre au thème : fissures du béton, flaques du bitume, traces de pas dans la neige,
// taches d'humidité, traces de pneus.
function paintMarks(f) {
  const W = floorC.width, H = floorC.height;
  if (f.marks === 'cracks') {
    fctx.strokeStyle = f.mark; fctx.lineWidth = 1;
    for (let k = 0; k < 14; k++) {
      let x = Math.random() * W, y = Math.random() * H;
      fctx.beginPath(); fctx.moveTo(x, y);
      for (let s = 0; s < 6; s++) { x += rnd(18); y += rnd(18); fctx.lineTo(x, y); }
      fctx.stroke();
    }
  } else if (f.marks === 'puddles' || f.marks === 'stains') {
    fctx.fillStyle = f.mark;
    for (let k = 0; k < 22; k++) {
      const x = Math.random() * W, y = Math.random() * H, r = 14 + Math.random() * 26;
      fctx.beginPath(); fctx.ellipse(x, y, r, r * .55, 0, 0, 7); fctx.fill();
    }
  } else if (f.marks === 'tracks') {
    fctx.fillStyle = f.mark;
    for (let k = 0; k < 9; k++) {
      let x = Math.random() * W, y = Math.random() * H, a = Math.random() * 7;
      for (let s = 0; s < 40; s++) {
        a += rnd(.25); x += Math.cos(a) * 9; y += Math.sin(a) * 9;
        const side = s & 1 ? 3 : -3;
        fctx.beginPath(); fctx.ellipse(x - Math.sin(a) * side, y + Math.cos(a) * side, 3, 2, a, 0, 7); fctx.fill();
      }
    }
  } else if (f.marks === 'tyres') {
    fctx.strokeStyle = f.mark; fctx.lineWidth = 4;
    for (let k = 0; k < 4; k++) {
      const y0 = (k + .5) * H / 4 + rnd(40), dy = rnd(60);
      for (const off of [0, 16]) {
        fctx.beginPath(); fctx.moveTo(0, y0 + off);
        fctx.bezierCurveTo(W * .3, y0 + off + dy, W * .6, y0 + off - dy, W, y0 + off + rnd(30));
        fctx.stroke();
      }
    }
  }
}
export function stampBlood(x, y, r, a) {
  fctx.fillStyle = `rgba(${110 + Math.random() * 45 | 0},${10 + Math.random() * 14 | 0},14,${a})`;
  fctx.beginPath(); fctx.ellipse(x, y, r, r * .7, Math.random() * 3, 0, 7); fctx.fill();
}
export function stampScorch(x, y, R) {
  const g = fctx.createRadialGradient(x, y, 2, x, y, R);
  g.addColorStop(0, 'rgba(25,22,20,.6)'); g.addColorStop(.6, 'rgba(25,22,20,.25)'); g.addColorStop(1, 'rgba(25,22,20,0)');
  fctx.fillStyle = g; fctx.beginPath(); fctx.arc(x, y, R, 0, 7); fctx.fill();
}
