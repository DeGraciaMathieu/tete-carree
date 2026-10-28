// Effets des cartes de modificateurs et du combo sur le joueur.
// `mods` : niveaux des cartes prises ({ id: niveau }), `combo` : kills enchaînés.
import { COMBO_T, TENACE_BONUS, KILLS_PER_MULTIPLIER, FRENZY_MULTIPLIER } from '../config.js';

export const modLevel = (mods, id) => (mods && mods[id]) || 0;

export function multiplier(combo) { return 1 + Math.floor(combo / KILLS_PER_MULTIPLIER); }
export function frenzy(mods, combo) { return modLevel(mods, 'frenesie') > 0 && multiplier(combo) >= FRENZY_MULTIPLIER; }
export function fireMul(mods, combo) { return Math.pow(.8, modLevel(mods, 'cadence')) * (modLevel(mods, 'sansarmure') ? .5 : 1) * (frenzy(mods, combo) ? .75 : 1); }
export function comboTime(mods) { return COMBO_T + TENACE_BONUS * modLevel(mods, 'tenace'); }
export function rollMax(mods) { return 1 + modLevel(mods, 'double'); }
