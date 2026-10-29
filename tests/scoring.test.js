import { test } from 'vitest';
import assert from 'node:assert/strict';
import { killPoints, soifHeal, rollDrop, waveBonus } from '../src/rules/scoring.js';

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
