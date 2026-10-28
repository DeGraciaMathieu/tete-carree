import { test } from 'vitest';
import assert from 'node:assert/strict';
import { MODS } from '../src/config.js';
import { createRng } from '../src/rules/rng.js';
import { rollCards } from '../src/rules/cards.js';
import { cardIcon } from '../src/render/cardIcons.js';

const ids = cards => cards.map(c => c.id);
const allMaxed = () => Object.fromEntries(MODS.map(m => [m.id, m.max]));

test('entre deux vagues, trois cartes différentes sont proposées', () => {
  const cards = rollCards({}, createRng(42));
  assert.equal(cards.length, 3);
  assert.equal(new Set(ids(cards)).size, 3);
});

test('la même graine propose les mêmes cartes', () => {
  assert.deepEqual(ids(rollCards({}, createRng(7))), ids(rollCards({}, createRng(7))));
});

test('une carte prise à son niveau max n\'est plus jamais proposée', () => {
  const mods = { ...allMaxed(), frenesie: 1, perce: 0 }; // il ne reste que Balles perforantes
  for (let seed = 0; seed < 50; seed++) assert.deepEqual(ids(rollCards(mods, createRng(seed))), ['perce']);
});

test('quand toutes les cartes sont au max, il n\'y a plus rien à proposer', () => {
  assert.deepEqual(rollCards(allMaxed(), createRng(1)), []);
});

test('après le Marché du diable, le choix suivant propose toujours une Légendaire', () => {
  for (let seed = 0; seed < 50; seed++) assert.ok(rollCards({ diable: 1 }, createRng(seed), true).some(c => c.rar === 'l'), seed);
});

test('le Marché du diable n\'est plus proposé quand toutes les Légendaires sont prises', () => {
  const mods = { frenesie: 1, tourelle: 1, souffle: 1 };
  for (let seed = 0; seed < 200; seed++) assert.ok(!ids(rollCards(mods, createRng(seed))).includes('diable'), seed);
});

test('chaque carte a son pictogramme', () => {
  for (const m of MODS) assert.match(cardIcon(m.id), /<(path|circle)/, m.id);
});
