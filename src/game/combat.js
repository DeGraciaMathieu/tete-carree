// Dégâts infligés et subis, mort des ennemis, explosions et ondes de choc.
import { sfx } from '../audio/sfx.js';
import { BARREL_CHAIN_DELAY, BLAST_BLOCK_DAMAGE, BLAST_BLOCK_REACH, BLAST_FALLOFF, BLAST_KNOCK, BLAST_SELF_DAMAGE, BLAST_SELF_FALLOFF, BLAST_SELF_RANGE, BLOATER_DAMAGE, BLOATER_RADIUS, CHAIR_RADIUS_MUL, COIN_LIFE, COIN_MAX, COIN_SCATTER, SECOND_WIND_SHOCK_DAMAGE, SECOND_WIND_SHOCK_KNOCK, SECOND_WIND_SHOCK_RADIUS, SHOP_COIN_LIFE, SHOP_HEAD_MUL, T } from '../config.js';
import { addScore } from './score.js';
import { damageBlock } from './weapons.js';
import { tr } from '../i18n/index.js';
import { rumble } from '../input/gamepad.js';
import { addPart, blood, dust, gibs, pop, sparks } from '../render/effects.js';
import { fctx, stampBlood, stampScorch } from '../render/floor.js';
import { banner } from '../render/hud.js';
import { playerProtected, resolveEnemyHit, secondWind } from '../rules/damage.js';
import { comboAfterHit, comboKillsAfterHit, ownBlastRadius, ownBlastSelfMul, specialMul } from '../rules/modifiers.js';
import { killPoints, potAfterHit, potsKill, rollCoins, rollDrop, soifHeal } from '../rules/scoring.js';
import { isVoid, openT } from '../state/arena.js';
import { S, blocks, comboTime, jitter, mod, multiplier, player, rng, world } from '../state/world.js';
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
      sfx('shieldbreak'); pop(e.x, e.y - 48, tr.shieldBroken, '#dfe8ef');
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
  e.dead = true; S.kills++; S.combo++; S.lastKill = S.time; S.comboT = comboTime(); S.bestCombo = Math.max(S.bestCombo, S.combo);
  const m = multiplier(), heal = soifHeal(S.mods, m);
  let pts = killPoints(e.type, S.mods, m);
  if (e.type === 'a' && S.buffs.tete === 1) { pts *= SHOP_HEAD_MUL; S.buffs.tete = 2; } // Prime de tête (Comptoir) : le premier Blindé seulement
  if (heal && !player.dead) player.hp = Math.min(player.maxHp, player.hp + heal);
  if (potsKill(S.mods, S.waveActive)) S.pot += pts; else addScore(pts);
  pop(e.x, e.y - 40, (fell ? tr.fall : '+') + fmt(pts), m > 1 || fell ? '#f2c230' : '#ffffff');
  const cEl = $('comboNum'); cEl.classList.add('bump'); setTimeout(() => cEl.classList.remove('bump'), 90);
  if (fell) { world.fallers.push({ e, t: 0 }); sfx('fall'); return; }
  blood(e.x, e.y, 12, dx, dy, 120);
  gibs(e.x, e.y, 6, e.type === 'z' ? ['#b7c49c', '#7b8a6c', '#7a1512'] : e.type === 'b' ? ['#c9b86a', '#8fd14f', '#7a4a6a'] : e.type === 'r' ? ['#c9c6bb', '#c86a2a', '#7a1512'] : e.type === 's' ? ['#9d8fa6', '#d9d4c6', '#9ed14a'] : e.type === 'a' ? ['#2b3442', '#a9b49a', '#7a1512'] : ['#c4362d', '#4a1210', '#7a1512']);
  if (e.type === 'b') world.bursts.push({ x: e.x, y: e.y, t: .08 });
  stampBlood(e.x + dx * 6, e.y + dy * 6, 9 + Math.random() * 6, .7);
  sfx('splat', 25); sfx('kill', 30);
  const kind = rollDrop(e.type, isVoid(e.x, e.y), rng, S.mods);
  if (kind) world.pickups.push({ x: e.x, y: e.y, kind, ph: Math.random() * 6 });
  if (!world.demo) dropCoins(e.x, e.y, rollCoins(e.type, isVoid(e.x, e.y), rng, S.buffs));
}
// Pièces éparpillées autour du corps, jamais dans un mur, une construction ou le vide ; au-delà de COIN_MAX, la plus ancienne disparaît.
// z, vz : petit saut à la chute ; ph : phase de la rotation et de l'éclat. Cosmétiques.
function dropCoins(x, y, n) {
  for (let k = 0; k < n; k++) {
    let cx = x + jitter(COIN_SCATTER), cy = y + jitter(COIN_SCATTER) * .55;
    if (!openT(cx / T | 0, cy / T | 0)) { cx = x; cy = y; }
    if (world.coins.length >= COIN_MAX) world.coins.shift();
    world.coins.push({ x: cx, y: cy, z: 2, vz: -(60 + Math.random() * 50), life: S.buffs.collantes ? SHOP_COIN_LIFE : COIN_LIFE, ph: Math.random() * 6 });
  }
}

export function hurtPlayer(dmg, soft) {
  if (player.dead || (world.state !== 'play' && !world.demo)) return;
  if (playerProtected(player)) return;
  // Gilet (Comptoir) : le premier vrai coup de la vague ne fait rien
  if (!soft && S.buffs.gilet === 1) { S.buffs.gilet = 2; player.invuln = .3; pop(player.x, player.y - 46, tr.shop.gilet.name, '#dfe8ef'); sfx('shieldbreak'); return; }
  S.waveHurt = true; // Contrat (Comptoir)
  player.hp -= dmg; player.hurtT = .35; player.flash = .08; player.lastHurt = S.time;
  if (!soft) { world.shake = Math.min(16, world.shake + 4); S.combo = comboKillsAfterHit(S.mods, S.combo, S.comboT); S.comboT = comboAfterHit(S.mods, S.comboT); }
  S.coinPot = potAfterHit(S.mods, S.coinPot); // Tout ou rien : les pièces en jeu sont perdues comme les points
  if (S.pot && !potAfterHit(S.mods, S.pot)) { pop(player.x, player.y - 46, `−${fmt(S.pot)} perdus`, '#ff8f84'); S.pot = 0; }
  blood(player.x, player.y, 4);
  sfx('hurt', 120);
  if (soft) rumble(0, .15, 50); else rumble(.6, .4, 140);
  const revive = secondWind(player.hp, player.maxHp, S.mods, S.souffleUsed);
  if (revive) {
    S.souffleUsed = true; player.hp = revive.hp; player.invuln = revive.invuln;
    shockwave(player.x, player.y, SECOND_WIND_SHOCK_RADIUS, SECOND_WIND_SHOCK_DAMAGE);
    banner(tr.cards.souffle.name, tr.getUp); sfx('unlock');
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
    if (d < R + e.r) hurtEnemy(e, dmg, dx / d, dy / d, SECOND_WIND_SHOCK_KNOCK, 'blast');
  }
  world.booms.push({ x, y, R, t: 0, max: .38, ring: true });
  dust(x, y, 8); world.shake = Math.min(16, world.shake + 4); sfx('shock', 60);
}
// own : explosion provoquée par le joueur (baril, grenade, roquette), soumise à Poudre noire
export function explosion(x, y, R, dmg, own = false) {
  if (own) R = ownBlastRadius(S.mods, R);
  const em = own ? specialMul(S.mods) : 1; // Spécialiste : ses explosions blessent deux fois plus la horde
  { const pd = Math.hypot(player.x - x, player.y - y); if (pd < 420) rumble(.75 * (1 - pd / 420), .45 * (1 - pd / 420), 220); }
  for (const e of world.enemies) {
    if (e.dead) continue;
    const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1;
    if (d < R + e.r) { const f = 1 - Math.max(0, d - e.r) / R * BLAST_FALLOFF; hurtEnemy(e, dmg * f * em, dx / d, dy / d, BLAST_KNOCK * f, 'blast'); }
  }
  const pd = Math.hypot(player.x - x, player.y - y);
  if (pd < R * BLAST_SELF_RANGE) hurtPlayer(dmg * BLAST_SELF_DAMAGE * (1 - pd / R * BLAST_SELF_FALLOFF) * (own ? ownBlastSelfMul(S.mods) : 1));
  for (const b of blocks.values()) {
    const bx = b.tx * T + T / 2, by = b.ty * T + T / 2, d = Math.hypot(bx - x, by - y);
    if (d < R + BLAST_BLOCK_REACH && d > 1) {
      if (b.kind === 'barrel') { if (!b.pend) { b.pend = true; world.pending.push({ b, t: BARREL_CHAIN_DELAY }); } }
      else damageBlock(b, dmg * BLAST_BLOCK_DAMAGE);
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
