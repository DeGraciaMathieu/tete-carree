import { test } from 'vitest';
import assert from 'node:assert/strict';
import { rankRun } from '../src/rules/records.js';

const scores = top => top.map(r => r.score);
const top = [{ score: 900 }, { score: 700 }, { score: 500 }, { score: 300 }, { score: 100 }];

test('une partie entre au classement à sa place', () => {
  assert.deepEqual(scores(rankRun(top, { score: 600 }, 5)), [900, 700, 600, 500, 300]);
});

test('une partie trop faible ne détrône personne', () => {
  assert.deepEqual(scores(rankRun(top, { score: 50 }, 5)), [900, 700, 500, 300, 100]);
});

test('la première partie ouvre le classement', () => {
  assert.deepEqual(scores(rankRun([], { score: 0 }, 5)), [0]);
});

test('à score égal, la partie la plus ancienne reste devant', () => {
  const run = { score: 700 };
  assert.equal(rankRun(top, run, 5).indexOf(run), 2);
});

test('le classement précédent n\'est pas modifié', () => {
  rankRun(top, { score: 1000 }, 5);
  assert.equal(top.length, 5);
});
