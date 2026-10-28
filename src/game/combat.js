// Dégâts infligés et subis, mort des ennemis, explosions et ondes de choc.
import { sfx } from '../audio/sfx.js';
import { BLOATER_DAMAGE, BLOATER_RADIUS, CHAIR_RADIUS_MUL, SECOND_WIND_SHOCK_DAMAGE, SECOND_WIND_SHOCK_RADIUS, T } from '../config.js';
import { addScore } from './score.js';
import { damageBlock } from './weapons.js';
import { rumble } from '../input/gamepad.js';
import { addPart, blood, dust, gibs, pop, sparks } from '../render/effects.js';
import { fctx, stampBlood, stampScorch } from '../render/floor.js';
import { banner } from '../render/hud.js';
import { playerProtected, resolveEnemyHit, secondWind } from '../rules/damage.js';
import { killPoints, rollDrop, soifHeal } from '../rules/scoring.js';
import { isVoid } from '../state/arena.js';
import { S, blocks, comboTime, mod, multiplier, player, rng, world } from '../state/world.js';
import { $, fmt, rnd } from '../util.js';

// kind : 'blast' (explosions, ondes de choc) et 'ap' (railgun) ignorent le bouclier du blindé
// renvoie 'blocked' quand le coup s'écrase sur le bouclier
export function hurtEnemy(e, dmg, dx, dy, knock, kind) {
  if (e.dead) return;
  const hit = resolveEnemyHit(e, dmg, dx, dy, knock, kind);
  knock = hit.knock;
  if (hit.blocked) {
    const fl = Math.hypot(e.fx, e.fy) || 1;
    e.shield -= hit.shieldDmg; e.hp -= hit.hpDmg; e.shieldFlash = .08;
    e.vx += dx * knock; e.vy += dy * knock;
    sparks(e.x + e.fx / fl * 12, e.y + e.fy / fl * 6, 4, '#dfe8ef'); sfx('clang', 45);
    if (e.shield <= 0) {
      e.shield = 0;
      gibs(e.x + e.fx * 10, e.y + e.fy * 5, 9, ['#8fa3b5', '#5f7385', '#c9d6e0']);
      sfx('shieldbreak'); pop(e.x, e.y - 48, 'Bouclier brisé', '#dfe8ef');
    }
    if (e.hp <= 0) killEnemy(e, dx, dy);
    return 'blocked';
  }
  e.hp -= hit.hpDmg; e.flash = .08; e.vx += dx * knock; e.vy += dy * knock;
  if (knock >= 150) e.knockT = .3;
  blood(e.x, e.y, 2 + (Math.random() * 3 | 0), dx, dy);
  sfx('hit', 35);
  if (e.hp <= 0) killEnemy(e, dx, dy);
}
// fell : l'ennemi a été projeté dans une crevasse
export function killEnemy(e, dx, dy, fell) {
  e.dead = true; S.kills++; S.combo++; S.comboT = comboTime(); S.bestCombo = Math.max(S.bestCombo, S.combo);
  const m = multiplier(), pts = killPoints(e.type, S.mods, m), heal = soifHeal(S.mods, m);
  if (heal && !player.dead) player.hp = Math.min(player.maxHp, player.hp + heal);
  addScore(pts);
  pop(e.x, e.y - 40, (fell ? 'Chute ! +' : '+') + fmt(pts), m > 1 || fell ? '#f2c230' : '#ffffff');
  const cEl = $('comboNum'); cEl.classList.add('bump'); setTimeout(() => cEl.classList.remove('bump'), 90);
  if (fell) { world.fallers.push({ e, t: 0 }); sfx('fall'); return; }
  blood(e.x, e.y, 12, dx, dy, 120);
  gibs(e.x, e.y, 6, e.type === 'z' ? ['#b7c49c', '#7b8a6c', '#7a1512'] : e.type === 'b' ? ['#c9b86a', '#8fd14f', '#7a4a6a'] : e.type === 'r' ? ['#c9c6bb', '#c86a2a', '#7a1512'] : e.type === 's' ? ['#9d8fa6', '#d9d4c6', '#9ed14a'] : e.type === 'a' ? ['#2b3442', '#a9b49a', '#7a1512'] : ['#c4362d', '#4a1210', '#7a1512']);
  if (e.type === 'b') world.bursts.push({ x: e.x, y: e.y, t: .08 });
  stampBlood(e.x + dx * 6, e.y + dy * 6, 9 + Math.random() * 6, .7);
  sfx('splat', 25);
  const kind = rollDrop(e.type, isVoid(e.x, e.y), rng);
  if (kind) world.pickups.push({ x: e.x, y: e.y, kind, ph: Math.random() * 6 });
}

export function hurtPlayer(dmg, soft) {
  if (player.dead || world.state !== 'play') return;
  if (playerProtected(player)) return;
  player.hp -= dmg; player.hurtT = .35; player.flash = .08; player.lastHurt = S.time;
  if (!soft) { world.shake = Math.min(16, world.shake + 4); S.comboT = Math.max(0, S.comboT - .6); }
  blood(player.x, player.y, 4);
  sfx('hurt', 120);
  if (soft) rumble(0, .15, 50); else rumble(.6, .4, 140);
  const revive = secondWind(player.hp, player.maxHp, S.mods, S.souffleUsed);
  if (revive) {
    S.souffleUsed = true; player.hp = revive.hp; player.invuln = revive.invuln;
    shockwave(player.x, player.y, SECOND_WIND_SHOCK_RADIUS, SECOND_WIND_SHOCK_DAMAGE);
    banner('Second souffle', 'Tu te relèves'); sfx('unlock');
    return;
  }
  if (player.hp <= 0) {
    player.hp = 0; player.dead = true; S.overT = 1.6;
    blood(player.x, player.y, 26, 0, 0, 160); gibs(player.x, player.y, 10, ['#2f5d8a', '#e2b48a', '#7a1512']);
    stampBlood(player.x, player.y, 16, .8); sfx('splat');
  }
}
export function shockwave(x, y, R, dmg) {
  for (const e of world.enemies) {
    if (e.dead) continue;
    const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1;
    if (d < R + e.r) hurtEnemy(e, dmg, dx / d, dy / d, 340, 'blast');
  }
  world.booms.push({ x, y, R, t: 0, max: .38, ring: true });
  dust(x, y, 8); world.shake = Math.min(16, world.shake + 4); sfx('shock', 60);
}
export function explosion(x, y, R, dmg) {
  { const pd = Math.hypot(player.x - x, player.y - y); if (pd < 420) rumble(.75 * (1 - pd / 420), .45 * (1 - pd / 420), 220); }
  for (const e of world.enemies) {
    if (e.dead) continue;
    const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1;
    if (d < R + e.r) { const f = 1 - Math.max(0, d - e.r) / R * .6; hurtEnemy(e, dmg * f, dx / d, dy / d, 280 * f, 'blast'); }
  }
  const pd = Math.hypot(player.x - x, player.y - y);
  if (pd < R * .9) hurtPlayer(dmg * .26 * (1 - pd / R * .5));
  for (const b of blocks.values()) {
    const bx = b.tx * T + T / 2, by = b.ty * T + T / 2, d = Math.hypot(bx - x, by - y);
    if (d < R + 12 && d > 1) {
      if (b.kind === 'barrel') { if (!b.pend) { b.pend = true; world.pending.push({ b, t: .13 }); } }
      else damageBlock(b, dmg * .55);
    }
  }
  world.booms.push({ x, y, R, t: 0, max: .5 });
  for (let k = 0; k < 18; k++) addPart({ t: 'fire', x: x + rnd(R * .3), y: y + rnd(R * .3), z: 6 + Math.random() * 14, vx: rnd(120), vy: rnd(120), vz: 30 + Math.random() * 80, life: .35 + Math.random() * .3, max: .6, size: 5 + Math.random() * 6 });
  for (let k = 0; k < 14; k++) addPart({ t: 'smoke', x: x + rnd(R * .4), y: y + rnd(R * .4), z: 8 + Math.random() * 10, vx: rnd(50), vy: rnd(50), vz: 20 + Math.random() * 30, life: 1.2, max: 1.2, size: 8 + Math.random() * 8, color: 'rgba(70,66,62,' });
  sparks(x, y, 10);
  stampScorch(x, y, R * .8);
  world.shake = Math.min(20, world.shake + 10);
  sfx('boom', 40);
}
/* Gonflé : zombie boursouflé qui explose */
export function toxicBurst(x, y) {
  explosion(x, y, BLOATER_RADIUS * Math.pow(CHAIR_RADIUS_MUL, mod('chair')), BLOATER_DAMAGE);
  for (let k = 0; k < 18; k++) addPart({ t: 'smoke', x: x + rnd(24), y: y + rnd(24), z: 6 + Math.random() * 12, vx: rnd(60), vy: rnd(60), vz: 14 + Math.random() * 24, life: 1.6, max: 1.6, size: 7 + Math.random() * 8, color: 'rgba(150,200,70,' });
  for (let k = 0; k < 14; k++) addPart({ t: 'blood', x, y, z: 16, vx: rnd(190), vy: rnd(190), vz: 60 + Math.random() * 140, life: 2, size: 2 + Math.random() * 2.5, color: '#8fb03c' });
  for (let k = 0; k < 6; k++) {
    fctx.fillStyle = `rgba(${120 + Math.random() * 30 | 0},${160 + Math.random() * 30 | 0},50,.45)`;
    fctx.beginPath(); fctx.ellipse(x + rnd(26), y + rnd(20), 6 + Math.random() * 10, 4 + Math.random() * 6, Math.random() * 3, 0, 7); fctx.fill();
  }
  sfx('splat');
}
