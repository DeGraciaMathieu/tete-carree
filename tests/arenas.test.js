import { describe, test } from 'vitest';
import assert from 'node:assert/strict';
import { ARENAS, MH, MW, T } from '../src/config.js';
import { computeField, nextStep } from '../src/rules/pathfield.js';
import { buildMap, doors, map } from '../src/state/arena.js';

// case de départ du joueur (resetWorld)
const START_X = 22, START_Y = 15 + 4 / T | 0;

// Cases de sol atteignables à pied depuis le départ, de voisine en voisine.
function reachable() {
  const seen = new Uint8Array(MW * MH), todo = [START_Y * MW + START_X];
  seen[todo[0]] = 1;
  while (todo.length) {
    const i = todo.pop(), x = i % MW;
    for (const n of [x > 0 ? i - 1 : -1, x < MW - 1 ? i + 1 : -1, i - MW, i + MW]) {
      if (n >= 0 && n < map.length && !seen[n] && map[n] === 0) { seen[n] = 1; todo.push(n); }
    }
  }
  return seen;
}

describe.each(ARENAS)('arène %s', id => {
  test('le joueur démarre sur une case de sol libre', () => {
    buildMap(id);
    assert.equal(map[START_Y * MW + START_X], 0);
  });

  test('la horde rejoint le joueur à pied depuis chacune des huit portes', () => {
    buildMap(id);
    const seen = reachable();
    assert.equal(doors.length, 8);
    for (const [x, y] of doors) assert.ok(seen[y * MW + x], `porte (${x}, ${y})`);
  });

  test('aucune case de sol n\'est enfermée : une caisse peut tomber partout où l\'on peut marcher', () => {
    buildMap(id);
    const seen = reachable();
    for (let i = 0; i < map.length; i++) if (map[i] === 0) assert.ok(seen[i], `case (${i % MW}, ${i / MW | 0})`);
  });

  test('un ennemi posté sur n\'importe quelle case de sol sait vers où marcher pour rejoindre le joueur', () => {
    buildMap(id);
    const dist = computeField(map, new Map(), START_X, START_Y);
    for (let i = 0; i < map.length; i++) {
      if (map[i] !== 0 || i === START_Y * MW + START_X) continue;
      const x = i % MW, y = i / MW | 0;
      assert.ok(nextStep(map, new Map(), dist, x * T + T / 2, y * T + T / 2) >= 0, `case (${x}, ${y})`);
    }
  });
});
