import { test } from 'vitest';
import assert from 'node:assert/strict';
import { multiplier, frenzy, fireMul, comboTime, rollMax, rollAmmo, blastRadius, fragShards, shoveKnock } from '../src/rules/modifiers.js';

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
