// Résolution des coups : bouclier du blindé, protection et Second souffle du joueur.
import { ROLL } from '../config.js';
import { modLevel } from './modifiers.js';

// kind : 'blast' (explosions, ondes de choc) et 'ap' (railgun) ignorent le bouclier du blindé.
// Un coup venu de face (direction du coup opposée au regard) s'écrase sur le bouclier :
// 85 % pour le bouclier, 15 % pour l'ennemi. Le blindé encaisse aussi bien moins de recul.
export function resolveEnemyHit(e, dmg, dx, dy, knock, kind) {
  if (e.type !== 'a') return { blocked: false, knock, shieldDmg: 0, hpDmg: dmg };
  knock *= kind === 'blast' ? .45 : .2;
  const fl = Math.hypot(e.fx, e.fy) || 1;
  if (e.shield > 0 && kind !== 'blast' && kind !== 'ap' && (dx || dy) && (dx * e.fx + dy * e.fy) / fl < -.45)
    return { blocked: true, knock, shieldDmg: dmg * .85, hpDmg: dmg * .15 };
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
  return { hp: Math.round(maxHp * .4), invuln: 1.6 };
}
