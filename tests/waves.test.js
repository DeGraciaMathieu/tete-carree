import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createRng } from '../src/rules/rng.js';
import { firstWave, waveCounts, waveQueue, queueCount, spawnBurst, spawnGap } from '../src/rules/waves.js';

const tally = q => q.reduce((t, k) => ({ ...t, [k[0]]: (t[k[0]] || 0) + 1 }), {});

test('la première vague ne contient que 13 zombies', () => {
  assert.deepEqual(tally(waveQueue(1, {}, createRng(1))), { z: 13 });
});

test('chaque nouveau type d\'ennemi entre à sa vague annoncée', () => {
  assert.ok(tally(waveQueue(2, {}, createRng(1))).b, 'Gonflés en vague 2');
  assert.ok(tally(waveQueue(3, {}, createRng(1))).d, 'diables en vague 3');
  assert.ok(tally(waveQueue(4, {}, createRng(1))).p, 'meutes de coureurs en vague 4');
  assert.ok(tally(waveQueue(5, {}, createRng(1))).s, 'cracheurs en vague 5');
  assert.ok(tally(waveQueue(6, {}, createRng(1))).a, 'blindés en vague 6');
  assert.equal(tally(waveQueue(5, {}, createRng(1))).a, undefined);
});

test('le bestiaire annonce la vague où chaque ennemi arrive, ni avant ni après', () => {
  for (const type of ['z', 'b', 'd', 'p', 's', 'a']) {
    const n = firstWave(type);
    assert.ok(tally(waveQueue(n, {}, createRng(1)))[type], `${type} présent en vague ${n}`);
    if (n > 1) assert.equal(tally(waveQueue(n - 1, {}, createRng(1)))[type], undefined, `${type} absent en vague ${n - 1}`);
  }
  assert.deepEqual(['z', 'b', 'd', 'p', 's', 'a'].map(firstWave), [1, 2, 3, 4, 5, 6]);
});

test('Prime de risque grossit chaque meute de deux coureurs', () => {
  const plain = waveQueue(8, {}, createRng(3)).filter(k => k[0] === 'p');
  const risky = waveQueue(8, { prime: 1 }, createRng(3)).filter(k => k[0] === 'p');
  assert.deepEqual(risky.map(k => +k.slice(1)), plain.map(k => +k.slice(1) + 2));
});

test('le compteur de restants compte chaque coureur d\'une meute', () => {
  assert.equal(queueCount(['z', 'p4', 'b']), 6);
});

test('à partir de la vague 7, la horde sort deux par deux, de plus en plus vite', () => {
  assert.equal(spawnBurst(6), 1);
  assert.equal(spawnBurst(7), 2);
  assert.ok(spawnGap(2) > spawnGap(10));
  assert.equal(spawnGap(30), .16);
});

test('Élite : chaque type compte deux fois moins d\'ennemis, arrondi au supérieur', () => {
  const plain = tally(waveQueue(9, {}, createRng(5))), elite = tally(waveQueue(9, { elite: 1 }, createRng(5)));
  for (const t of ['z', 'd', 'b', 's', 'a']) assert.equal(elite[t], Math.ceil(plain[t] / 2), t);
  assert.equal(elite.p, plain.p, 'autant de meutes');
});

test('Élite : une meute compte au moins 2 coureurs, et deux fois moins qu\'à l\'ordinaire', () => {
  for (let seed = 0; seed < 30; seed++) for (const k of waveQueue(12, { elite: 1 }, createRng(seed)).filter(k => k[0] === 'p')) {
    const size = +k.slice(1);
    assert.ok(size >= 2 && size <= 4, k);
  }
});

const armored = q => q.filter(t => t === 'a').length;

test('l\'Appât ajoute 2 Blindés à la vague', () => {
  assert.equal(armored(waveQueue(8, {}, createRng(1), { appat: 1 })), armored(waveQueue(8, {}, createRng(1))) + 2);
});

test('le Répulsif retire 15 % des ennemis de chaque type', () => {
  const k = waveCounts(12, {}), r = waveCounts(12, {}, { repulsif: 1 });
  for (const t of ['z', 'b', 'd', 's', 'a', 'p']) assert.equal(r[t], Math.max(t === 'z' ? 1 : 0, Math.floor(k[t] * .85)), t);
});

test('le Leurre rend aux meutes leur taille normale sous Prime de risque', () => {
  const runners = q => queueCount(q.filter(t => t[0] === 'p'));
  assert.equal(runners(waveQueue(8, { prime: 1 }, createRng(4), { leurre: 1 })), runners(waveQueue(8, {}, createRng(4))));
});
