import { test } from 'vitest';
import assert from 'node:assert/strict';
import { multiplier, frenzy, fireMul, comboTime, rollMax, rollAmmo } from '../src/rules/modifiers.js';

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
