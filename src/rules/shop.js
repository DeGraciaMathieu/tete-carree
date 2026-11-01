// Boutique de l'écran des cartes : prix de la relance, achats permis, rachat d'un pacte.
import { DIABLE_HP, MARCHANDAGE_DISCOUNT, MODS, REROLL_COST, REROLL_STEP, VERRE_HP } from '../config.js';
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

// Effets immédiats annulés par le rachat : vie max rendue (Marché du diable, Canon de verre), Légendaire promise
// annulée (Marché du diable), crans perdus (Sans répit). La vie actuelle ne change pas.
export function undoPact(id, { maxHp, legendNext, repit }) {
  return {
    maxHp: maxHp + (id === 'diable' ? DIABLE_HP : id === 'verre' ? VERRE_HP : 0),
    legendNext: id === 'diable' ? false : legendNext,
    repit: id === 'repit' ? 0 : repit,
  };
}

// Marchandage : prix en pièces après remise, arrondi au supérieur, jamais sous 1 ; un article gratuit reste gratuit.
export function discounted(price, mods) {
  const lvl = modLevel(mods, 'marchandage');
  return price && lvl ? Math.max(1, Math.ceil(price * (1 - MARCHANDAGE_DISCOUNT * lvl) - 1e-9)) : price;
}
