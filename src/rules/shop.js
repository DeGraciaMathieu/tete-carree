// Boutique de l'écran des cartes : prix de la relance, achats permis, rachat d'un pacte.
import { MODS, REROLL_COST, REROLL_STEP } from '../config.js';
import { modLevel, takeAllCards } from './modifiers.js';

// Relance : REROLL_COST, puis REROLL_STEP de plus à chaque relance du même écran.
export function rerollCost(rerolls) { return REROLL_COST + REROLL_STEP * rerolls; }

// Carte en plus : une fois par écran, jamais sous Pas de pause (toutes les cartes y sont gagnées).
export function canBuyExtra(mods, bought) { return !bought && !takeAllCards(mods); }

// Pactes rachetables : les pactes ordinaires possédés, jamais un pacte majeur.
export function buybackable(mods) { return MODS.filter(m => m.rar === 'p' && modLevel(mods, m.id)); }

// Cartes après le rachat d'un pacte : il disparaît entièrement, quel que soit son niveau.
export function withoutPact(mods, id) {
  const out = { ...mods };
  delete out[id];
  return out;
}
