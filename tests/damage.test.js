import { test } from 'vitest';
import assert from 'node:assert/strict';
import { resolveEnemyHit, playerProtected, secondWind } from '../src/rules/damage.js';

// Blindé qui regarde vers la droite : un tir venu de face voyage vers la gauche (dx = -1).
const armored = { type: 'a', fx: 1, fy: 0, shield: 300 };

test('un tir de face sur un blindé s\'écrase sur son bouclier', () => {
  const hit = resolveEnemyHit(armored, 100, -1, 0, 70);
  assert.equal(hit.blocked, true);
  assert.ok(Math.abs(hit.shieldDmg - 85) < 1e-9 && Math.abs(hit.hpDmg - 15) < 1e-9);
});

test('prendre un blindé à revers touche directement sa chair', () => {
  assert.deepEqual(resolveEnemyHit(armored, 100, 1, 0, 70), { blocked: false, knock: 70 * .2, shieldDmg: 0, hpDmg: 100 });
});

test('explosions et railgun ignorent le bouclier', () => {
  assert.equal(resolveEnemyHit(armored, 100, -1, 0, 70, 'blast').blocked, false);
  assert.equal(resolveEnemyHit(armored, 100, -1, 0, 70, 'ap').blocked, false);
});

test('un bouclier brisé ne protège plus', () => {
  assert.equal(resolveEnemyHit({ ...armored, shield: 0 }, 100, -1, 0, 70).blocked, false);
});

test('un zombie ordinaire encaisse tout, recul compris', () => {
  assert.deepEqual(resolveEnemyHit({ type: 'z', fx: 1, fy: 0 }, 30, -1, 0, 70), { blocked: false, knock: 70, shieldDmg: 0, hpDmg: 30 });
});

test('le joueur est intouchable au cœur de sa roulade, pas pendant l\'élan ni la réception', () => {
  assert.equal(playerProtected({ roll: { t: .03 }, invuln: 0 }), false);
  assert.equal(playerProtected({ roll: { t: .2 }, invuln: 0 }), true);
  assert.equal(playerProtected({ roll: { t: .4 }, invuln: 0 }), false);
  assert.equal(playerProtected({ roll: null, invuln: .5 }), true);
});

test('Second souffle relève le joueur à 40 % de sa vie max, une seule fois', () => {
  assert.deepEqual(secondWind(-5, 125, { souffle: 1 }, false), { hp: 50, invuln: 1.6 });
  assert.equal(secondWind(-5, 125, { souffle: 1 }, true), null);
  assert.equal(secondWind(-5, 125, {}, false), null);
  assert.equal(secondWind(10, 125, { souffle: 1 }, false), null);
});
