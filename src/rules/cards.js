// Tirage des trois cartes proposées entre deux vagues, pondéré par rareté.
import { MODS, RAR, CARDS_PER_PICK, MAJOR_EVERY, MAJOR_FROM_WAVE, SPECIALISTE_MIN_WEAPONS } from '../config.js';
import { modLevel } from './modifiers.js';

// Pacte (avantage et contrepartie) : ordinaire ou majeur.
export const isPact = m => m.rar === 'p' || m.rar === 'm';
const hasMajor = mods => MODS.some(m => m.rar === 'm' && modLevel(mods, m.id));
// Exclusions symétriques : une carte n'est pas proposée si une carte possédée l'exclut, ou si elle en exclut une.
const excluded = (m, mods) => (m.excl && m.excl.some(id => modLevel(mods, id))) || MODS.some(o => o.excl && modLevel(mods, o.id) && o.excl.includes(m.id));
// Pacte majeur : à partir de la fin de la vague MAJOR_FROM_WAVE, un seul par partie, jamais en démo.
const majorOk = (mods, wave, demo) => !demo && wave >= MAJOR_FROM_WAVE && !hasMajor(mods);
// Fins de vague où un pacte majeur est garanti (s'il en reste un de permis) : MAJOR_FROM_WAVE, puis toutes les MAJOR_EVERY vagues.
export function majorDue(wave) { return wave >= MAJOR_FROM_WAVE && (wave - MAJOR_FROM_WAVE) % MAJOR_EVERY === 0; }

// Jusqu'à CARDS_PER_PICK cartes distinctes parmi celles qui n'ont pas atteint leur niveau max.
// legend : Marché du diable a promis une Légendaire, tirée en premier. Le pacte n'est proposé que s'il en reste.
// Pacte majeur garanti (majorDue) : tiré juste après, au hasard parmi ceux encore permis.
// ctx : wave (vague qui vient de se terminer), demo, noPacts (ni pacte ni pacte majeur), weapons (armes débloquées :
// Spécialiste n'est proposé qu'avec un vrai choix d'arme), banned (ids bannis ou rachetés, jamais proposés),
// without (ids déjà sur la table), count (nombre de cartes, CARDS_PER_PICK par défaut), free (carte d'appoint de la
// boutique : ni Légendaire promise ni pacte majeur garanti).
export function rollCards(mods, rng, legend = false, ctx = {}) {
  const major = majorOk(mods, ctx.wave || 0, ctx.demo), count = ctx.count || CARDS_PER_PICK;
  const left = MODS.filter(m => modLevel(mods, m.id) < m.max && !excluded(m, mods) && (m.rar !== 'm' || major) && !(ctx.noPacts && isPact(m))
    && (m.id !== 'specialiste' || (ctx.weapons || 1) >= SPECIALISTE_MIN_WEAPONS)
    && !(ctx.banned && ctx.banned.includes(m.id)) && !(ctx.without && ctx.without.includes(m.id)));
  const legends = left.filter(m => m.rar === 'l');
  const pool = legends.length ? left : left.filter(m => m.id !== 'diable'), out = [];
  if (legend && legends.length && !ctx.free) { const m = legends[rng() * legends.length | 0]; out.push(m); pool.splice(pool.indexOf(m), 1); }
  const majors = major && majorDue(ctx.wave || 0) && !ctx.free ? pool.filter(m => m.rar === 'm') : [];
  if (majors.length) { const m = majors[rng() * majors.length | 0]; out.push(m); pool.splice(pool.indexOf(m), 1); }
  while (out.length < count && pool.length) {
    const tot = pool.reduce((a, m) => a + RAR[m.rar].w, 0);
    let x = rng() * tot, k = 0;
    for (; k < pool.length - 1; k++) { x -= RAR[pool[k].rar].w; if (x <= 0) break; }
    out.push(pool.splice(k, 1)[0]);
  }
  return out;
}
