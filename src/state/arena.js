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
// rectangle reporté dans les quatre quarts de l'arène, par symétrie
function rect4(x, y, w, h, v) { rect(x, y, w, h, v); rect(MW - x - w, y, w, h, v); rect(x, MH - y - h, w, h, v); rect(MW - x - w, MH - y - h, w, h, v); }
function set4(x, y, v) { for (const [i, j] of [[x, y], [MW - 1 - x, y], [x, MH - 1 - y], [MW - 1 - x, MH - 1 - y]]) map[j * MW + i] = v; }
// Plans des arènes, choisies sur l'accueil ; toutes gardent la bordure, les portes et une case de départ libre au centre.
const PLANS = {
  entrepot(cx, cy) {
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
  },
  // îlot central cerné d'un fossé, un pont de deux cases face à chaque porte
  fosse(cx, cy) {
    rect(11, 7, 22, 2, 3); rect(11, MH - 9, 22, 2, 3);
    rect(11, 7, 2, 16, 3); rect(MW - 13, 7, 2, 16, 3);
    rect(cx - 1, 7, 2, 2, 0); rect(cx - 1, MH - 9, 2, 2, 0);
    rect(11, cy - 1, 2, 2, 0); rect(MW - 13, cy - 1, 2, 2, 0);
    for (const [x, y] of [[15, 10], [16, 10], [15, 11]]) set4(x, y, 2);
    rect4(4, 3, 3, 1, 1); rect4(4, 3, 1, 2, 1);
  },
  // champ régulier de piliers 2 × 2, des caisses à la place des quatre plus proches du centre
  colonnade() {
    for (const x of [5, 11, 17, 25, 31, 37]) for (const y of [4, 10, 16, 22]) {
      if ((x === 17 || x === 25) && (y === 10 || y === 16)) { map[(y + 1) * MW + x] = 2; continue; }
      rect(x, y + (y >= 16 ? 2 : 0), 2, 2, 1);
    }
  },
  // casemate centrale ouverte par ses coins, lignes de caisses au-dehors
  bunker(cx, cy) {
    rect(14, 9, 16, 1, 1); rect(14, MH - 10, 16, 1, 1);
    rect(14, 9, 1, 12, 1); rect(MW - 15, 9, 1, 12, 1);
    for (const [x, y] of [[14, 9], [15, 9], [14, 10]]) set4(x, y, 0);
    for (let x = 17; x <= 26; x += 3) { map[5 * MW + x] = 2; map[(MH - 6) * MW + x] = 2; }
    for (let y = 11; y <= 18; y += 3) { map[y * MW + 6] = 2; map[y * MW + MW - 7] = 2; }
    rect4(3, 3, 4, 1, 1);
    map[(cy - 2) * MW + cx - 2] = 2; map[(cy + 1) * MW + cx + 1] = 2;
  },
  // chaussée est-ouest entre deux gouffres, un pont large au centre et une passerelle par rive
  pont(cx, cy) {
    rect(1, cy - 3, MW - 2, 2, 3); rect(1, cy + 2, MW - 2, 2, 3);
    rect(cx - 2, cy - 3, 4, 2, 0); rect(cx - 2, cy + 2, 4, 2, 0);
    rect(5, cy - 3, 1, 2, 0); rect(MW - 6, cy + 2, 1, 2, 0);
    rect(cx - 6, cy - 1, 3, 2, 2); rect(cx + 3, cy - 1, 3, 2, 2);
    rect4(7, 4, 1, 4, 1); rect4(7, 4, 5, 1, 1);
    for (const [x, y] of [[cx - 6, 8], [cx + 5, 8], [cx - 6, MH - 9], [cx + 5, MH - 9]]) map[y * MW + x] = 2;
  },
  // quatre pâtés de boutiques séparés par des ruelles, une grande rue est-ouest et une nord-sud,
  // un portique à chaque entrée nord et sud, des étals dans les rues
  chinatown() {
    rect4(3, 3, 7, 6, 1); rect4(12, 3, 6, 6, 1);
    rect4(3, 11, 7, 2, 1); rect4(12, 11, 4, 2, 1);
    set4(19, 2, 1);
    set4(7, 14, 2); set4(14, 14, 2); set4(20, 7, 2);
  },
  // baraquements en long, un mirador dans chaque coin, enceinte de barbelés autour de la place
  // d'appel, ouverte face aux portes ; braseros sur la place. Les barbelés sont du vide : ils arrêtent
  // les corps et laissent passer les tirs
  siberie() {
    rect4(2, 2, 2, 2, 1);
    rect4(7, 3, 11, 3, 1); rect4(3, 8, 3, 5, 1);
    rect4(12, 9, 7, 1, 3); rect4(12, 9, 1, 3, 3);
    set4(15, 12, 2); set4(9, 7, 2); set4(10, 7, 2);
  },
  // deux canaux est-ouest et deux nord-sud découpent l'arène en salles ; une passerelle devant chaque
  // porte, une par rive, une à chaque croisement nord-sud ; piliers dans les salles
  egouts(cx, cy) {
    rect(1, 7, MW - 2, 2, 3); rect(1, MH - 9, MW - 2, 2, 3);
    rect(10, 1, 2, MH - 2, 3); rect(MW - 12, 1, 2, MH - 2, 3);
    rect(cx - 1, 7, 2, 2, 0); rect(cx - 1, MH - 9, 2, 2, 0);
    rect(10, cy - 1, 2, 2, 0); rect(MW - 12, cy - 1, 2, 2, 0);
    rect4(5, 7, 1, 2, 0); rect4(10, 4, 2, 1, 0);
    rect4(15, 11, 2, 2, 1); rect4(4, 3, 2, 2, 1);
    set4(7, 12, 2); set4(17, 4, 2);
  },
  // conteneurs le long des bords, deux postes de sacs de sable en U qui couvrent le centre,
  // ouverts face aux portes ; caisses de munitions entre les deux
  militaire() {
    rect4(4, 3, 6, 2, 1); rect4(4, 9, 2, 5, 1); rect4(9, 8, 5, 2, 1);
    rect4(17, 9, 4, 1, 1); rect4(17, 9, 1, 2, 1);
    set4(8, 6, 2); set4(15, 13, 2);
  },
};
// arène construite par buildMap (le rendu en tire son thème) : en mode Histoire, ce n'est pas l'arène choisie sur l'accueil
export let mapId = 'entrepot';
export function buildMap(id) {
  mapId = PLANS[id] ? id : 'entrepot';
  map.fill(0); doors.length = 0; doorSet.clear();
  rect(0, 0, MW, 1, 1); rect(0, MH - 1, MW, 1, 1); rect(0, 0, 1, MH, 1); rect(MW - 1, 0, 1, MH, 1);
  const cx = MW / 2 | 0, cy = MH / 2 | 0;
  for (const [x, y] of [[cx - 1, 0], [cx, 0], [cx - 1, MH - 1], [cx, MH - 1], [0, cy - 1], [0, cy], [MW - 1, cy - 1], [MW - 1, cy]]) {
    map[y * MW + x] = 0; doors.push([x, y]); doorSet.add(y * MW + x);
  }
  PLANS[mapId](cx, cy);
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
