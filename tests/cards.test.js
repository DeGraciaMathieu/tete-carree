import { test } from 'vitest';
import assert from 'node:assert/strict';
import { MODS } from '../src/config.js';
import { LANGS } from '../src/i18n/index.js';
import { createRng } from '../src/rules/rng.js';
import { isPact, rollCards } from '../src/rules/cards.js';
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

const majors = MODS.filter(m => m.rar === 'm');
const draws = (mods, ctx, n = 300) => Array.from({ length: n }, (_, seed) => ids(rollCards(mods, createRng(seed), false, ctx))).flat();

test('aucun pacte majeur n\'est proposé avant la fin de la vague 5', () => {
  const seen = mods => draws(mods, { wave: 4 }).filter(id => majors.some(m => m.id === id));
  assert.deepEqual(seen({}), []);
  assert.ok(majors.some(m => draws({}, { wave: 5 }).includes(m.id)));
});

test('un seul pacte majeur par partie', () => {
  for (const m of majors) assert.ok(!draws({ [m.id]: 1 }, { wave: 20 }, 100).some(id => majors.some(o => o.id === id)), m.id);
});

test('à la fin de la vague 5, un pacte majeur est toujours proposé', () => {
  for (let seed = 0; seed < 100; seed++) assert.ok(rollCards({}, createRng(seed), false, { wave: 5 }).some(c => c.rar === 'm'), seed);
});

test('tant qu\'aucun n\'est pris, un pacte majeur est de nouveau garanti toutes les deux vagues', () => {
  for (let seed = 0; seed < 100; seed++) for (const wave of [7, 9, 15]) assert.ok(rollCards({}, createRng(seed), false, { wave }).some(c => c.rar === 'm'), `${seed} ${wave}`);
  assert.ok(Array.from({ length: 100 }, (_, seed) => rollCards({}, createRng(seed), false, { wave: 6 })).some(cs => !cs.some(c => c.rar === 'm')), 'pas garanti en vague 6');
});

test('le pacte majeur garanti respecte les exclusions, et la Légendaire du Marché du diable reste promise', () => {
  for (let seed = 0; seed < 100; seed++) {
    const cards = rollCards({ rollammo: 1, diable: 1 }, createRng(seed), true, { wave: 7, weapons: 4 });
    assert.ok(cards.some(c => c.rar === 'l') && cards.some(c => c.rar === 'm'), seed);
    assert.ok(!cards.some(c => c.id === 'specialiste' || c.id === 'entrave'), seed);
  }
});

test('la démo ne tire jamais de pacte majeur', () => {
  assert.ok(!draws({}, { wave: 20, demo: true }).some(id => majors.some(m => m.id === id)));
});

test('une carte qu\'un pacte majeur rend inutile n\'est plus proposée, et inversement', () => {
  for (const m of majors) for (const id of m.excl || []) {
    assert.ok(!draws({ [m.id]: 1 }, { wave: 10 }, 100).includes(id), `${m.id} exclut ${id}`);
    assert.ok(!draws({ [id]: 1 }, { wave: 10 }, 100).includes(m.id), `${id} exclut ${m.id}`);
  }
});

test('un pacte majeur s\'affiche comme un pacte : avantage et contrepartie', () => {
  for (const m of majors) for (const l in LANGS) assert.ok(isPact(m) && LANGS[l].cards[m.id].plus(1) && LANGS[l].cards[m.id].minus(1), `${l} ${m.id}`);
});

test('Pas de pause : les cartes gagnées d\'office ne sont jamais des pactes', () => {
  assert.ok(!draws({ sanspause: 1 }, { wave: 12, noPacts: true }).some(id => isPact(MODS.find(m => m.id === id))));
});

test('Spécialiste n\'est pas proposé tant que seul le pistolet est débloqué', () => {
  assert.ok(!draws({}, { wave: 10, weapons: 1 }).includes('specialiste'));
  assert.ok(draws({}, { wave: 10, weapons: 3 }, 600).includes('specialiste'));
});

test('chaque carte a son pictogramme', () => {
  for (const m of MODS) assert.match(cardIcon(m.id), /<(path|circle)/, m.id);
});
