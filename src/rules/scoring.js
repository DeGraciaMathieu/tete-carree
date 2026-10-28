// Ce que rapporte un ennemi abattu : points, soin de Soif de sang, caisse au sol.
import { KILL_POINTS, DROP_CHANCE, SOIF_MULTIPLIER } from '../config.js';
import { modLevel } from './modifiers.js';

// Types d'ennemis : 'z' zombie, 'b' gonflé, 'r' coureur, 's' cracheur, 'a' blindé, 'd' diable.
const byType = (table, type) => type in table ? table[type] : table.d;

export function killPoints(type, mods, multiplier) {
  const base = type === 'b' ? KILL_POINTS.b * Math.pow(2, modLevel(mods, 'chair')) : byType(KILL_POINTS, type);
  return Math.round(base * multiplier * Math.pow(1.5, modLevel(mods, 'prime')));
}

// Points de vie rendus par le kill (0 sans Soif de sang ou sous ×3).
export function soifHeal(mods, multiplier) {
  const soif = modLevel(mods, 'soif');
  return soif && multiplier >= SOIF_MULTIPLIER ? soif : 0;
}

// Caisse lâchée par l'ennemi : 'hp', 'ammo' ou null. Rien ne tombe au-dessus d'une crevasse.
export function rollDrop(type, onVoid, rng) {
  if (!(rng() < byType(DROP_CHANCE, type) && !onVoid)) return null;
  return rng() < .5 ? 'hp' : 'ammo';
}
