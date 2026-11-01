// Composition des vagues et cadence d'apparition de la horde.
// File d'attente : 'z' zombie, 'd' diable, 'b' gonflé, 's' cracheur, 'a' blindé, 'pN' meute de N coureurs.
// Les ennemis sortent par la fin du tableau (pop).
import {
  WAVE_ZOMBIES_BASE, WAVE_ZOMBIES_PER_WAVE, WAVE_UNITS, PACK_BASE, PACK_RAND, PACK_WAVES_PER_RUNNER, PACK_WAVE_MAX,
  PRIME_PACK_BONUS, ELITE_COUNT_MUL, ELITE_PACK_MIN, SPAWN_DOUBLE_AFTER, SPAWN_BURST, SPAWN_GAP_START, SPAWN_GAP_STEP, SPAWN_GAP_MIN,
  SHOP_BAIT_ARMORED, SHOP_REPEL_MUL,
} from '../config.js';
import { modLevel } from './modifiers.js';

const unitCount = (u, n) => n >= u.from ? Math.floor((n - u.offset) * u.scale) : 0;
const queueKey = (u, rng) => u.key[0] + rng() * u.key[1];

// Élite : deux fois moins d'ennemis de chaque type, arrondi au supérieur, et des meutes plus petites.
const eliteCount = (c, mods) => modLevel(mods, 'elite') ? Math.ceil(c * ELITE_COUNT_MUL) : c;
const packSize = (k, mods) => modLevel(mods, 'elite') ? Math.max(ELITE_PACK_MIN, Math.round(k * ELITE_COUNT_MUL)) : k;

// Nombre d'ennemis de chaque type (meutes comptées une à une, `p`), sans tirage : l'Éclaireur du Comptoir l'annonce.
// buffs (Comptoir) : Répulsif retire une part de chaque type (au moins un zombie), Appât ajoute des Blindés.
export function waveCounts(n, mods, buffs) {
  const U = WAVE_UNITS, b = buffs || {}, c = k => eliteCount(k, mods), r = k => b.repulsif ? Math.floor(k * SHOP_REPEL_MUL) : k;
  return {
    z: Math.max(1, r(c(WAVE_ZOMBIES_BASE + n * WAVE_ZOMBIES_PER_WAVE))), d: r(c(unitCount(U.d, n))), b: r(c(unitCount(U.b, n))),
    s: r(c(unitCount(U.s, n))), a: r(c(unitCount(U.a, n))) + (b.appat ? SHOP_BAIT_ARMORED : 0), p: r(unitCount(U.p, n)),
  };
}

// Leurre (Comptoir) : les meutes n'ont pas les coureurs en plus de Prime de risque.
export function waveQueue(n, mods, rng, buffs) {
  const U = WAVE_UNITS, k = waveCounts(n, mods, buffs), prime = buffs && buffs.leurre ? 0 : PRIME_PACK_BONUS * modLevel(mods, 'prime');
  const q = [];
  for (let i = 0; i < k.z; i++) q.push(['z', queueKey(U.z, rng)]);
  for (let i = 0; i < k.d; i++) q.push(['d', queueKey(U.d, rng)]);
  for (let i = 0; i < k.b; i++) q.push(['b', queueKey(U.b, rng)]);
  for (let i = 0; i < k.s; i++) q.push(['s', queueKey(U.s, rng)]);
  for (let i = 0; i < k.a; i++) q.push(['a', queueKey(U.a, rng)]);
  for (let i = 0; i < k.p; i++) q.push(['p' + packSize(PACK_BASE + (rng() * PACK_RAND | 0) + Math.min(PACK_WAVE_MAX, n / PACK_WAVES_PER_RUNNER | 0) + prime, mods), queueKey(U.p, rng)]);
  q.sort((a, b) => a[1] - b[1]);
  return q.map(a => a[0]);
}

// Première vague où le type entre ('z', 'b', 'd', 's', 'a', 'p' pour les meutes) : le bestiaire l'affiche.
export function firstWave(type) {
  const u = WAVE_UNITS[type];
  if (!u.from) return 1;
  let n = u.from;
  while (!unitCount(u, n)) n++;
  return n;
}

// Nombre d'ennemis restant à sortir, une meute comptant pour chacun de ses coureurs.
export function queueCount(queue) { let c = 0; for (const t of queue) c += t[0] === 'p' ? +t.slice(1) : 1; return c; }

// Ennemis libérés à chaque apparition, et délai avant la suivante.
export function spawnBurst(wave) { return wave > SPAWN_DOUBLE_AFTER ? SPAWN_BURST : 1; }
export function spawnGap(wave) { return Math.max(SPAWN_GAP_MIN, SPAWN_GAP_START - wave * SPAWN_GAP_STEP); }
