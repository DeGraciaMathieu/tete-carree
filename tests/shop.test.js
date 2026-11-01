import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BUYBACK_COST, REROLL_COST, REROLL_STEP } from '../src/config.js';
import { buybackable, canAfford, canBuyExtra, discounted, rerollCost, shopOpens, undoPact, withoutPact } from '../src/rules/shop.js';

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

const before = { maxHp: 60, legendNext: true, repit: 3 };

test('racheter Canon de verre rend 40 points de vie max, sans soigner', () => {
  assert.deepEqual(undoPact('verre', before), { maxHp: 100, legendNext: true, repit: 3 });
});

test('racheter le Marché du diable rend 25 points de vie max et annule la Légendaire promise', () => {
  assert.deepEqual(undoPact('diable', before), { maxHp: 85, legendNext: false, repit: 3 });
});

test('racheter Sans répit fait perdre les crans gagnés', () => {
  assert.equal(undoPact('repit', before).repit, 0);
});

test('racheter un pacte sans effet immédiat ne change ni la vie max ni la Légendaire promise', () => {
  assert.deepEqual(undoPact('prime', before), before);
});

test('Marchandage : la relance coûte 9 au lieu de 10, le rachat 51 au lieu de 60', () => {
  assert.equal(discounted(10, { marchandage: 1 }), 9);
  assert.equal(discounted(60, { marchandage: 1 }), 51);
});

test('Marchandage niveau 2 : 30 % de moins', () => {
  assert.equal(discounted(10, { marchandage: 2 }), 7);
  assert.equal(discounted(60, { marchandage: 2 }), 42);
});

test('Marchandage : un article gratuit reste gratuit, aucun prix ne tombe sous 1', () => {
  assert.equal(discounted(0, { marchandage: 2 }), 0);
  assert.equal(discounted(1, { marchandage: 2 }), 1);
});

test('sans Marchandage, les prix sont inchangés', () => {
  assert.equal(discounted(25, {}), 25);
});

test('Bouclier d\'or : tout coûte deux fois plus cher, Marchandage s\'applique après', () => {
  assert.equal(discounted(10, { bouclier: 1 }), 20);
  assert.equal(discounted(60, { bouclier: 1, marchandage: 1 }), 102);
});

test('Crédit : un achat est permis jusqu\'à −100', () => {
  assert.equal(canAfford({ credit: 1 }, 10, 25), true);
  assert.equal(canAfford({ credit: 1 }, -95, 10), false);
});

test('Crédit : le Comptoir s\'ouvre avec une bourse vide', () => {
  assert.equal(shopOpens({ credit: 1 }, 0), true);
  assert.equal(shopOpens({}, 0), false);
});

test('sans Crédit, un achat ne fait jamais passer la bourse sous zéro', () => {
  assert.equal(canAfford({}, 10, 25), false);
  assert.equal(canAfford({}, 25, 25), true);
});

test('sous Vœu de pauvreté, le Comptoir ne s\'ouvre jamais', () => {
  assert.equal(shopOpens({ pauvrete: 1 }, 50), false);
});
