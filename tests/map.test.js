import { test } from 'vitest';
import assert from 'node:assert/strict';
import { T, MW, MH } from '../src/config.js';
import { los, walkLine, openT, circleTouchesVoid } from '../src/rules/map.js';

const WALL = 1, VOID = 3;
const at = (tx) => tx * T + T / 2; // centre de la tuile tx sur la ligne 5
const y = 5 * T + T / 2;

// Arène vide, avec une tuile spéciale en (10, 5).
function arenaWith(kind) {
  const map = new Uint8Array(MW * MH);
  if (kind !== undefined) map[5 * MW + 10] = kind;
  return map;
}

test('on tire par-dessus une crevasse, mais pas à travers un mur', () => {
  assert.equal(los(arenaWith(VOID), new Map(), at(5), y, at(15), y), true);
  assert.equal(los(arenaWith(WALL), new Map(), at(5), y, at(15), y), false);
});

test('une barricade posée bloque la ligne de vue', () => {
  const blocks = new Map([[5 * MW + 10, { kind: 'wall' }]]);
  assert.equal(los(arenaWith(), blocks, at(5), y, at(15), y), false);
});

test('on ne peut pas marcher en ligne droite à travers une crevasse', () => {
  assert.equal(walkLine(arenaWith(), at(5), y, at(15), y), true);
  assert.equal(walkLine(arenaWith(VOID), at(5), y, at(15), y), false);
});

test('une case occupée par une construction n\'est plus libre', () => {
  const blocks = new Map([[5 * MW + 10, { kind: 'barrel' }]]);
  assert.equal(openT(arenaWith(), new Map(), 10, 5), true);
  assert.equal(openT(arenaWith(), blocks, 10, 5), false);
});

test('un personnage au bord d\'une crevasse la touche dès que sa marge la recouvre', () => {
  const map = arenaWith(VOID);
  const nextToVoid = { x: 11 * T + 10, y, r: 9 };
  assert.equal(circleTouchesVoid(map, nextToVoid, 0), false);
  assert.equal(circleTouchesVoid(map, nextToVoid, 2), true);
});
