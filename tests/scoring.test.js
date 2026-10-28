import { test } from 'vitest';
import assert from 'node:assert/strict';
import { killPoints, soifHeal, rollDrop } from '../src/rules/scoring.js';

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
