// Résolution des coups : bouclier du blindé, protection et Second souffle du joueur, pactes de la bourse.
import {
  ROLL, ARMOR_KNOCK_MUL, ARMOR_BLAST_KNOCK_MUL, SHIELD_FRONT_DOT, SHIELD_ABSORB, SHIELD_LEAK, SECOND_WIND_HP, SECOND_WIND_INVULN,
  ASSURANCE_MIN, BOUCLIER_COIN_HP, CREDIT_HURT_MUL,
} from '../config.js';
import { modLevel } from './modifiers.js';

// kind : 'blast' (explosions, ondes de choc) et 'ap' (railgun) ignorent le bouclier du blindé.
// Un coup venu de face (direction du coup opposée au regard) s'écrase sur le bouclier :
// 85 % pour le bouclier, 15 % pour l'ennemi. Le blindé encaisse aussi bien moins de recul.
export function resolveEnemyHit(e, dmg, dx, dy, knock, kind) {
  if (e.type !== 'a') return { blocked: false, knock, shieldDmg: 0, hpDmg: dmg };
  knock *= kind === 'blast' ? ARMOR_BLAST_KNOCK_MUL : ARMOR_KNOCK_MUL;
  const fl = Math.hypot(e.fx, e.fy) || 1;
  if (e.shield > 0 && kind !== 'blast' && kind !== 'ap' && (dx || dy) && (dx * e.fx + dy * e.fy) / fl < SHIELD_FRONT_DOT)
    return { blocked: true, knock, shieldDmg: dmg * SHIELD_ABSORB, hpDmg: dmg * SHIELD_LEAK };
  return { blocked: false, knock, shieldDmg: 0, hpDmg: dmg };
}

// Le joueur ne prend aucun dégât pendant la phase active de la roulade ni sous invulnérabilité.
export function playerProtected(player) {
  if (player.roll && player.roll.t >= ROLL.A && player.roll.t < ROLL.B) return true;
  return player.invuln > 0;
}

// Second souffle : une fois par partie, un coup mortel laisse à 40 % de la vie max.
export function secondWind(hp, maxHp, mods, souffleUsed) {
  if (!(hp <= 0 && modLevel(mods, 'souffle') && !souffleUsed)) return null;
  return { hp: Math.round(maxHp * SECOND_WIND_HP), invuln: SECOND_WIND_INVULN };
}

// Bouclier d'or : un coup se paie d'abord en pièces (BOUCLIER_COIN_HP PV par pièce, arrondi à la pièce supérieure),
// le reste passe sur la vie. Renvoie les pièces payées et les dégâts restants.
export function coinShield(mods, dmg, money) {
  if (!modLevel(mods, 'bouclier') || money <= 0 || dmg <= 0) return { coins: 0, dmg };
  const coins = Math.min(money, Math.ceil(dmg / BOUCLIER_COIN_HP));
  return { coins, dmg: Math.max(0, dmg - coins * BOUCLIER_COIN_HP) };
}
// Crédit : à découvert, les coups font plus de dégâts.
export function debtHurtMul(mods, money) { return modLevel(mods, 'credit') && money < 0 ? CREDIT_HURT_MUL : 1; }
// Assurance : un coup mortel est évité si la bourse compte ASSURANCE_MIN pièces et que l'assurance n'a pas servi cette vague.
export function insured(mods, hp, money, used) { return !!modLevel(mods, 'assurance') && hp <= 0 && money >= ASSURANCE_MIN && !used; }
