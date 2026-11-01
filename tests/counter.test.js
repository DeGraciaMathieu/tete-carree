import { test } from 'vitest';
import assert from 'node:assert/strict';
import { SHOP_ITEMS, W } from '../src/config.js';
import { itemAllowed, rentable, restockCost, rollStall } from '../src/rules/counter.js';
import { createRng } from '../src/rules/rng.js';
import { waveCounts, waveQueue } from '../src/rules/waves.js';

// Partie type : pistolet, Uzi et fusil à pompe débloqués, vague 7 à venir, aucun effet actif.
const ctx = (more = {}) => ({
  mods: {}, buffs: {}, wave: 7, banned: [], special: -1,
  unlocked: W.map(w => ['pistol', 'uzi', 'shotgun'].includes(w.id)),
  ammo: W.map(w => w.id === 'pistol' ? Infinity : 10),
  ...more,
});
const item = id => SHOP_ITEMS.find(it => it.id === id);
const stallIds = (c, seed) => rollStall(c, createRng(seed)).map(s => s.item.id);

test('l\'étale propose 4 caisses toutes différentes', () => {
  for (let seed = 0; seed < 100; seed++) {
    const ids = stallIds(ctx(), seed);
    assert.equal(ids.length, 4);
    assert.equal(new Set(ids).size, 4, seed);
  }
});

test('un article très rare sort bien moins souvent qu\'un commun', () => {
  let plein = 0, chargeur = 0;
  for (let seed = 0; seed < 2000; seed++) {
    const ids = stallIds(ctx(), seed);
    if (ids.includes('plein')) plein++;
    if (ids.includes('chargeur')) chargeur++;
  }
  assert.ok(plein * 3 < chargeur, `${plein} / ${chargeur}`);
});

test('sans pacte, aucun contre-pacte n\'est proposé', () => {
  for (let seed = 0; seed < 200; seed++) assert.ok(!rollStall(ctx(), createRng(seed)).some(s => s.item.fam === 'pact'), seed);
});

test('sous Vampire, la Trousse complète peut sortir, sans être garantie', () => {
  let seen = 0;
  for (let seed = 0; seed < 200; seed++) if (stallIds(ctx({ mods: { vampire: 1 } }), seed).includes('trousse')) seen++;
  assert.ok(seen > 0 && seen < 200, seen);
});

test('la Roulade de réserve n\'est jamais proposée sous Sans échappatoire', () => {
  assert.equal(itemAllowed(item('roulade'), ctx()), true);
  assert.equal(itemAllowed(item('roulade'), ctx({ mods: { entrave: 1 } })), false);
});

test('sous Spécialiste, aucun article de munitions n\'est proposé', () => {
  const c = ctx({ mods: { specialiste: 1 }, special: 1 });
  for (const it of SHOP_ITEMS.filter(it => it.fam === 'ammo')) assert.equal(itemAllowed(it, c), false, it.id);
});

test('sous Spécialiste, l\'Armurerie ne vise que l\'arme gardée', () => {
  const c = ctx({ mods: { specialiste: 1 }, special: 1 });
  for (let seed = 0; seed < 200; seed++) for (const s of rollStall(c, createRng(seed))) if (s.item.fam === 'arms') assert.equal(s.target, 'uzi');
});

test('un article encore actif n\'est pas proposé une seconde fois', () => {
  assert.equal(itemAllowed(item('gilet'), ctx({ buffs: { gilet: 1 } })), false);
  assert.equal(itemAllowed(item('location'), ctx({ buffs: { rent: 'cadence' } })), false);
});

test('l\'Appât n\'est pas proposé avant la fin de la vague 5', () => {
  assert.equal(itemAllowed(item('appat'), ctx({ wave: 5 })), false);
  assert.equal(itemAllowed(item('appat'), ctx({ wave: 6 })), true);
});

test('la Prime de tête n\'est proposée que s\'il y a des Blindés dans la vague', () => {
  assert.equal(itemAllowed(item('tete'), ctx({ wave: 4 })), false);
  assert.equal(itemAllowed(item('tete'), ctx({ wave: 4, buffs: { appat: 1 } })), true);
});

test('le réassort coûte 5, puis 3 de plus à chaque réassort de la même visite', () => {
  assert.deepEqual([0, 1, 2].map(restockCost), [5, 8, 11]);
});

test('on ne loue ni Constitution ni une carte au niveau maximal', () => {
  const ids = rentable({ cadence: 3 }, [], 'c').concat(rentable({ cadence: 3 }, [], 'r')).map(m => m.id);
  assert.ok(!ids.includes('constitution'));
  assert.ok(!ids.includes('cadence'));
});

test('l\'Éclaireur annonce les mêmes comptes que la vague tirée', () => {
  for (const n of [3, 6, 9, 12]) for (let seed = 0; seed < 5; seed++) {
    const q = waveQueue(n, {}, createRng(seed)), k = waveCounts(n, {});
    const count = t => q.filter(e => e === t).length;
    assert.deepEqual([count('z'), count('b'), count('d'), count('s'), count('a'), q.filter(e => e[0] === 'p').length], [k.z, k.b, k.d, k.s, k.a, k.p], `${n}/${seed}`);
  }
});

test('sous Monnaie piégée, Pièces collantes n\'est pas proposée', () => {
  assert.equal(itemAllowed(item('collantes'), ctx({ mods: { piegee: 1 } })), false);
});

test('sous Péage, la Roulade de réserve n\'est pas proposée', () => {
  assert.equal(itemAllowed(item('roulade'), ctx({ mods: { peage: 1 } })), false);
});
