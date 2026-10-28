// Tirage des trois cartes proposées entre deux vagues, pondéré par rareté.
import { MODS, RAR } from '../config.js';
import { modLevel } from './modifiers.js';

// Jusqu'à trois cartes distinctes parmi celles qui n'ont pas atteint leur niveau max.
export function rollCards(mods, rng) {
  const pool = MODS.filter(m => modLevel(mods, m.id) < m.max), out = [];
  while (out.length < 3 && pool.length) {
    const tot = pool.reduce((a, m) => a + RAR[m.rar].w, 0);
    let x = rng() * tot, k = 0;
    for (; k < pool.length - 1; k++) { x -= RAR[pool[k].rar].w; if (x <= 0) break; }
    out.push(pool.splice(k, 1)[0]);
  }
  return out;
}
