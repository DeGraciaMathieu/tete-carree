import { test } from 'vitest';
import assert from 'node:assert/strict';
import { weaponsToUnlock, ammoOnUnlock } from '../src/rules/unlock.js';

const onlyPistol = [true, false, false, false, false, false, false, false, false];

test('l\'Uzi se débloque à 1 000 points, pas avant', () => {
  assert.deepEqual(weaponsToUnlock(999, onlyPistol), []);
  assert.deepEqual(weaponsToUnlock(1000, onlyPistol), [1]);
});

test('le fusil d\'assaut se débloque à 2 000 points, juste après l\'Uzi', () => {
  assert.deepEqual(weaponsToUnlock(1999, [true, true, false, false, false, false, false, false, false]), []);
  assert.deepEqual(weaponsToUnlock(2000, [true, true, false, false, false, false, false, false, false]), [2]);
});

test('un gros gain de score débloque plusieurs armes d\'un coup, dans l\'ordre de l\'arsenal', () => {
  assert.deepEqual(weaponsToUnlock(7500, onlyPistol), [1, 2, 3, 4]);
});

test('une arme déjà débloquée ne l\'est pas une seconde fois', () => {
  assert.deepEqual(weaponsToUnlock(1200, [true, true, false, false, false, false, false, false, false]), []);
});

test('une arme débloquée arrive avec deux recharges de munitions', () => {
  assert.equal(ammoOnUnlock(1), 240); // Uzi : 120 par recharge
});
