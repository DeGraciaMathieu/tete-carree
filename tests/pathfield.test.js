import { test } from 'vitest';
import assert from 'node:assert/strict';
import { T, MW, MH } from '../src/config.js';
import { computeField, nextStep } from '../src/rules/pathfield.js';

const WALL = 1, VOID = 3;
const idx = (tx, ty) => ty * MW + tx;
const center = (tx, ty) => [tx * T + T / 2, ty * T + T / 2];

// Arène pleine de murs, creusée d'un couloir en S : (5,5) → (10,5) → (10,15) → (15,15).
// Les angles droits imposent des pas cardinaux, donc des distances entières.
function corridor() {
  const map = new Uint8Array(MW * MH).fill(WALL);
  for (let tx = 5; tx <= 10; tx++) map[idx(tx, 5)] = 0;
  for (let ty = 5; ty <= 15; ty++) map[idx(10, ty)] = 0;
  for (let tx = 10; tx <= 15; tx++) map[idx(tx, 15)] = 0;
  return map;
}

test('un zombie suit le couloir jusqu\'au joueur', () => {
  const map = corridor();
  const dist = computeField(map, new Map(), 15, 15);
  assert.equal(dist[idx(5, 5)], 20);
  const [x, y] = center(5, 5);
  assert.equal(nextStep(map, new Map(), dist, x, y), idx(6, 5));
});

test('une barricade dans le couloir se défonce, mais allonge le chemin', () => {
  const map = corridor();
  const dist = computeField(map, new Map([[idx(10, 10), { kind: 'wall' }]]), 15, 15);
  assert.equal(dist[idx(5, 5)], 29);
});

test('une zone coupée du joueur par une crevasse converge vers le bord le plus proche', () => {
  const map = corridor();
  map[idx(10, 10)] = VOID;
  const dist = computeField(map, new Map(), 15, 15);
  assert.ok(dist[idx(5, 5)] >= 1000 && dist[idx(5, 5)] < 1e8);
  assert.ok(dist[idx(10, 9)] < dist[idx(5, 5)], 'le bord de la crevasse attire la zone coupée');
});

test('dans une arène ouverte, toutes les tuiles ont un chemin jusqu\'au joueur', () => {
  const dist = computeField(new Uint8Array(MW * MH), new Map(), 15, 5);
  assert.ok(dist.every(d => d < 1e8));
});
