// Requêtes sur la grille de l'arène. Lecture seule : `map` (0 sol, 1 mur, 2 caisse, 3 crevasse)
// et `blocks` (barricades et barils posés, indexés par tuile) ne sont jamais modifiés ici.
import { T, MW, MH } from '../config.js';

// 0 libre, 1 mur ou décor, 2 construction posée
export function tileAt(map, blocks, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return 1;
  const i = ty * MW + tx;
  return map[i] ? 1 : blocks.has(i) ? 2 : 0;
}
export function passable(map, tx, ty) { return tx >= 0 && ty >= 0 && tx < MW && ty < MH && map[ty * MW + tx] === 0; }
export function openT(map, blocks, tx, ty) { return passable(map, tx, ty) && !blocks.has(ty * MW + tx); }
// comme tileAt, mais les tirs passent au-dessus des crevasses
export function shotTile(map, blocks, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return 1;
  const i = ty * MW + tx, v = map[i];
  return v === 3 ? 0 : v ? 1 : blocks.has(i) ? 2 : 0;
}
export const isVoid = (map, x, y) => map[Math.floor(y / T) * MW + Math.floor(x / T)] === 3;
export function circleTouchesVoid(map, o, m) {
  const rr = o.r + m;
  for (let ty = Math.floor((o.y - rr) / T); ty <= Math.floor((o.y + rr) / T); ty++)
    for (let tx = Math.floor((o.x - rr) / T); tx <= Math.floor((o.x + rr) / T); tx++)
      if (tx >= 0 && ty >= 0 && tx < MW && ty < MH && map[ty * MW + tx] === 3) return true;
  return false;
}
// vrai si on peut marcher en ligne droite de a à b (ni mur ni vide)
export function walkLine(map, ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.max(1, d / 6 | 0);
  for (let k = 1; k <= n; k++) if (!passable(map, Math.floor((ax + (bx - ax) * k / n) / T), Math.floor((ay + (by - ay) * k / n) / T))) return false;
  return true;
}
// ligne de vue : bloquée par les murs et les constructions, pas par les crevasses
export function los(map, blocks, ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.max(1, d / 8 | 0);
  for (let k = 1; k < n; k++) {
    const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n;
    if (shotTile(map, blocks, Math.floor(x / T), Math.floor(y / T))) return false;
  }
  return true;
}
