import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BUYBACK_COST, REROLL_COST, REROLL_STEP } from '../src/config.js';
import { buybackable, canBuyExtra, rerollCost, withoutPact } from '../src/rules/shop.js';

test('la relance coûte 10, puis 5 de plus à chaque relance du même écran', () => {
  assert.equal(REROLL_COST, 10);
  assert.equal(REROLL_STEP, 5);
  assert.deepEqual([0, 1, 2].map(rerollCost), [10, 15, 20]);
});

test('la carte en plus s\'achète une fois par écran', () => {
  assert.equal(canBuyExtra({}, false), true);
  assert.equal(canBuyExtra({}, true), false);
});

test('la carte en plus n\'est pas proposée sous Pas de pause', () => {
  assert.equal(canBuyExtra({ sanspause: 1 }, false), false);
});

test('seuls les pactes ordinaires possédés peuvent être rachetés', () => {
  const ids = buybackable({ prime: 2, verre: 1, cadence: 3, elite: 1 }).map(m => m.id);
  assert.deepEqual(ids.sort(), ['prime', 'verre']);
});

test('racheter un pacte le retire entièrement, quel que soit son niveau', () => {
  assert.deepEqual(withoutPact({ prime: 2, cadence: 1 }, 'prime'), { cadence: 1 });
});

test('racheter un pacte ne modifie pas les cartes passées en argument', () => {
  const mods = { prime: 2, cadence: 1 };
  withoutPact(mods, 'prime');
  assert.deepEqual(mods, { prime: 2, cadence: 1 });
});

test('racheter un pacte coûte 60 pièces', () => {
  assert.equal(BUYBACK_COST, 60);
});
