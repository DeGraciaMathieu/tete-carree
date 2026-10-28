// Tirage des trois cartes proposées entre deux vagues, pondéré par rareté.
import { MODS, RAR, CARDS_PER_PICK } from '../config.js';
import { modLevel } from './modifiers.js';

// Jusqu'à CARDS_PER_PICK cartes distinctes parmi celles qui n'ont pas atteint leur niveau max.
// legend : Marché du diable a promis une Légendaire, tirée en premier. Le pacte n'est proposé que s'il en reste.
export function rollCards(mods, rng, legend = false) {
  const left = MODS.filter(m => modLevel(mods, m.id) < m.max), legends = left.filter(m => m.rar === 'l');
  const pool = legends.length ? left : left.filter(m => m.id !== 'diable'), out = [];
  if (legend && legends.length) { const m = legends[rng() * legends.length | 0]; out.push(m); pool.splice(pool.indexOf(m), 1); }
  while (out.length < CARDS_PER_PICK && pool.length) {
    const tot = pool.reduce((a, m) => a + RAR[m.rar].w, 0);
    let x = rng() * tot, k = 0;
    for (; k < pool.length - 1; k++) { x -= RAR[pool[k].rar].w; if (x <= 0) break; }
    out.push(pool.splice(k, 1)[0]);
  }
  return out;
}
