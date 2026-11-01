// Ce que rapporte un ennemi abattu : points, soin de Soif de sang, caisse et pièces au sol.
import { ASSURANCE_FEE, CASINO_CHANCE, CASINO_LOSS, CASINO_WIN, PIEGEE_COIN_LIFE, AVARICE_BLINK, AVARICE_COIN_LIFE, AVARICE_MUL, COIN_BLINK, COIN_CHANCE, COIN_LIFE, COIN_VALUE, COIN_WAVE_BONUS, CUPIDITE_BONUS, CUPIDITE_LOSS, MERCENAIRE_COINS, MERCENAIRE_POINTS_MUL, MIDAS_VALUE, PILLARD_CHANCE, POCHES_LIFE, SANGDOR_HEAL, SHOP_COIN_LIFE, SHOP_DIG_CHANCE, KILL_POINTS, WAVE_BONUS, UNEVIE_POINTS_MUL, SABLIER_POINTS_MUL, ELITE_POINTS_MUL, SILENCE_POINTS_MUL, DROP_CHANCE, DROP_HP_CHANCE, SOIF_MULTIPLIER, PRIME_POINTS_MUL, CHAIR_POINTS_MUL, VAMPIRE_HEAL } from '../config.js';
import { boxKind, modLevel, quittePoints } from './modifiers.js';

// Types d'ennemis : 'z' zombie, 'b' gonflé, 'r' coureur, 's' cracheur, 'a' blindé, 'd' diable.
const byType = (table, type) => type in table ? table[type] : table.d;

// Multiplicateur de points des pactes majeurs, sur les kills et le bonus de vague.
const majorPoints = mods => (modLevel(mods, 'unevie') ? UNEVIE_POINTS_MUL : 1) * (modLevel(mods, 'sablier') ? SABLIER_POINTS_MUL : 1)
  * (modLevel(mods, 'elite') ? ELITE_POINTS_MUL : 1) * (modLevel(mods, 'silence') ? SILENCE_POINTS_MUL : 1);

// Mercenaire : les kills rapportent moins de points.
export function killPoints(type, mods, multiplier) {
  const base = type === 'b' ? KILL_POINTS.b * Math.pow(CHAIR_POINTS_MUL, modLevel(mods, 'chair')) : byType(KILL_POINTS, type);
  return Math.round(base * multiplier * Math.pow(PRIME_POINTS_MUL, modLevel(mods, 'prime')) * quittePoints(mods) * majorPoints(mods)
    * (modLevel(mods, 'mercenaire') ? MERCENAIRE_POINTS_MUL : 1));
}

// Bonus de fin de vague : WAVE_BONUS × numéro de vague, ×3 sous Une seule vie.
export function waveBonus(wave, mods) { return WAVE_BONUS * wave * (modLevel(mods, 'unevie') ? UNEVIE_POINTS_MUL : 1); }

// Tout ou rien : pendant une vague, les points d'un kill vont dans la cagnotte au lieu du score.
export function potsKill(mods, waveActive) { return !!modLevel(mods, 'toutourien') && waveActive; }
// Cagnotte après un coup encaissé : Tout ou rien la vide.
export function potAfterHit(mods, pot) { return modLevel(mods, 'toutourien') ? 0 : pot; }

// Points de vie rendus par le kill : Soif de sang à partir de ×3 (dès ×1 sous Vampire), plus le soin de Vampire.
export function soifHeal(mods, multiplier) {
  const soif = modLevel(mods, 'soif'), vampire = modLevel(mods, 'vampire');
  return (vampire ? VAMPIRE_HEAL : 0) + (soif && (vampire || multiplier >= SOIF_MULTIPLIER) ? soif : 0);
}

// Caisse lâchée par l'ennemi : 'hp', 'ammo' ou null. Rien ne tombe au-dessus d'une crevasse.
export function rollDrop(type, onVoid, rng, mods) {
  if (!(rng() < byType(DROP_CHANCE, type) && !onVoid)) return null;
  return boxKind(mods, rng(), DROP_HP_CHANCE);
}

// Pièces lâchées par l'ennemi (0 si rien). Comme pour les caisses, rien ne tombe au-dessus d'une crevasse.
// Fouille (Comptoir) : les zombies en lâchent plus souvent. Pillard : plus de chances pour tous ; Avarice : deux fois
// plus de pièces ; Cupidité : une de plus quand il en lâche ; Mercenaire : une de plus à chaque kill.
export function rollCoins(type, onVoid, rng, buffs, mods) {
  const base = type === 'z' && buffs && buffs.fouille ? SHOP_DIG_CHANCE : byType(COIN_CHANCE, type);
  const hit = rng() < Math.min(1, base + PILLARD_CHANCE * modLevel(mods, 'pillard'));
  if (onVoid || modLevel(mods, 'pauvrete')) return 0; // Vœu de pauvreté : plus aucune pièce
  const drop = hit ? byType(COIN_VALUE, type) * (modLevel(mods, 'avarice') ? AVARICE_MUL : 1) + (modLevel(mods, 'cupidite') ? CUPIDITE_BONUS : 0) : 0;
  return drop + (modLevel(mods, 'mercenaire') ? MERCENAIRE_COINS : 0);
}

// Durée d'une pièce au sol (s) : Monnaie piégée, Pièces collantes (Comptoir) ou Avarice changent la base, Poches profondes l'allonge.
export function coinLife(mods, buffs) {
  const base = modLevel(mods, 'piegee') ? PIEGEE_COIN_LIFE : buffs && buffs.collantes ? SHOP_COIN_LIFE : modLevel(mods, 'avarice') ? AVARICE_COIN_LIFE : COIN_LIFE;
  return base + POCHES_LIFE * modLevel(mods, 'poches');
}
// Dernières secondes au sol où la pièce clignote : raccourcies sous Avarice ; aucune sous Monnaie piégée, où elle rougit.
export function coinBlink(mods) { return modLevel(mods, 'piegee') ? 0 : modLevel(mods, 'avarice') ? AVARICE_BLINK : COIN_BLINK; }
// Valeur d'une pièce ramassée : Midas la double, sauf une pièce perdue sous Cupidité (lost).
export function coinWorth(mods, lost) { return !lost && modLevel(mods, 'midas') ? MIDAS_VALUE : 1; }
// PV rendus par une pièce ramassée : Sang d'or.
export function coinHeal(mods) { return modLevel(mods, 'sangdor') ? SANGDOR_HEAL : 0; }
// Pièces qui tombent de la bourse sur un coup encaissé : Cupidité, jamais plus que la bourse.
export function coinsLostOnHit(mods, money) { return modLevel(mods, 'cupidite') ? Math.min(Math.max(0, money), CUPIDITE_LOSS) : 0; }
// Assurance : cotisation prise sur la bourse en fin de vague.
export function insuranceFee(mods, money) { return modLevel(mods, 'assurance') && money > 0 ? Math.floor(money * ASSURANCE_FEE) : 0; }
// Casino : bourse après le pile ou face de fin de vague (r entre 0 et 1) ; une bourse vide ou négative ne tire rien.
export function casinoPurse(mods, money, r) {
  if (!modLevel(mods, 'casino') || money <= 0) return money;
  return r < CASINO_CHANCE ? money * CASINO_WIN : Math.floor(money * CASINO_LOSS);
}

// Pièces versées en fin de vague : COIN_WAVE_BONUS × numéro de vague ; aucune sous Vœu de pauvreté.
export function waveCoins(wave, mods) { return modLevel(mods, 'pauvrete') ? 0 : COIN_WAVE_BONUS * wave; }
