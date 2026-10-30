import { test } from 'vitest';
import assert from 'node:assert/strict';
import { MW, T } from '../src/config.js';
import { chapterArena, chapterOf, endsChapter, endsStory } from '../src/rules/story.js';
import { map, mapId } from '../src/state/arena.js';
import { S, ammo, blocks, enterArena, player, resetWorld, unlocked, world } from '../src/state/world.js';

const arenaOfWave = n => chapterArena(chapterOf(n));

test('les vagues 1 à 5 se jouent à Chinatown, 6 à 10 au camp de Sibérie, 11 à 15 dans les égouts, 16 à 20 au camp militaire', () => {
  for (let n = 1; n <= 5; n++) assert.equal(arenaOfWave(n), 'chinatown', `vague ${n}`);
  for (let n = 6; n <= 10; n++) assert.equal(arenaOfWave(n), 'siberie', `vague ${n}`);
  for (let n = 11; n <= 15; n++) assert.equal(arenaOfWave(n), 'egouts', `vague ${n}`);
  for (let n = 16; n <= 20; n++) assert.equal(arenaOfWave(n), 'militaire', `vague ${n}`);
});

test('la pause avant la première vague appartient au premier chapitre', () => {
  assert.equal(chapterOf(0), 0);
});

test('seule la dernière vague d\'un chapitre le termine', () => {
  for (const n of [5, 10, 15, 20]) assert.ok(endsChapter(n), `vague ${n}`);
  for (const n of [0, 1, 4, 6, 9, 11, 19]) assert.ok(!endsChapter(n), `vague ${n}`);
});

test('la vingtième vague termine l\'histoire, pas la quinzième', () => {
  assert.ok(endsStory(20));
  assert.ok(!endsStory(15));
});

test('une nouvelle partie Histoire commence à Chinatown sans toucher à l\'arène choisie sur l\'accueil', () => {
  world.arena = 'bunker';
  resetWorld(chapterArena(0));
  assert.equal(mapId, 'chinatown');
  assert.equal(world.arena, 'bunker');
  assert.equal(S.chapter, 0);
});

// Une partie arrivée au bout du premier chapitre : cartes, score, armes, vie entamée, constructions posées.
function endOfChapterOne() {
  resetWorld(chapterArena(0));
  S.mods = { cadence: 2, constitution: 1 }; S.score = 12345; S.wave = 5; S.kills = 80; S.bestCombo = 14;
  player.hp = 42; player.maxHp = 125; player.weapon = 2; player.x = 5 * T; player.y = 20 * T;
  unlocked[1] = unlocked[2] = true; ammo[1] = 50; ammo[2] = 30;
  blocks.set(20 * MW + 10, { kind: 'wall', hp: 100 });
  world.pickups.push({ x: 100, y: 100 }); world.puddles.push({ x: 200, y: 200, t: 2 }); world.enemies.push({ type: 'z', x: 300, y: 300 });
}

test('changer d\'arène garde les cartes, le score, la vague, la vie, les armes et les munitions', () => {
  endOfChapterOne();
  enterArena(chapterArena(1));
  assert.deepEqual(S.mods, { cadence: 2, constitution: 1 });
  assert.equal(S.score, 12345); assert.equal(S.wave, 5); assert.equal(S.kills, 80); assert.equal(S.bestCombo, 14);
  assert.equal(player.hp, 42); assert.equal(player.maxHp, 125); assert.equal(player.weapon, 2);
  assert.ok(unlocked[1] && unlocked[2]); assert.equal(ammo[1], 50); assert.equal(ammo[2], 30);
});

test('changer d\'arène retire barricades, tourelles, barils, caisses de ravitaillement, flaques et ennemis', () => {
  endOfChapterOne();
  enterArena(chapterArena(1));
  assert.equal(blocks.size, 0);
  assert.equal(world.pickups.length, 0); assert.equal(world.puddles.length, 0); assert.equal(world.enemies.length, 0);
});

test('changer d\'arène ramène le joueur au centre de la nouvelle arène', () => {
  endOfChapterOne();
  enterArena(chapterArena(1));
  assert.equal(mapId, 'siberie');
  assert.equal(player.x, 22 * T); assert.equal(player.y, 15 * T + 4);
  assert.equal(map[Math.floor(player.y / T) * MW + Math.floor(player.x / T)], 0);
});
