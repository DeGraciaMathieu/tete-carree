// Effets des cartes de modificateurs et du combo sur le joueur.
// `mods` : niveaux des cartes prises ({ id: niveau }), `combo` : kills enchaînés.
import {
  COMBO_T, TENACE_BONUS, KILLS_PER_MULTIPLIER, FRENZY_MULTIPLIER, CADENCE_CD_MUL, SANSARMURE_CD_MUL, FRENZY_CD_MUL,
  ROLLAMMO_SHARE, ROLLAMMO_CAP, FIEVRE_KILLS_PER_MULTIPLIER, FIEVRE_COMBO_MUL, ARTIFICIER_RADIUS_MUL, FRAG_SHARDS,
  EPAULE_KNOCK, EPAULE_KNOCK_LVL, COMBO_HIT_DRAIN, REGEN_DELAY, REGEN_RATE, ROLL, T, WAVE_BREAK, BOX_PERIOD_MIN, BOX_PERIOD_RAND,
  QUITTE_POINTS_MUL, POUDRE_RADIUS_MUL, POUDRE_SELF_MUL, PORTANT_RANGE, PORTANT_NEAR_MUL, PORTANT_FAR_MUL, RAVITO_PERIOD_MUL,
  REPIT_MAX, REPIT_BREAK_MUL, FIDELE_PISTOL_MUL, VAMPIRE_DRAIN, BRULEE_ROLL_CD_MUL, BRULEE_ROLL_HP, RACINE_DAMAGE_MUL,
  RACINE_SPEED_MUL, VERRE_DAMAGE_MUL, SABLIER_DRAIN, SABLIER_HOLD, ELITE_HP_MUL, ELITE_SPEED_MUL,
  ENTRAVE_SPEED_MUL, ENTRAVE_DAMAGE_MUL, MITRAILLE_CD_MUL, MITRAILLE_AMMO_COST, MITRAILLE_PISTOL_REFILL, W,
  TOUTOURIEN_KILLS_PER_MULTIPLIER, SANSPAUSE_BREAK, SPECIALISTE_DAMAGE_MUL, AVEUGLE_DAMAGE_MUL, LOURDE_DAMAGE_MUL, LOURDE_KNOCK_MUL, LOURDE_SELF_PUSH, LOURDE_SPREAD,
  SHOP_DEPART_BONUS, SHOP_FUSE_T, SHOP_HEAVY_MUL, SHOP_MAG_MUL, SHOP_SCOPE_MUL,
} from '../config.js';

export const modLevel = (mods, id) => (mods && mods[id]) || 0;
// Effets du Comptoir actifs jusqu'à la fin de la vague (`buffs` : { id: valeur }, valeur = arme visée pour l'Armurerie).
const buff = (buffs, id) => (buffs && buffs[id]) || 0;

// Fièvre : un cran tous les FIEVRE_KILLS_PER_MULTIPLIER kills au lieu de KILLS_PER_MULTIPLIER.
// Tout ou rien : tous les TOUTOURIEN_KILLS_PER_MULTIPLIER kills. bonus : crans gagnés par Sans répit, qui s'ajoutent à ceux du combo.
const killsPerMultiplier = mods => modLevel(mods, 'toutourien') ? TOUTOURIEN_KILLS_PER_MULTIPLIER : modLevel(mods, 'fievre') ? FIEVRE_KILLS_PER_MULTIPLIER : KILLS_PER_MULTIPLIER;
export function multiplier(combo, mods, bonus = 0) { return 1 + bonus + Math.floor(combo / killsPerMultiplier(mods)); }
export function frenzy(mods, combo, bonus = 0) { return modLevel(mods, 'frenesie') > 0 && multiplier(combo, mods, bonus) >= FRENZY_MULTIPLIER; }
export function fireMul(mods, combo, bonus = 0) { return Math.pow(CADENCE_CD_MUL, modLevel(mods, 'cadence')) * (modLevel(mods, 'sansarmure') ? SANSARMURE_CD_MUL : 1) * (frenzy(mods, combo, bonus) ? FRENZY_CD_MUL : 1); }
// Mèche longue : une seconde de plus ; Sang-froid : Fièvre ne raccourcit plus la fenêtre.
export function comboTime(mods, buffs) {
  return (COMBO_T + TENACE_BONUS * modLevel(mods, 'tenace') + (buff(buffs, 'meche') ? SHOP_FUSE_T : 0)) * (modLevel(mods, 'fievre') && !buff(buffs, 'sangfroid') ? FIEVRE_COMBO_MUL : 1);
}
// Départ lancé : crans de multiplicateur en plus pendant la vague, ajoutés au bonus de Sans répit.
export function shopBonus(buffs) { return buff(buffs, 'depart') ? SHOP_DEPART_BONUS : 0; }
// Temps de combo restant après un coup encaissé : Quitte ou double le remet à zéro.
export function comboAfterHit(mods, comboT) { return modLevel(mods, 'quitte') ? 0 : Math.max(0, comboT - COMBO_HIT_DRAIN); }
// Kills enchaînés après un coup encaissé : le combo est cassé sur-le-champ quand son temps tombe à zéro,
// sans attendre l'image suivante (sinon un kill dans la foulée le relance).
export function comboKillsAfterHit(mods, combo, comboT) { return comboAfterHit(mods, comboT) > 0 ? combo : 0; }
// Sans répit : crans de multiplicateur après une vague terminée, et pause raccourcie entre les vagues.
export function repitBonus(mods, bonus) { return modLevel(mods, 'repit') ? Math.min(REPIT_MAX, bonus + 1) : bonus; }
export function waveBreak(mods) { return modLevel(mods, 'sanspause') ? SANSPAUSE_BREAK : WAVE_BREAK * (modLevel(mods, 'repit') ? REPIT_BREAK_MUL : 1); }
// Pas de pause : un choix de cartes après les vagues paires seulement, où l'on garde toutes les cartes proposées.
export function pickAfter(mods, wave) { return !modLevel(mods, 'sanspause') || wave % 2 === 0; }
export function takeAllCards(mods) { return !!modLevel(mods, 'sanspause'); }
// Ravitaillement : délai avant la prochaine caisse larguée (r : tirage entre 0 et 1).
export function boxPeriod(mods, r) { return (BOX_PERIOD_MIN + r * BOX_PERIOD_RAND) * (modLevel(mods, 'ravito') ? RAVITO_PERIOD_MUL : 1); }
// Points de vie gagnés (> 0) ou perdus (< 0) par seconde hors des coups : régénération après REGEN_DELAY s sans
// dégât, aucune sous Sans armure ; Vampire : aucune régénération, perte quand le combo est retombé.
// Plus de soins : aucune régénération. Sablier : en vague (inWave), perte dès SABLIER_HOLD s sans kill, jamais de régénération.
// Poche de sang (Comptoir) : plus de perte sous Vampire.
export function hpRate(mods, combo, sinceHurt, sinceKill = Infinity, inWave = false, buffs) {
  if (modLevel(mods, 'sanssoin')) return 0;
  if (modLevel(mods, 'sablier') && inWave) return sinceKill > SABLIER_HOLD ? -SABLIER_DRAIN : 0;
  if (modLevel(mods, 'vampire')) return combo || buff(buffs, 'poche') ? 0 : -VAMPIRE_DRAIN;
  return !modLevel(mods, 'sansarmure') && sinceHurt > REGEN_DELAY ? REGEN_RATE : 0;
}
// Nature d'une caisse (r : tirage entre 0 et 1, hpChance : part des caisses de soin). Plus de soins, Une seule vie :
// que des munitions.
export function boxKind(mods, r, hpChance) { return r < hpChance && !modLevel(mods, 'sanssoin') && !modLevel(mods, 'unevie') ? 'hp' : 'ammo'; }
// Vie après une vague terminée : Plus de soins la rend en entier.
export function waveEndHp(mods, hp, maxHp) { return modLevel(mods, 'sanssoin') ? maxHp : hp; }
// Sans échappatoire : aucune charge de roulade. Roulade de réserve (Comptoir) : une charge de plus.
export function rollMax(mods, buffs) { return modLevel(mods, 'entrave') ? 0 : 1 + modLevel(mods, 'double') + (buff(buffs, 'roulade') ? 1 : 0); }
// Terre brûlée : recharge de la roulade, et PV qu'elle coûte sans jamais prendre le dernier.
export function rollCooldown(mods) { return ROLL.CD * (modLevel(mods, 'brulee') ? BRULEE_ROLL_CD_MUL : 1); }
export function rollHpCost(mods, hp) { return modLevel(mods, 'brulee') ? Math.max(0, Math.min(BRULEE_ROLL_HP, hp - 1)) : 0; }
// Élite : PV (bouclier compris) et vitesse des ennemis à leur apparition.
export function enemyHpMul(mods) { return modLevel(mods, 'elite') ? ELITE_HP_MUL : 1; }
export function enemySpeedMul(mods) { return modLevel(mods, 'elite') ? ELITE_SPEED_MUL : 1; }
// Armes à feu : celles dont les tirs sont « tes tirs » (balles, plombs, railgun).
const GUNS = ['pistol', 'uzi', 'rifle', 'shotgun', 'rail'];
export const isGun = weapon => GUNS.includes(weapon);
// Mitraille : délai entre deux tirs et munitions consommées par tir d'une arme à feu.
export function weaponCdMul(mods, weapon) { return modLevel(mods, 'mitraille') && isGun(weapon) ? MITRAILLE_CD_MUL : 1; }
export function ammoCost(mods, weapon) { return modLevel(mods, 'mitraille') && isGun(weapon) ? MITRAILLE_AMMO_COST : 1; }
// Main lourde : recul infligé par tes tirs, recul subi (px) et dispersion ajoutée (rad) à chaque tir d'une arme à feu.
export function shotKnockMul(mods) { return modLevel(mods, 'lourde') ? LOURDE_KNOCK_MUL : 1; }
export function selfPush(mods, weapon) { return modLevel(mods, 'lourde') && isGun(weapon) ? LOURDE_SELF_PUSH : 0; }
export function extraSpread(mods, weapon) { return modLevel(mods, 'lourde') && isGun(weapon) ? LOURDE_SPREAD : 0; }
// Munitions d'une caisse pour l'arme i : le pistolet, infini d'ordinaire, en reçoit sous Mitraille.
// Grand chargeur (Comptoir) : plus de munitions pour l'arme visée.
export function refillOf(mods, i, buffs) {
  const n = i === 0 && modLevel(mods, 'mitraille') ? MITRAILLE_PISTOL_REFILL : W[i].refill;
  return buff(buffs, 'grandchargeur') === W[i].id ? Math.round(n * SHOP_MAG_MUL) : n;
}
// Lunette (Comptoir) : dispersion propre de l'arme visée.
export function spreadMul(buffs, weapon) { return buff(buffs, 'lunette') === weapon ? SHOP_SCOPE_MUL : 1; }
// Enraciné, Sans échappatoire : vitesse de déplacement.
export function speedMul(mods) { return (modLevel(mods, 'racine') ? RACINE_SPEED_MUL : 1) * (modLevel(mods, 'entrave') ? ENTRAVE_SPEED_MUL : 1); }
// Dégâts des tirs du joueur selon ses pactes : arme tirée, distance à la cible (px), joueur immobile ; Balles lourdes (Comptoir).
export function shotDamageMul(mods, weapon, d, still, buffs) {
  let m = buff(buffs, 'lourdes') === weapon ? SHOP_HEAVY_MUL : 1;
  if (weapon === 'pistol' && modLevel(mods, 'fidele')) m *= FIDELE_PISTOL_MUL;
  if (modLevel(mods, 'verre')) m *= VERRE_DAMAGE_MUL;
  if (modLevel(mods, 'entrave')) m *= ENTRAVE_DAMAGE_MUL;
  if (modLevel(mods, 'lourde')) m *= LOURDE_DAMAGE_MUL;
  if (modLevel(mods, 'aveugle')) m *= AVEUGLE_DAMAGE_MUL;
  if (modLevel(mods, 'specialiste')) m *= SPECIALISTE_DAMAGE_MUL; // la seule arme encore utilisable est la sienne
  if (modLevel(mods, 'portant')) m *= d < PORTANT_RANGE * T ? PORTANT_NEAR_MUL : PORTANT_FAR_MUL;
  if (still && modLevel(mods, 'racine')) m *= RACINE_DAMAGE_MUL;
  return m;
}
// Spécialiste : seule l'arme choisie (special, -1 sans le pacte) se sélectionne ; ses explosions et ses barricades
// comptent double (le joueur ne pose plus que celles de son arme).
export function canSwitch(special, i) { return special < 0 || i === special; }
export function specialMul(mods) { return modLevel(mods, 'specialiste') ? SPECIALISTE_DAMAGE_MUL : 1; }
// Poudre noire : rayon des explosions du joueur (barils, grenades, roquettes) et dégâts qu'elles lui font.
export function ownBlastRadius(mods, R) { return R * (modLevel(mods, 'poudre') ? POUDRE_RADIUS_MUL : 1); }
export function ownBlastSelfMul(mods) { return modLevel(mods, 'poudre') ? POUDRE_SELF_MUL : 1; }
// Quitte ou double : multiplicateur de points de chaque kill.
export function quittePoints(mods) { return Math.pow(QUITTE_POINTS_MUL, modLevel(mods, 'quitte')); }
// Roulade tactique : munitions rendues par une roulade à une arme de recharge `refill` qui en a `ammo`,
// sans remplir au-delà de ROLLAMMO_CAP recharges.
export function rollAmmo(mods, refill, ammo) {
  const lvl = modLevel(mods, 'rollammo');
  if (!lvl || !refill || ammo === Infinity) return 0;
  return Math.max(0, Math.min(Math.ceil(refill * ROLLAMMO_SHARE * lvl), refill * ROLLAMMO_CAP - ammo));
}
// Artificier : rayon d'explosion des grenades et des roquettes.
export function blastRadius(mods, base) { return base * Math.pow(ARTIFICIER_RADIUS_MUL, modLevel(mods, 'artificier')); }
// Fragmentation : éclats projetés par une grenade qui explose.
export function fragShards(mods) { return FRAG_SHARDS * modLevel(mods, 'frag'); }
// Coup d'épaule : recul infligé par la roulade aux ennemis traversés (0 sans la carte).
export function shoveKnock(mods) {
  const lvl = modLevel(mods, 'epaule');
  return lvl ? EPAULE_KNOCK + EPAULE_KNOCK_LVL * (lvl - 1) : 0;
}
