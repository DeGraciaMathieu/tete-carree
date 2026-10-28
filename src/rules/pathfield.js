// Champ de distances (Dijkstra) qui guide la horde vers le joueur, et pas suivant d'un ennemi.
// Les constructions se traversent mais coûtent cher : la horde les contourne ou les défonce.
import { MH, MW, PATH_BLOCK_COST, T } from '../config.js';
import { passable, openT } from './map.js';

export const UNREACHABLE = 1e9;
const NB = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

// File de priorité minimale (tas binaire) sur des index de tuiles.
function createHeap() {
  const hI = [], hD = [];
  function push(i, d) {
    hI.push(i); hD.push(d); let k = hI.length - 1;
    while (k > 0) { const p = (k - 1) >> 1; if (hD[p] <= hD[k]) break; [hI[p], hI[k]] = [hI[k], hI[p]]; [hD[p], hD[k]] = [hD[k], hD[p]]; k = p; }
  }
  function pop() {
    const i = hI[0], d = hD[0], li = hI.pop(), ld = hD.pop();
    if (hI.length) {
      hI[0] = li; hD[0] = ld; let k = 0; const n = hI.length;
      for (;;) {
        const l = 2 * k + 1, r = l + 1; let m = k;
        if (l < n && hD[l] < hD[m]) m = l; if (r < n && hD[r] < hD[m]) m = r;
        if (m === k) break;
        [hI[m], hI[k]] = [hI[k], hI[m]]; [hD[m], hD[k]] = [hD[k], hD[m]]; k = m;
      }
    }
    return [i, d];
  }
  return { push, pop, size: () => hI.length };
}

// viaVoid : on fait comme si le vide se traversait (sert à trouver le bord le plus proche du joueur)
function walkable(map, i, viaVoid) { const v = map[i]; return v === 0 || (viaVoid && v === 3); }
function relax(map, blocks, heap, D, viaVoid) {
  while (heap.size()) {
    const [i, d] = heap.pop(); if (d > D[i]) continue;
    const x = i % MW, y = i / MW | 0;
    for (const [dx, dy] of NB) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
      const ni = ny * MW + nx;
      if (!walkable(map, ni, viaVoid)) continue;
      if (dx && dy) {
        const a = y * MW + nx, b = ny * MW + x;
        if (!walkable(map, a, viaVoid) || blocks.has(a) || !walkable(map, b, viaVoid) || blocks.has(b)) continue;
      }
      const c = (dx && dy ? 1.414 : 1) + (blocks.has(ni) ? PATH_BLOCK_COST : 0);
      if (d + c < D[ni]) { D[ni] = d + c; heap.push(ni, d + c); }
    }
  }
}

// Distance de chaque tuile au joueur, posté sur la tuile (ptx, pty). Renvoie un nouveau tableau.
export function computeField(map, blocks, ptx, pty) {
  const dist = new Float32Array(MW * MH);
  const s = pty * MW + ptx;
  // 1. vrais chemins jusqu'au joueur : la horde contourne le vide
  let heap = createHeap();
  dist.fill(UNREACHABLE); dist[s] = 0; heap.push(s, 0); relax(map, blocks, heap, dist, false);
  // 2. zones coupées du joueur par le vide : chaque zone converge vers son bord le plus proche du joueur
  let cut = false;
  for (let i = 0; i < dist.length; i++) if (map[i] === 0 && dist[i] > 1e8) { cut = true; break; }
  if (!cut) return dist;
  const distV = new Float32Array(MW * MH);
  heap = createHeap();
  distV.fill(UNREACHABLE); distV[s] = 0; heap.push(s, 0); relax(map, blocks, heap, distV, true);
  heap = createHeap();
  for (let i = 0; i < dist.length; i++) if (map[i] === 0 && dist[i] > 1e8 && distV[i] < 1e8) { dist[i] = 1000 + distV[i]; heap.push(i, dist[i]); }
  relax(map, blocks, heap, dist, false);
  return dist;
}

// Centre de la tuile voisine qui rapproche le plus du joueur, ou null si aucune.
export function nextStep(map, blocks, dist, x, y) {
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  if (!passable(map, tx, ty)) return null;
  let bestD = dist[ty * MW + tx], bi = -1;
  for (const [dx, dy] of NB) {
    const nx = tx + dx, ny = ty + dy;
    if (!passable(map, nx, ny)) continue;
    if (dx && dy && (!openT(map, blocks, tx + dx, ty) || !openT(map, blocks, tx, ty + dy))) continue;
    const v = dist[ny * MW + nx];
    if (v < bestD) { bestD = v; bi = ny * MW + nx; }
  }
  if (bi < 0) return null;
  return [(bi % MW) * T + T / 2, (bi / MW | 0) * T + T / 2];
}
