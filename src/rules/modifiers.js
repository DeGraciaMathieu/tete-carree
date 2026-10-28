// Effets des cartes de modificateurs et du combo sur le joueur.
// `mods` : niveaux des cartes prises ({ id: niveau }), `combo` : kills enchaînés.
import {
  COMBO_T, TENACE_BONUS, KILLS_PER_MULTIPLIER, FRENZY_MULTIPLIER, CADENCE_CD_MUL, SANSARMURE_CD_MUL, FRENZY_CD_MUL,
  ROLLAMMO_SHARE, ROLLAMMO_CAP,
} from '../config.js';

export const modLevel = (mods, id) => (mods && mods[id]) || 0;

export function multiplier(combo) { return 1 + Math.floor(combo / KILLS_PER_MULTIPLIER); }
export function frenzy(mods, combo) { return modLevel(mods, 'frenesie') > 0 && multiplier(combo) >= FRENZY_MULTIPLIER; }
export function fireMul(mods, combo) { return Math.pow(CADENCE_CD_MUL, modLevel(mods, 'cadence')) * (modLevel(mods, 'sansarmure') ? SANSARMURE_CD_MUL : 1) * (frenzy(mods, combo) ? FRENZY_CD_MUL : 1); }
export function comboTime(mods) { return COMBO_T + TENACE_BONUS * modLevel(mods, 'tenace'); }
export function rollMax(mods) { return 1 + modLevel(mods, 'double'); }
// Roulade tactique : munitions rendues par une roulade à une arme de recharge `refill` qui en a `ammo`,
// sans remplir au-delà de ROLLAMMO_CAP recharges.
export function rollAmmo(mods, refill, ammo) {
  const lvl = modLevel(mods, 'rollammo');
  if (!lvl || !refill || ammo === Infinity) return 0;
  return Math.max(0, Math.min(Math.ceil(refill * ROLLAMMO_SHARE * lvl), refill * ROLLAMMO_CAP - ammo));
}
