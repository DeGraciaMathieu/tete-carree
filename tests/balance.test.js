import { test } from 'vitest';
import assert from 'node:assert/strict';
import { MODS, SHOP_ITEMS } from '../src/config.js';
import { banIndex, bestIndex, cardScore, shopPicks, wantsReroll } from '../scripts/balance/decide.js';
import { profileById } from '../scripts/balance/profiles.js';

// Décisions du pilote du harnais d'équilibrage (scripts/balance/).
const card = id => MODS.find(m => m.id === id);
const pick = (ids, profile, r = .5) => ids[bestIndex(ids.map(id => cardScore(card(id), profileById(profile), r)))];
const crate = id => ({ item: SHOP_ITEMS.find(it => it.id === id), target: null });

test('le profil Prudent ne prend jamais de pacte quand il a le choix', () => {
  assert.equal(pick(['prime', 'perce', 'vampire'], 'prudent'), 'perce');
  assert.equal(pick(['elite', 'cadence'], 'prudent'), 'cadence');
});

test('le profil Prudent préfère une carte de défense', () => {
  assert.equal(pick(['cadence', 'constitution', 'perce'], 'prudent'), 'constitution');
});

test('le profil Pilleur choisit une carte du butin quand il en a une sur la table', () => {
  assert.equal(pick(['cadence', 'midas', 'perce'], 'pilleur'), 'midas');
});

test('le profil Scoreur bannit Mercenaire, les autres profils ne bannissent rien', () => {
  const table = ['cadence', 'mercenaire', 'perce'].map(card);
  assert.equal(banIndex(table, profileById('scoreur')), 1);
  assert.equal(banIndex(table, profileById('pilleur')), -1);
});

test('la relance n\'a lieu que si la table déçoit et que la réserve de pièces reste', () => {
  const prudent = profileById('prudent');
  assert.equal(wantsReroll(1, prudent, 40, 10), true);
  assert.equal(wantsReroll(6, prudent, 40, 10), false); // une carte de défense est sur la table
  assert.equal(wantsReroll(1, prudent, 25, 10), false); // il garderait moins de 20 pièces
  assert.equal(wantsReroll(1, profileById('demo'), 99, 10), false);
});

test('un profil qui garde une réserve n\'achète pas au Comptoir en dessous de celle-ci', () => {
  const stall = [crate('gilet'), crate('rustine')], price = it => it.price;
  assert.deepEqual(shopPicks(stall, [false, false], profileById('prudent'), 38, price), [0, 1]);
  assert.deepEqual(shopPicks(stall, [false, false], profileById('prudent'), 25, price), [1]); // le Gilet (20) laisserait 5 < 10 : la Rustine (8) passe
  assert.deepEqual(shopPicks(stall, [false, false], profileById('prudent'), 15, price), []);
});

test('le profil Démo n\'achète jamais rien', () => {
  assert.deepEqual(shopPicks([crate('gilet')], [false], profileById('demo'), 999, it => it.price), []);
});
