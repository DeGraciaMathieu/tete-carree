// Effets des cartes de modificateurs et du combo sur le joueur.
// `mods` : niveaux des cartes prises ({ id: niveau }), `combo` : kills enchaînés.
import {
  COMBO_T, TENACE_BONUS, KILLS_PER_MULTIPLIER, FRENZY_MULTIPLIER, CADENCE_CD_MUL, SANSARMURE_CD_MUL, FRENZY_CD_MUL,
  ROLLAMMO_SHARE, ROLLAMMO_CAP, FIEVRE_KILLS_PER_MULTIPLIER, FIEVRE_COMBO_MUL, ARTIFICIER_RADIUS_MUL, FRAG_SHARDS,
  EPAULE_KNOCK, EPAULE_KNOCK_LVL,
} from '../config.js';

export const modLevel = (mods, id) => (mods && mods[id]) || 0;

// Fièvre : un cran tous les FIEVRE_KILLS_PER_MULTIPLIER kills au lieu de KILLS_PER_MULTIPLIER.
export function multiplier(combo, mods) { return 1 + Math.floor(combo / (modLevel(mods, 'fievre') ? FIEVRE_KILLS_PER_MULTIPLIER : KILLS_PER_MULTIPLIER)); }
export function frenzy(mods, combo) { return modLevel(mods, 'frenesie') > 0 && multiplier(combo, mods) >= FRENZY_MULTIPLIER; }
export function fireMul(mods, combo) { return Math.pow(CADENCE_CD_MUL, modLevel(mods, 'cadence')) * (modLevel(mods, 'sansarmure') ? SANSARMURE_CD_MUL : 1) * (frenzy(mods, combo) ? FRENZY_CD_MUL : 1); }
export function comboTime(mods) { return (COMBO_T + TENACE_BONUS * modLevel(mods, 'tenace')) * (modLevel(mods, 'fievre') ? FIEVRE_COMBO_MUL : 1); }
export function rollMax(mods) { return 1 + modLevel(mods, 'double'); }
// Roulade tactique : munitions rendues par une roulade à une arme de recharge `refill` qui en a `ammo`,
// sans remplir au-delà de ROLLAMMO_CAP recharges.
export function rollAmmo(mods, refill, ammo) {
  const lvl = modLevel(mods, 'rollammo');
  if (!lvl || !refill || ammo === Infinity) return 0;
  return Math.max(0, Math.min(Math.ceil(refill * ROLLAMMO_SHARE * lvl), refill * ROLLAMMO_CAP - ammo));
}
// Artificier : rayon d'explosion des grenades et des roquettes.
export function blastRadius(mods, base) { return base * Math.pow(ARTIFICIER_RADIUS_MUL, modLevel(mods, 'artificier')); }
// Fragmentation : éclats projetés par une grenade qui explose.
export function fragShards(mods) { return FRAG_SHARDS * modLevel(mods, 'frag'); }
// Coup d'épaule : recul infligé par la roulade aux ennemis traversés (0 sans la carte).
export function shoveKnock(mods) {
  const lvl = modLevel(mods, 'epaule');
  return lvl ? EPAULE_KNOCK + EPAULE_KNOCK_LVL * (lvl - 1) : 0;
}
