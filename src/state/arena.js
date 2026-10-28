// L'arène : construction de la grille, requêtes de tuiles, déplacements avec collisions, champ de la horde.
import { MH, MW, T } from '../config.js';
import * as Grid from '../rules/map.js';
import * as Field from '../rules/pathfield.js';
import { blocks, player } from './world.js';
import { clamp } from '../util.js';

export const map = new Uint8Array(MW * MH); // 0 sol, 1 mur, 2 caisse
export const doors = [];
export const doorSet = new Set();
function rect(x, y, w, h, v) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) map[j * MW + i] = v; }
export function buildMap() {
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

export function tileAt(tx, ty) { return Grid.tileAt(map, blocks, tx, ty); }
export function passable(tx, ty) { return Grid.passable(map, tx, ty); }
export function openT(tx, ty) { return Grid.openT(map, blocks, tx, ty); }
// fly : en l'air (roulade au-dessus d'une crevasse, ennemi projeté), le vide ne bloque plus, les murs si
export function moveCircle(e, dx, dy, fly) {
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
export function unstick(e) {
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
export function shotTile(tx, ty) { return Grid.shotTile(map, blocks, tx, ty); }
export const isVoid = (x, y) => Grid.isVoid(map, x, y);
export function circleTouchesVoid(o, m) { return Grid.circleTouchesVoid(map, o, m); }
export function walkLine(ax, ay, bx, by) { return Grid.walkLine(map, ax, ay, bx, by); }
export function los(ax, ay, bx, by) { return Grid.los(map, blocks, ax, ay, bx, by); }

export let dist = new Float32Array(MW * MH);
export function computeField() {
  const ptx = clamp(Math.floor(player.x / T), 0, MW - 1), pty = clamp(Math.floor(player.y / T), 0, MH - 1);
  dist = Field.computeField(map, blocks, ptx, pty);
}
export function nextStep(e) { return Field.nextStep(map, blocks, dist, e.x, e.y); }
export function frontTile() {
  return [Math.floor((player.x + player.fx * T * .95) / T), Math.floor((player.y + player.fy * T * .95) / T)];
}
export function clearShot(ax, ay, bx, by, own) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.max(1, d / 8 | 0);
  for (let k = 1; k < n; k++) {
    const tx = Math.floor((ax + (bx - ax) * k / n) / T), ty = Math.floor((ay + (by - ay) * k / n) / T);
    if (ty * MW + tx === own) continue;
    if (shotTile(tx, ty)) return false;
  }
  return true;
}
