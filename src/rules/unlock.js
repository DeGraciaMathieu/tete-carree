// Déblocage des armes au fil du score.
import { UNLOCK_REFILLS, W } from '../config.js';

// Index des armes encore verrouillées dont le seuil est atteint, dans l'ordre de l'arsenal.
export function weaponsToUnlock(score, unlocked) {
  return W.flatMap((w, i) => !unlocked[i] && score >= w.unlock ? [i] : []);
}

// Une arme débloquée arrive avec deux recharges de munitions.
export function ammoOnUnlock(i) { return W[i].refill * UNLOCK_REFILLS; }
