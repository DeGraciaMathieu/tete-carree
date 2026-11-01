// Champ de distances (Dijkstra) qui guide la horde vers le joueur, et pas suivant d'un ennemi.
// Les constructions se traversent mais coûtent cher : la horde les contourne ou les défonce.
import { MH, MW, PATH_BLOCK_COST, T } from '../config.js';
import { passable, openT } from './map.js';

export const UNREACHABLE = 1e9;
const NB = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

// File de priorité minimale (tas binaire) sur des index de tuiles.
// Sans allocation par opération (le champ est recalculé plusieurs fois par seconde) : tableaux typés
// qui doublent quand ils sont pleins, et pop() range la distance extraite dans heap.out[0].
function createHeap() {
  let hI = new Int32Array(MW * MH), hD = new Float64Array(MW * MH), n = 0;
  const out = new Float64Array(1);
  function swap(j, k) { const ti = hI[j], td = hD[j]; hI[j] = hI[k]; hD[j] = hD[k]; hI[k] = ti; hD[k] = td; }
  function push(i, d) {
    if (n === hI.length) { const gI = new Int32Array(n * 2), gD = new Float64Array(n * 2); gI.set(hI); gD.set(hD); hI = gI; hD = gD; }
    hI[n] = i; hD[n] = d; let k = n++;
    while (k > 0) { const p = (k - 1) >> 1; if (hD[p] <= hD[k]) break; swap(p, k); k = p; }
  }
  function pop() {
    const i = hI[0]; out[0] = hD[0]; n--;
    if (n) {
      hI[0] = hI[n]; hD[0] = hD[n]; let k = 0;
      for (;;) {
        const l = 2 * k + 1, r = l + 1; let m = k;
        if (l < n && hD[l] < hD[m]) m = l; if (r < n && hD[r] < hD[m]) m = r;
        if (m === k) break;
        swap(m, k); k = m;
      }
    }
    return i;
  }
  return { push, pop, out, size: () => n };
}

// viaVoid : on fait comme si le vide se traversait (sert à trouver le bord le plus proche du joueur)
function walkable(map, i, viaVoid) { const v = map[i]; return v === 0 || (viaVoid && v === 3); }
function relax(map, blocks, heap, D, viaVoid) {
  while (heap.size()) {
    const i = heap.pop(), d = heap.out[0]; if (d > D[i]) continue;
    const x = i % MW, y = i / MW | 0;
    for (let k = 0; k < NB.length; k++) {
      const dx = NB[k][0], dy = NB[k][1];
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
// Float64 comme les distances du tas : avec un stockage Float32, l'arrondi faisait sauter des tuiles
// (jamais propagées) et réinsérer les autres des dizaines de fois.
export function computeField(map, blocks, ptx, pty) {
  const dist = new Float64Array(MW * MH);
  const s = pty * MW + ptx;
  // 1. vrais chemins jusqu'au joueur : la horde contourne le vide
  let heap = createHeap();
  dist.fill(UNREACHABLE); dist[s] = 0; heap.push(s, 0); relax(map, blocks, heap, dist, false);
  // 2. zones coupées du joueur par le vide : chaque zone converge vers son bord le plus proche du joueur
  let cut = false;
  for (let i = 0; i < dist.length; i++) if (map[i] === 0 && dist[i] > 1e8) { cut = true; break; }
  if (!cut) return dist;
  const distV = new Float64Array(MW * MH);
  heap = createHeap();
  distV.fill(UNREACHABLE); distV[s] = 0; heap.push(s, 0); relax(map, blocks, heap, distV, true);
  heap = createHeap();
  for (let i = 0; i < dist.length; i++) if (map[i] === 0 && dist[i] > 1e8 && distV[i] < 1e8) { dist[i] = 1000 + distV[i]; heap.push(i, dist[i]); }
  relax(map, blocks, heap, dist, false);
  return dist;
}

// Tuile voisine qui rapproche le plus du joueur (index ty * MW + tx), ou -1 si aucune. Un index plutôt
// qu'un couple de coordonnées : appelé pour chaque ennemi à chaque image, sans allocation.
export function nextStep(map, blocks, dist, x, y) {
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  if (!passable(map, tx, ty)) return -1;
  let bestD = dist[ty * MW + tx], bi = -1;
  for (let k = 0; k < NB.length; k++) {
    const dx = NB[k][0], dy = NB[k][1], nx = tx + dx, ny = ty + dy;
    if (!passable(map, nx, ny)) continue;
    if (dx && dy && (!openT(map, blocks, tx + dx, ty) || !openT(map, blocks, tx, ty + dy))) continue;
    const v = dist[ny * MW + nx];
    if (v < bestD) { bestD = v; bi = ny * MW + nx; }
  }
  return bi;
}
