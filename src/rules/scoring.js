// Ce que rapporte un ennemi abattu : points, soin de Soif de sang, caisse au sol.
import { KILL_POINTS, DROP_CHANCE, DROP_HP_CHANCE, SOIF_MULTIPLIER, PRIME_POINTS_MUL, CHAIR_POINTS_MUL, VAMPIRE_HEAL } from '../config.js';
import { modLevel, quittePoints } from './modifiers.js';

// Types d'ennemis : 'z' zombie, 'b' gonflé, 'r' coureur, 's' cracheur, 'a' blindé, 'd' diable.
const byType = (table, type) => type in table ? table[type] : table.d;

export function killPoints(type, mods, multiplier) {
  const base = type === 'b' ? KILL_POINTS.b * Math.pow(CHAIR_POINTS_MUL, modLevel(mods, 'chair')) : byType(KILL_POINTS, type);
  return Math.round(base * multiplier * Math.pow(PRIME_POINTS_MUL, modLevel(mods, 'prime')) * quittePoints(mods));
}

// Points de vie rendus par le kill : Soif de sang à partir de ×3 (dès ×1 sous Vampire), plus le soin de Vampire.
export function soifHeal(mods, multiplier) {
  const soif = modLevel(mods, 'soif'), vampire = modLevel(mods, 'vampire');
  return (vampire ? VAMPIRE_HEAL : 0) + (soif && (vampire || multiplier >= SOIF_MULTIPLIER) ? soif : 0);
}

// Caisse lâchée par l'ennemi : 'hp', 'ammo' ou null. Rien ne tombe au-dessus d'une crevasse.
export function rollDrop(type, onVoid, rng) {
  if (!(rng() < byType(DROP_CHANCE, type) && !onVoid)) return null;
  return rng() < DROP_HP_CHANCE ? 'hp' : 'ammo';
}
