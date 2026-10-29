// Apparition des ennemis, lancement des vagues, crachats d'acide.
import { sfx } from '../audio/sfx.js';
import { ACID_SPLASH_DAMAGE, ACID_SPLASH_RADIUS, ENEMY_FIRST_ATTACK, ENEMY_STATS, MH, MW, PUDDLE_LIFE, PUDDLE_RADIUS, SPIT_CD, SPIT_CD_RAND, SPIT_LEAD, SPIT_LEAD_MIN, SPIT_LEAD_RAND, T, WAVE_FIRST_SPAWN } from '../config.js';
import { hurtPlayer } from './combat.js';
import { moveInput } from './player.js';
import { addPart } from '../render/effects.js';
import { fctx } from '../render/floor.js';
import { banner } from '../render/hud.js';
import { enemyHpMul, enemySpeedMul } from '../rules/modifiers.js';
import * as Waves from '../rules/waves.js';
import { doors, isVoid, tileAt } from '../state/arena.js';
import { S, jitter, player, queueCount, rng, world } from '../state/world.js';
import { clamp, rnd } from '../util.js';

export function spawnEnemy(type, door) {
  if (type[0] === 'p') {
    // la meute se répartit sur les différents côtés de l'arène pour prendre le joueur en tenaille
    const k = +type.slice(1), groups = {};
    for (const d of doors) { const side = d[1] === 0 ? 'n' : d[1] === MH - 1 ? 's' : d[0] === 0 ? 'o' : 'e'; (groups[side] = groups[side] || []).push(d); }
    const sides = Object.values(groups).sort(() => rng() - .5);
    for (let i = 0; i < k; i++) { const g = sides[i % sides.length]; spawnEnemy('r', g[rng() * g.length | 0]); }
    sfx('screech');
    return;
  }
  const [dx, dy] = door || doors[rng() * doors.length | 0];
  const n = S.wave;
  const s = ENEMY_STATS[type] || ENEMY_STATS.d;
  const hpMul = enemyHpMul(S.mods);
  const e = { type, r: s.r, hp: (s.hp + n * s.hpWave) * hpMul, sp: (s.sp + Math.min(s.spCap, n * s.spWave) + rng() * s.spRand) * enemySpeedMul(S.mods) };
  if (type === 'a') e.shield = (s.shield + n * s.shieldWave) * hpMul;
  else if (type === 's') { e.spitCd = s.spitCd + rng() * s.spitCdRand; e.wind = 0; }
  else if (s === ENEMY_STATS.d) e.fire = s.fire + rng() * s.fireRand;
  Object.assign(e, { x: dx * T + T / 2 + jitter(6), y: dy * T + T / 2 + jitter(6), vx: 0, vy: 0, fx: 0, fy: 1, flash: 0, atk: ENEMY_FIRST_ATTACK, walk: Math.random() * 6, moving: true, bump: -1, dead: false });
  e.shieldMax = e.shield || 0;
  e.x = clamp(e.x, e.r + 1, MW * T - e.r - 1); e.y = clamp(e.y, e.r + 1, MH * T - e.r - 1);
  world.enemies.push(e);
}

export function startWave() {
  S.wave++; const n = S.wave;
  S.queue = Waves.waveQueue(n, S.mods, rng);
  S.waveActive = true; S.spawnT = WAVE_FIRST_SPAWN;
  S.lastKill = S.time + WAVE_FIRST_SPAWN; // Sablier : la perte ne commence qu'après la première apparition
  world.shake = Math.min(16, world.shake + 6);
  banner(`Vague ${n}`, n === 2 ? 'Les Gonflés arrivent : ils explosent' : n === 3 ? 'Les diables arrivent' : n === 4 ? 'Des coureurs arrivent en meute' : n === 5 ? 'Des cracheurs arrivent : sors de l\'acide' : n === 6 ? 'Des blindés arrivent : prends-les à revers' : `${queueCount()} ennemis`, 'start');
  sfx('wave');
}
/* Coureur : zombie maigre en survêtement, penché en avant */
/* Cracheur : zombie voûté en blouse d'hôpital, poche à acide sous la gorge */
export function spit(e) {
  e.spitCd = SPIT_CD + rng() * SPIT_CD_RAND;
  const [mx, my] = moveInput(), ml = Math.hypot(mx, my);
  const d = Math.hypot(player.x - e.x, player.y - e.y), fl = clamp(d / 260, .45, .9);
  const lead = ml > .2 && !player.roll ? SPIT_LEAD * fl * (SPIT_LEAD_MIN + rng() * SPIT_LEAD_RAND) / ml : 0;
  const x1 = clamp(player.x + mx * lead, T, (MW - 1) * T), y1 = clamp(player.y + my * lead, T, (MH - 1) * T);
  world.globs.push({ x0: e.x + e.fx * 6, y0: e.y + e.fy * 3, x1, y1, t: 0, T: fl, H: 36 + d * .15, x: e.x, y: e.y, z: 22 });
  sfx('spit');
}
export function updateGlobs(dt) {
  for (const g of world.globs) {
    g.t += dt;
    const k = Math.min(1, g.t / g.T);
    g.x = g.x0 + (g.x1 - g.x0) * k; g.y = g.y0 + (g.y1 - g.y0) * k; g.z = 22 * (1 - k) + 4 * g.H * k * (1 - k);
    if (Math.random() < dt * 30) addPart({ t: 'spark', x: g.x, y: g.y, z: g.z, vx: rnd(15), vy: rnd(15), vz: 0, life: .5, size: 1.8, color: '#9ed14a' });
    if (k >= 1) { g.done = true; splashAcid(g.x1, g.y1); }
  }
  world.globs = world.globs.filter(g => !g.done);
}
function splashAcid(x, y) {
  for (let k = 0; k < 12; k++) addPart({ t: 'spark', x, y, z: 4, vx: rnd(90), vy: rnd(90), vz: 60 + Math.random() * 90, life: .6, size: 2.2, color: '#b6e04a' });
  sfx('splash', 60);
  if (isVoid(x, y) || tileAt(Math.floor(x / T), Math.floor(y / T))) return;
  world.puddles.push({ x, y, t: PUDDLE_LIFE, max: PUDDLE_LIFE, r: PUDDLE_RADIUS });
  fctx.fillStyle = 'rgba(110,140,40,.16)'; fctx.beginPath(); fctx.ellipse(x, y, 22, 13, 0, 0, 7); fctx.fill();
  if (Math.hypot(player.x - x, (player.y - y) * 1.4) < ACID_SPLASH_RADIUS) hurtPlayer(ACID_SPLASH_DAMAGE);
}
