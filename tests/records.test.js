import { test } from 'vitest';
import assert from 'node:assert/strict';
import { rankRun, rankStoryRun } from '../src/rules/records.js';

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

const story = (chapter, score, won = false) => ({ chapter, score, won });

test('en Histoire, une partie arrivée au chapitre 3 passe devant une partie restée au chapitre 2 qui a plus de points', () => {
  const run = story(3, 1000);
  assert.equal(rankStoryRun([story(2, 9000)], run, 5)[0], run);
});

test('en Histoire, à chapitre égal, le score départage', () => {
  const run = story(2, 5000);
  assert.deepEqual(rankStoryRun([story(2, 9000), story(2, 1000)], run, 5).map(r => r.score), [9000, 5000, 1000]);
});

test('une histoire terminée passe devant une partie tombée au chapitre 4', () => {
  const run = story(4, 100, true);
  assert.equal(rankStoryRun([story(4, 99999)], run, 5)[0], run);
});

test('en Histoire, à égalité complète, la partie la plus ancienne reste devant', () => {
  const old = story(2, 500), run = story(2, 500);
  assert.equal(rankStoryRun([old], run, 5).indexOf(run), 1);
});

test('le classement Histoire garde au plus cinq parties et ne modifie pas le précédent', () => {
  const top = [5, 4, 3, 2, 1].map(c => story(c, 0));
  const next = rankStoryRun(top, story(3, 10), 5);
  assert.equal(next.length, 5); assert.equal(top.length, 5);
});
