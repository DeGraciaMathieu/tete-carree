import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  multiplier, frenzy, fireMul, comboTime, rollMax, rollAmmo, blastRadius, fragShards, shoveKnock, comboAfterHit, repitBonus, waveBreak,
  boxPeriod, boxKind, waveEndHp, enemyHpMul, enemySpeedMul, weaponCdMul, ammoCost, refillOf, shotKnockMul, selfPush, extraSpread, pickAfter, takeAllCards, canSwitch, specialMul, hpRate, rollCooldown, rollHpCost, speedMul, shotDamageMul, ownBlastRadius, ownBlastSelfMul,
} from '../src/rules/modifiers.js';

test('le multiplicateur gagne un cran tous les 5 kills enchaînés', () => {
  assert.equal(multiplier(0), 1);
  assert.equal(multiplier(4), 1);
  assert.equal(multiplier(5), 2);
  assert.equal(multiplier(12), 3);
});

test('la Frénésie ne se déclenche qu\'à partir de ×5 et seulement si la carte est prise', () => {
  assert.equal(frenzy({ frenesie: 1 }, 19), false);
  assert.equal(frenzy({ frenesie: 1 }, 20), true);
  assert.equal(frenzy({}, 50), false);
});

test('Sans armure double la cadence de tir, la Frénésie l\'accélère encore', () => {
  assert.equal(fireMul({}, 0), 1);
  assert.equal(fireMul({ sansarmure: 1 }, 0), .5);
  assert.equal(fireMul({ sansarmure: 1, frenesie: 1 }, 20), .5 * .75);
});

test('Combo tenace prolonge la fenêtre de combo de 1,4 s par niveau', () => {
  assert.equal(comboTime({}), 2.6);
  assert.ok(Math.abs(comboTime({ tenace: 2 }) - 5.4) < 1e-9);
});

test('Double roulade donne une seconde charge de roulade', () => {
  assert.equal(rollMax({}), 1);
  assert.equal(rollMax({ double: 1 }), 2);
});

test('Roulade tactique rend un quart de caisse par niveau à l\'Uzi presque vide', () => {
  assert.equal(rollAmmo({ rollammo: 1 }, 120, 10), 30);
  assert.equal(rollAmmo({ rollammo: 3 }, 120, 10), 90);
  assert.equal(rollAmmo({}, 120, 10), 0);
});

test('Roulade tactique ne remplit jamais au-delà d\'une caisse pleine', () => {
  assert.equal(rollAmmo({ rollammo: 3 }, 120, 100), 20);
  assert.equal(rollAmmo({ rollammo: 3 }, 120, 120), 0);
  assert.equal(rollAmmo({ rollammo: 3 }, 120, 300), 0);
  assert.equal(rollAmmo({ rollammo: 3 }, 0, Infinity), 0);
});

test('Fièvre : un cran de multiplicateur tous les 3 kills, mais un combo deux fois plus court', () => {
  assert.equal(multiplier(3, { fievre: 1 }), 2);
  assert.equal(multiplier(9, { fievre: 1 }), 4);
  assert.equal(comboTime({ fievre: 1 }), 1.3);
  assert.ok(Math.abs(comboTime({ fievre: 1, tenace: 2 }) - 2.7) < 1e-9);
});

test('Fièvre fait entrer en Frénésie dès 12 kills enchaînés', () => {
  assert.equal(frenzy({ frenesie: 1 }, 12), false);
  assert.equal(frenzy({ frenesie: 1, fievre: 1 }, 12), true);
});

test('Artificier agrandit le rayon des grenades et des roquettes d\'un quart par niveau', () => {
  assert.equal(blastRadius({}, 88), 88);
  assert.equal(blastRadius({ artificier: 1 }, 88), 110);
  assert.equal(blastRadius({ artificier: 2 }, 72), 112.5);
});

test('Fragmentation projette 4 éclats par niveau, aucun sans la carte', () => {
  assert.equal(fragShards({}), 0);
  assert.equal(fragShards({ frag: 1 }), 4);
  assert.equal(fragShards({ frag: 2 }), 8);
});

test('Coup d\'épaule bouscule plus fort au niveau 2, pas du tout sans la carte', () => {
  assert.equal(shoveKnock({}), 0);
  assert.equal(shoveKnock({ epaule: 1 }), 200);
  assert.equal(shoveKnock({ epaule: 2 }), 280);
});

test('Quitte ou double : un coup encaissé vide le combo au lieu de lui retirer 0,6 s', () => {
  assert.ok(Math.abs(comboAfterHit({}, 2) - 1.4) < 1e-9);
  assert.equal(comboAfterHit({ quitte: 1 }, 2), 0);
});

test('Sans répit : un cran de plus à chaque vague terminée, jusqu\'à +5, et une pause moitié plus courte', () => {
  assert.equal(repitBonus({}, 0), 0);
  assert.equal(repitBonus({ repit: 1 }, 0), 1);
  assert.equal(repitBonus({ repit: 1 }, 5), 5);
  assert.equal(multiplier(0, {}, 2), 3);
  assert.equal(waveBreak({}), 10);
  assert.equal(waveBreak({ repit: 1 }), 5);
});

test('les crans de Sans répit comptent pour entrer en Frénésie', () => {
  assert.equal(frenzy({ frenesie: 1 }, 0, 3), false);
  assert.equal(frenzy({ frenesie: 1 }, 5, 3), true);
});

test('Ravitaillement : les caisses tombent deux fois plus souvent', () => {
  assert.equal(boxPeriod({}, 0), 9);
  assert.equal(boxPeriod({ ravito: 1 }, 1), 7);
});

test('Vampire : sans combo, le joueur perd 1 PV par seconde au lieu de régénérer', () => {
  assert.equal(hpRate({}, 0, 5), 3);
  assert.equal(hpRate({}, 0, 2), 0);
  assert.equal(hpRate({ sansarmure: 1 }, 0, 5), 0);
  assert.equal(hpRate({ vampire: 1 }, 0, 5), -1);
  assert.equal(hpRate({ vampire: 1 }, 4, 5), 3);
});

test('Terre brûlée : roulade rechargée deux fois plus vite, au prix de 5 PV, jamais le dernier', () => {
  assert.equal(rollCooldown({}), .7);
  assert.equal(rollCooldown({ brulee: 1 }), .35);
  assert.equal(rollHpCost({}, 50), 0);
  assert.equal(rollHpCost({ brulee: 1 }, 50), 5);
  assert.equal(rollHpCost({ brulee: 1 }, 3), 2);
  assert.equal(rollHpCost({ brulee: 1 }, 1), 0);
});

test('Enraciné : dégâts doublés à l\'arrêt, déplacement ralenti de 30 %', () => {
  assert.equal(speedMul({}), 1);
  assert.equal(speedMul({ racine: 1 }), .7);
  assert.equal(shotDamageMul({ racine: 1 }, 'uzi', 200, true), 2);
  assert.equal(shotDamageMul({ racine: 1 }, 'uzi', 200, false), 1);
});

test('Bout portant : dégâts doublés à moins de 3 cases, divisés par deux au-delà', () => {
  assert.equal(shotDamageMul({ portant: 1 }, 'shotgun', 90, false), 2);
  assert.equal(shotDamageMul({ portant: 1 }, 'rail', 100, false), .5);
  assert.equal(shotDamageMul({}, 'rail', 100, false), 1);
});

test('Fidélité ne triple que les dégâts du pistolet, Canon de verre renforce tous les tirs', () => {
  assert.equal(shotDamageMul({ fidele: 1 }, 'pistol', 200, false), 3);
  assert.equal(shotDamageMul({ fidele: 1 }, 'uzi', 200, false), 1);
  assert.equal(shotDamageMul({ verre: 1 }, 'rifle', 200, false), 1.5);
  assert.equal(shotDamageMul({ fidele: 1, verre: 1, portant: 1, racine: 1 }, 'pistol', 50, true), 18);
});

test('Poudre noire : explosions du joueur 50 % plus larges, et deux fois plus douloureuses pour lui', () => {
  assert.equal(ownBlastRadius({}, 80), 80);
  assert.equal(ownBlastRadius({ poudre: 1 }, 80), 120);
  assert.equal(ownBlastSelfMul({}), 1);
  assert.equal(ownBlastSelfMul({ poudre: 1 }), 2);
});

test('Plus de soins : aucune régénération, même longtemps après le dernier coup', () => {
  assert.equal(hpRate({ sanssoin: 1 }, 0, 60), 0);
});

test('Plus de soins : plus aucune caisse de soin, chaque vague terminée rend toute la vie', () => {
  assert.equal(boxKind({}, 0, .35), 'hp');
  assert.equal(boxKind({ sanssoin: 1 }, 0, .35), 'ammo');
  assert.equal(waveEndHp({ sanssoin: 1 }, 12, 100), 100);
  assert.equal(waveEndHp({}, 12, 100), 12);
});

test('Sablier : en vague, le joueur perd 4 PV par seconde dès qu\'il ne tue plus, jamais dans les 1,5 s qui suivent un kill', () => {
  assert.equal(hpRate({ sablier: 1 }, 0, 60, 2, true), -4);
  assert.equal(hpRate({ sablier: 1 }, 3, 60, 1, true), 0);
});

test('Sablier : régénération normale entre les vagues, aucune pendant', () => {
  assert.equal(hpRate({ sablier: 1 }, 0, 60, 30, false), hpRate({}, 0, 60));
  assert.equal(hpRate({ sablier: 1 }, 5, 60, 0, true), 0);
});

test('Élite : ennemis deux fois et demie plus résistants et 20 % plus rapides', () => {
  assert.equal(enemyHpMul({ elite: 1 }), 2.5);
  assert.equal(enemySpeedMul({ elite: 1 }), 1.2);
  assert.equal(enemyHpMul({}) * enemySpeedMul({}), 1);
});

test('Sans échappatoire : plus aucune charge de roulade', () => {
  assert.equal(rollMax({ entrave: 1 }), 0);
});

test('Sans échappatoire : déplacement +30 % et tirs ×1,5, cumulés avec Enraciné', () => {
  assert.equal(speedMul({ entrave: 1 }), 1.3);
  assert.equal(shotDamageMul({ entrave: 1 }, 'uzi', 400, false), 1.5);
  assert.ok(Math.abs(speedMul({ entrave: 1, racine: 1 }) - .91) < 1e-9);
  assert.equal(shotDamageMul({ entrave: 1, racine: 1 }, 'uzi', 400, true), 3);
});

test('Mitraille : les armes à feu tirent deux fois plus vite, quatre fois avec Sans armure, pas les grenades', () => {
  assert.equal(weaponCdMul({ mitraille: 1 }, 'uzi'), .5);
  assert.equal(weaponCdMul({ mitraille: 1 }, 'grenade'), 1);
  assert.equal(weaponCdMul({ mitraille: 1 }, 'rifle') * fireMul({ mitraille: 1, sansarmure: 1 }, 0), .25);
});

test('Mitraille : un tir coûte 2 munitions, une barricade toujours 1', () => {
  assert.equal(ammoCost({ mitraille: 1 }, 'pistol'), 2);
  assert.equal(ammoCost({ mitraille: 1 }, 'wall'), 1);
  assert.equal(ammoCost({}, 'uzi'), 1);
});

test('Mitraille : une caisse recharge aussi le pistolet', () => {
  assert.equal(refillOf({ mitraille: 1 }, 0), 60);
  assert.equal(refillOf({}, 0), 0);
  assert.equal(refillOf({ mitraille: 1 }, 1), 120);
});

test('Main lourde : tes tirs font 1,8 fois plus de dégâts et repoussent deux fois plus loin', () => {
  assert.equal(shotDamageMul({ lourde: 1 }, 'rifle', 300, false), 1.8);
  assert.equal(shotKnockMul({ lourde: 1 }), 2);
  assert.equal(shotKnockMul({}), 1);
});

test('Main lourde : chaque tir d\'arme à feu fait reculer le joueur et dévie sa visée, railgun compris, pas une grenade', () => {
  assert.ok(selfPush({ lourde: 1 }, 'uzi') > 0 && extraSpread({ lourde: 1 }, 'rail') > 0);
  assert.equal(selfPush({ lourde: 1 }, 'grenade') + extraSpread({ lourde: 1 }, 'wall'), 0);
  assert.equal(selfPush({}, 'uzi') + extraSpread({}, 'rail'), 0);
});

test('Tout ou rien : un cran de multiplicateur tous les 2 kills', () => {
  assert.equal(multiplier(4, { toutourien: 1 }), 3);
  assert.equal(multiplier(4, {}), 1);
});

test('Pas de pause : 1,5 s entre deux vagues, un choix de cartes après les vagues paires seulement, où l\'on garde tout', () => {
  assert.equal(waveBreak({ sanspause: 1 }), 1.5);
  assert.equal(pickAfter({ sanspause: 1 }, 7), false);
  assert.equal(pickAfter({ sanspause: 1 }, 8), true);
  assert.equal(pickAfter({}, 7), true);
  assert.equal(takeAllCards({ sanspause: 1 }), true);
});

test('Spécialiste : seule l\'arme choisie se sélectionne', () => {
  assert.equal(canSwitch(3, 3), true);
  assert.equal(canSwitch(3, 0), false);
  assert.equal(canSwitch(-1, 0), true);
});

test('Spécialiste : ses tirs, ses explosions et ses barricades comptent double', () => {
  assert.equal(shotDamageMul({ specialiste: 1 }, 'shotgun', 100, false), 2);
  assert.equal(specialMul({ specialiste: 1 }), 2);
  assert.equal(specialMul({}), 1);
});

test('Aveugle : tes tirs font deux fois plus de dégâts', () => {
  assert.equal(shotDamageMul({ aveugle: 1 }, 'pistol', 100, false), 2);
});
