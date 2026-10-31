import { test } from 'vitest';
import assert from 'node:assert/strict';
import { killPoints, soifHeal, rollDrop, waveBonus, potsKill, potAfterHit, rollCoins, waveCoins } from '../src/rules/scoring.js';
import { createRng } from '../src/rules/rng.js';

const fixed = (...values) => () => values.shift();

test('un zombie rapporte 50 points, multipliés par le combo', () => {
  assert.equal(killPoints('z', {}, 1), 50);
  assert.equal(killPoints('z', {}, 3), 150);
});

test('Chair à canon double les points des Gonflés, et seulement les leurs', () => {
  assert.equal(killPoints('b', { chair: 1 }, 1), 200);
  assert.equal(killPoints('z', { chair: 1 }, 1), 50);
});

test('Prime de risque ajoute 50 % de points sur chaque kill', () => {
  assert.equal(killPoints('a', { prime: 1 }, 1), 300);
});

test('Soif de sang ne soigne qu\'à partir de ×3', () => {
  assert.equal(soifHeal({ soif: 2 }, 2), 0);
  assert.equal(soifHeal({ soif: 2 }, 3), 2);
  assert.equal(soifHeal({}, 5), 0);
});

test('un blindé lâche une caisse une fois sur quatre, jamais au-dessus d\'une crevasse', () => {
  assert.equal(rollDrop('a', false, fixed(.24, .3)), 'hp');
  assert.equal(rollDrop('a', false, fixed(.24, .7)), 'ammo');
  assert.equal(rollDrop('a', false, fixed(.26)), null);
  assert.equal(rollDrop('a', true, fixed(.01)), null);
});

test('Quitte ou double double les points de chaque kill', () => {
  assert.equal(killPoints('z', { quitte: 1 }, 2), 200);
});

test('Vampire : chaque kill rend 1 PV, et Soif de sang agit dès ×1', () => {
  assert.equal(soifHeal({ vampire: 1 }, 1), 1);
  assert.equal(soifHeal({ vampire: 1, soif: 2 }, 1), 3);
});

test('Une seule vie : chaque kill et le bonus de fin de vague rapportent trois fois plus', () => {
  assert.equal(killPoints('z', { unevie: 1 }, 2), 300);
  assert.equal(waveBonus(4, {}), 1000);
  assert.equal(waveBonus(4, { unevie: 1 }), 3000);
});

test('Une seule vie : un ennemi ne lâche plus que des caisses de munitions', () => {
  assert.equal(rollDrop('a', false, fixed(0, 0), {}), 'hp');
  assert.equal(rollDrop('a', false, fixed(0, 0), { unevie: 1 }), 'ammo');
});

test('Sablier : chaque kill rapporte deux fois plus', () => {
  assert.equal(killPoints('r', { sablier: 1 }, 1), 150);
});

test('Élite : chaque kill rapporte trois fois plus', () => {
  assert.equal(killPoints('z', { elite: 1 }, 1), 150);
});

test('Tout ou rien : pendant une vague, les points des kills attendent dans la cagnotte, donc les armes ne se débloquent qu\'à la fin', () => {
  assert.equal(potsKill({ toutourien: 1 }, true), true);
  assert.equal(potsKill({ toutourien: 1 }, false), false);
  assert.equal(potsKill({}, true), false);
});

test('Tout ou rien : un coup encaissé vide la cagnotte', () => {
  assert.equal(potAfterHit({ toutourien: 1 }, 4200), 0);
  assert.equal(potAfterHit({}, 4200), 4200);
});

test('Silence : chaque kill rapporte deux fois plus', () => {
  assert.equal(killPoints('z', { silence: 1 }, 1), 100);
});

test('un Blindé abattu lâche toujours 5 pièces', () => {
  const rng = createRng(3);
  for (let k = 0; k < 100; k++) assert.equal(rollCoins('a', false, rng), 5);
});

test('un zombie lâche une pièce environ une fois sur trois', () => {
  const rng = createRng(11);
  let coins = 0;
  for (let k = 0; k < 10000; k++) coins += rollCoins('z', false, rng);
  assert.ok(coins > 2700 && coins < 3300, coins);
});

test('un ennemi tué au-dessus du vide ne lâche aucune pièce', () => {
  assert.equal(rollCoins('a', true, fixed(0)), 0);
});

test('la fin de la vague 6 rapporte 6 pièces', () => {
  assert.equal(waveCoins(6), 6);
});

test('sous Tout ou rien, les pièces ramassées pendant la vague sont en jeu et un coup encaissé les fait perdre', () => {
  assert.equal(potsKill({ toutourien: 1 }, true), true);
  assert.equal(potAfterHit({ toutourien: 1 }, 7), 0);
  assert.equal(potsKill({ toutourien: 1 }, false), false); // pendant la pause, elles vont droit dans la bourse
});
