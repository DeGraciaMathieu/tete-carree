// Composition des vagues et cadence d'apparition de la horde.
// File d'attente : 'z' zombie, 'd' diable, 'b' gonflé, 's' cracheur, 'a' blindé, 'pN' meute de N coureurs.
// Les ennemis sortent par la fin du tableau (pop).
import { modLevel } from './modifiers.js';

export function waveQueue(n, mods, rng) {
  const z = 8 + n * 5, d = n >= 3 ? Math.floor((n - 1) * 1.4) : 0, bl = n >= 2 ? Math.floor(n * .7) : 0, pk = n >= 4 ? Math.floor((n - 2) * .6) : 0, sc = n >= 5 ? Math.floor((n - 3) * .7) : 0, ar = n >= 6 ? Math.floor((n - 4) * .5) : 0;
  const q = [];
  for (let i = 0; i < z; i++) q.push(['z', rng()]);
  for (let i = 0; i < d; i++) q.push(['d', rng() * .7]);
  for (let i = 0; i < bl; i++) q.push(['b', .2 + rng() * .8]);
  for (let i = 0; i < sc; i++) q.push(['s', .1 + rng() * .8]);
  for (let i = 0; i < ar; i++) q.push(['a', .3 + rng() * .7]);
  for (let i = 0; i < pk; i++) q.push(['p' + (3 + (rng() * 3 | 0) + Math.min(3, n / 4 | 0) + 2 * modLevel(mods, 'prime')), .1 + rng() * .9]);
  q.sort((a, b) => a[1] - b[1]);
  return q.map(a => a[0]);
}

// Nombre d'ennemis restant à sortir, une meute comptant pour chacun de ses coureurs.
export function queueCount(queue) { let c = 0; for (const t of queue) c += t[0] === 'p' ? +t.slice(1) : 1; return c; }

// Ennemis libérés à chaque apparition, et délai avant la suivante.
export function spawnBurst(wave) { return wave > 6 ? 2 : 1; }
export function spawnGap(wave) { return Math.max(.16, .85 - wave * .05); }
