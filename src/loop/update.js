// Pas de simulation : fait avancer la partie de `dt` secondes.
import { sfx } from '../audio/sfx.js';
import { ACID_DAMAGE, ACID_SPEED_MUL, ACID_TICK, ACID_TICK_RESET, AIMANT_RANGE, AIMANT_SPEED, AMMO_NO_WEAPON_BONUS, AMMO_REFILL_WEAPONS, ARMOR_SHOVE, BARBELES_DAMAGE, BLOATER_FUSE, BLOATER_FUSE_SPEED, BLOCK_ATTACK_CD, BOX_HP_CHANCE, BOX_MIN_DIST, BOX_PERIOD_MIN, BOX_PERIOD_RAND, DEVIL_FIRE_CD, DEVIL_FIRE_RAND, DEVIL_RANGE, DEVIL_SPREAD, ENEMY_ATTACK_CD, ENEMY_BLOCK_DAMAGE, ENEMY_MELEE_DAMAGE, FIELD_PERIOD, FIREBALL_BLOCK_DAMAGE, FIREBALL_DAMAGE, FIREBALL_LIFE, FIREBALL_SPEED, FRENZY_SPEED_MUL, GRENADE_DAMAGE, GRENADE_RADIUS, MAX_ENEMIES, MAX_PICKUPS, MEDKIT_HP, MH, MW, PICKUP_RADIUS, PICK_DELAY, PLAYER_SPEED, REGEN_DELAY, REGEN_RATE, ROCKET_DAMAGE, ROCKET_RADIUS, ROLL, SPITTER_BACKOFF, SPITTER_HOLD, SPITTER_HOLD_SPEED, SPITTER_MIN_RANGE, SPITTER_SIGHT, SPITTER_TOO_CLOSE, SPITTER_WINDUP, T, W, WAVE_BONUS, WAVE_BREAK } from '../config.js';
import { explosion, hurtEnemy, hurtPlayer, killEnemy, toxicBurst } from '../game/combat.js';
import { spawnEnemy, spit, startWave, updateGlobs } from '../game/enemies.js';
import { gameOver, openPick } from '../game/flow.js';
import { moveInput, updateFires, updateRoll } from '../game/player.js';
import { addScore } from '../game/score.js';
import { damageBlock, explodeBarrel, fireWeapon, updateTurret } from '../game/weapons.js';
import { pad } from '../input/gamepad.js';
import { keys, mouseFire } from '../input/keyboard.js';
import { aim } from '../input/touch.js';
import { VH, VW, zoom } from '../render/canvas.js';
import { addPart, dust, gibs, pop, sparks } from '../render/effects.js';
import { fctx, stampBlood } from '../render/floor.js';
import { banner } from '../render/hud.js';
import * as Waves from '../rules/waves.js';
import { computeField, dist, isVoid, los, moveCircle, nextStep, openT, passable, shotTile, unstick, walkLine } from '../state/arena.js';
import { S, ammo, blocks, cam, frenzy, jitter, mod, player, rng, rollMax, unlocked, world } from '../state/world.js';
import { clamp, rnd } from '../util.js';

export function update(dt) {
  S.time += dt;
  const playing = world.state === 'play';

  // flaques d'acide
  player.inAcid = false;
  for (const p of world.puddles) { p.t -= dt; if (!player.dead && Math.hypot(player.x - p.x, (player.y - p.y) * 1.6) < p.r) player.inAcid = true; }
  world.puddles = world.puddles.filter(p => p.t > 0);
  if (player.inAcid && !player.roll && playing) {
    player.acidT = (player.acidT || 0) - dt;
    if (player.acidT <= 0) { player.acidT = ACID_TICK; hurtPlayer(ACID_DAMAGE, true); }
    if (Math.random() < dt * 12) addPart({ t: 'smoke', x: player.x + rnd(8), y: player.y + rnd(3), z: 2, vx: rnd(10), vy: rnd(6), vz: 18, life: .5, max: .5, size: 3, color: 'rgba(182,224,74,' });
  } else player.acidT = Math.min(player.acidT || 0, ACID_TICK_RESET);
  updateGlobs(dt);

  // joueur
  if (player.rollCd > 0) { player.rollCd -= dt; if (player.rollCd <= 0) { player.rollCharges = Math.min(rollMax(), player.rollCharges + 1); player.rollReady = .3; if (player.rollCharges < rollMax()) player.rollCd = ROLL.CD; } }
  player.rollReady -= dt;
  if (playing && !player.dead && player.roll) updateRoll(dt);
  else if (playing && !player.dead) {
    let [mx, my] = moveInput();
    let ax = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
    let ay = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);
    if (aim.id !== null && Math.hypot(aim.x, aim.y) > .3) { ax = aim.x; ay = aim.y; }
    if (pad.on && (pad.ax || pad.ay)) { ax = pad.ax; ay = pad.ay; }
    const al = Math.hypot(ax, ay), aiming = al > .3;
    if (aiming) { player.fx = ax / al; player.fy = ay / al; }
    let l = Math.hypot(mx, my);
    player.moving = l > .2;
    player.strafe = aiming || !!(keys.ShiftLeft || keys.ShiftRight);
    if (player.moving) {
      if (!player.strafe) {
        const a = Math.round(Math.atan2(my, mx) / (Math.PI / 4)) * (Math.PI / 4);
        player.fx = Math.round(Math.cos(a) * 1000) / 1000; player.fy = Math.round(Math.sin(a) * 1000) / 1000;
      }
      if (l > 1) { mx /= l; my /= l; l = 1; }
      const v = PLAYER_SPEED * (frenzy() ? FRENZY_SPEED_MUL : 1) * (player.inAcid ? ACID_SPEED_MUL : 1);
      moveCircle(player, mx * v * dt, 0); moveCircle(player, 0, my * v * dt);
      player.walk += dt * 14;
    }
    player.cd -= dt;
    if ((aiming || mouseFire || pad.fire) && player.cd <= 0) fireWeapon();
    if (!mod('sansarmure') && S.time - player.lastHurt > REGEN_DELAY && player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + REGEN_RATE * dt);
  }
  player.flash -= dt; player.hurtT -= dt; player.muzzle -= dt; player.invuln -= dt;
  if (playing && !player.dead && frenzy() && Math.random() < dt * 14) addPart({ t: 'spark', x: player.x + rnd(10), y: player.y + rnd(4), z: 8 + Math.random() * 22, vx: rnd(20), vy: rnd(20), vz: 50, life: .35, size: 1.8, color: '#f2c230' });
  if (player.dead && playing) { S.overT -= dt; if (S.overT <= 0) gameOver(); }

  if (playing) {
    // vagues
    if (!S.waveActive) {
      if (S.pickT > 0) { S.pickT -= dt; if (S.pickT <= 0) openPick(); }
      else { S.breakT -= dt; if (S.breakT <= 0) startWave(); }
    }
    else {
      S.spawnT -= dt;
      if (S.queue.length && S.spawnT <= 0 && world.enemies.length < MAX_ENEMIES) {
        const burst = Waves.spawnBurst(S.wave);
        for (let k = 0; k < burst && S.queue.length; k++) spawnEnemy(S.queue.pop());
        S.spawnT = Waves.spawnGap(S.wave);
      }
      if (!S.queue.length && world.enemies.length === 0) {
        S.waveActive = false; S.breakT = WAVE_BREAK; S.pickT = PICK_DELAY;
        const bonus = WAVE_BONUS * S.wave; addScore(bonus);
        banner('Vague terminée', 'Bonus +', 'end', bonus);
      }
    }
    // combo
    if (S.combo) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
    // caisses de ravitaillement
    S.boxT -= dt;
    if (S.boxT <= 0) {
      S.boxT = BOX_PERIOD_MIN + rng() * BOX_PERIOD_RAND;
      if (world.pickups.length < MAX_PICKUPS) {
        for (let tries = 0; tries < 40; tries++) {
          const tx = 2 + rng() * (MW - 4) | 0, ty = 2 + rng() * (MH - 4) | 0;
          const x = tx * T + T / 2, y = ty * T + T / 2;
          if (!openT(tx, ty) || Math.hypot(x - player.x, y - player.y) < BOX_MIN_DIST || dist[ty * MW + tx] > 1e8) continue;
          world.pickups.push({ x, y, kind: rng() < BOX_HP_CHANCE ? 'hp' : 'ammo', ph: Math.random() * 6 });
          break;
        }
      }
    }
    if (Math.random() < dt * .4 && world.enemies.length) sfx('groan');
  }

  // champ de distances
  S.fieldT -= dt;
  if (world.fieldDirty || S.fieldT <= 0) { computeField(); world.fieldDirty = false; S.fieldT = FIELD_PERIOD; }

  // ennemis
  for (const e of world.enemies) {
    if (e.dead) continue;
    e.flash -= dt; e.atk -= dt; e.bump = -1;
    if (!passable(Math.floor(e.x / T), Math.floor(e.y / T))) unstick(e);
    const dxp = player.x - e.x, dyp = player.y - e.y, dp = Math.hypot(dxp, dyp) || 1;
    let tx = player.x, ty = player.y;
    if (dp > T * 1.3 || player.dead || !walkLine(e.x, e.y, player.x, player.y)) {
      const n = nextStep(e); if (n) { tx = n[0]; ty = n[1]; }
    }
    if (player.dead) { tx = e.x + Math.cos(e.walk) * 20; ty = e.y + Math.sin(e.walk * .7) * 20; }
    // cracheur : garde ses distances quand il voit le joueur, recule s'il est trop près
    let hold = false;
    if (e.type === 's' && !player.dead) {
      e.see = dp < SPITTER_SIGHT && los(e.x, e.y, player.x, player.y);
      if (e.see && dp < SPITTER_TOO_CLOSE) {
        const bx = e.x - dxp / dp * SPITTER_BACKOFF, by = e.y - dyp / dp * SPITTER_BACKOFF;
        if (walkLine(e.x, e.y, bx, by)) { tx = bx; ty = by; } else hold = true;
      } else if (e.see && dp < SPITTER_HOLD) hold = true;
      if (e.wind > 0) hold = true;
      if (hold) { const sw = Math.sin(S.time * 1.3 + e.x * .1); tx = e.x - dyp / dp * 20 * sw; ty = e.y + dxp / dp * 20 * sw; }
    }
    let vx = tx - e.x, vy = ty - e.y; const l = Math.hypot(vx, vy) || 1;
    const k = Math.min(1, dt * 6);
    const sp = e.fuse !== undefined ? e.sp * BLOATER_FUSE_SPEED : hold ? (e.wind > 0 ? 0 : e.sp * SPITTER_HOLD_SPEED) : e.sp;
    e.vx += (vx / l * sp - e.vx) * k; e.vy += (vy / l * sp - e.vy) * k;
    const fxT = hold ? dxp / dp : vx / l, fyT = hold ? dyp / dp : vy / l;
    const turn = Math.min(1, dt * (e.type === 'a' ? 2.4 : 8));
    e.fx += (fxT - e.fx) * turn; e.fy += (fyT - e.fy) * turn;
    const flung = e.knockT > 0; e.knockT = (e.knockT || 0) - dt;
    moveCircle(e, e.vx * dt, 0, flung); moveCircle(e, 0, e.vy * dt, flung);
    if (flung && isVoid(e.x, e.y)) { killEnemy(e, 0, 0, true); continue; }
    e.walk += dt * (e.type === 'd' ? 11 : e.type === 'b' ? 6 : e.type === 'r' ? 17 : e.type === 's' ? 7 : e.type === 'a' ? 7 : 8);
    e.shieldFlash -= dt;
    if (e.type === 'r' && Math.random() < dt * 6) dust(e.x - e.fx * 6, e.y - e.fy * 6, 1);
    if (e.type === 's' && playing && !player.dead) {
      e.spitCd -= dt;
      if (e.wind > 0) { e.wind -= dt; if (e.wind <= 0) spit(e); }
      else if (e.spitCd <= 0 && e.see && dp > SPITTER_MIN_RANGE) { e.wind = SPITTER_WINDUP; sfx('gurgle', 150); }
    }
    if (e.type === 'b') {
      if (e.fuse === undefined && !player.dead && playing && dp < e.r + player.r + 14 && walkLine(e.x, e.y, player.x, player.y)) { e.fuse = BLOATER_FUSE; sfx('fuse'); }
      if (e.fuse !== undefined) {
        e.fuse -= dt;
        if (e.fuse <= 0) { e.dead = true; gibs(e.x, e.y, 8, ['#c9b86a', '#8fd14f', '#7a4a6a']); world.bursts.push({ x: e.x, y: e.y, t: 0 }); continue; }
      }
      if (playing && Math.random() < dt * .15) sfx('gloop', 400);
    } else if (!player.dead && dp < e.r + player.r + 6 && e.atk <= 0 && playing) {
      hurtPlayer(ENEMY_MELEE_DAMAGE[e.type]); e.atk = ENEMY_ATTACK_CD[e.type];
      if (e.type === 'a' && !player.roll) { moveCircle(player, dxp / dp * ARMOR_SHOVE, 0); moveCircle(player, 0, dyp / dp * ARMOR_SHOVE); sfx('clang'); }
      e.vx += dxp / dp * 60; e.vy += dyp / dp * 60;
    }
    if (e.bump >= 0 && e.atk <= 0) {
      const b = blocks.get(e.bump);
      if (b) { damageBlock(b, ENEMY_BLOCK_DAMAGE[e.type]); e.atk = BLOCK_ATTACK_CD; if (b.kind === 'wall' && mod('barbeles')) hurtEnemy(e, BARBELES_DAMAGE * mod('barbeles'), 0, 0, 0); dust(b.tx * T + T / 2, b.ty * T + T / 2, 2); }
    }
    if (e.type === 'd' && playing && !player.dead) {
      e.fire -= dt;
      if (e.fire <= 0) {
        e.fire = DEVIL_FIRE_CD + rng() * DEVIL_FIRE_RAND;
        if (dp < DEVIL_RANGE && los(e.x, e.y, player.x, player.y)) {
          const a = Math.atan2(dyp, dxp) + jitter(DEVIL_SPREAD);
          world.projs.push({ x: e.x + Math.cos(a) * 12, y: e.y + Math.sin(a) * 12, vx: Math.cos(a) * FIREBALL_SPEED, vy: Math.sin(a) * FIREBALL_SPEED, life: FIREBALL_LIFE });
          sfx('fire', 80);
        }
      }
    }
  }
  // séparation
  for (let i = 0; i < world.enemies.length; i++) {
    const a = world.enemies[i]; if (a.dead) continue;
    for (let j = i + 1; j < world.enemies.length; j++) {
      const b = world.enemies[j]; if (b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r - 2, d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > .001) {
        const d = Math.sqrt(d2), o = (rr - d) / d * .5;
        moveCircle(a, -dx * o, -dy * o); moveCircle(b, dx * o, dy * o);
      }
    }
    if (!player.dead) {
      const dx = player.x - a.x, dy = player.y - a.y, rr = a.r + player.r, d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > .001) {
        const d = Math.sqrt(d2), o = (rr - d) / d;
        if (player.roll) moveCircle(a, -dx * o, -dy * o);
        else { moveCircle(a, -dx * o * .7, -dy * o * .7); moveCircle(player, dx * o * .3, dy * o * .3); }
      }
    }
  }
  world.enemies = world.enemies.filter(e => !e.dead);
  for (const f of world.fallers) f.t += dt;
  world.fallers = world.fallers.filter(f => f.t < .7);

  // boules de feu
  for (const p of world.projs) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (Math.random() < .6) addPart({ t: 'fire', x: p.x, y: p.y, z: 14, vx: rnd(20), vy: rnd(20), vz: 20, life: .25, max: .25, size: 4 });
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T), s = shotTile(tx, ty);
    if (s) { if (s === 2) damageBlock(blocks.get(ty * MW + tx), FIREBALL_BLOCK_DAMAGE); sparks(p.x, p.y, 5, '#ff8a3a'); p.life = 0; continue; }
    if (!player.dead && Math.hypot(p.x - player.x, p.y - player.y) < player.r + 6) { hurtPlayer(FIREBALL_DAMAGE); sparks(p.x, p.y, 6, '#ff8a3a'); p.life = 0; }
  }
  world.projs = world.projs.filter(p => p.life > 0);

  // grenades
  for (const g of world.grenades) {
    g.t -= dt; g.vz -= 700 * dt; g.z += g.vz * dt;
    if (g.z <= 0) { g.z = 0; if (g.vz < -60) { g.vz = -g.vz * .38; g.vx *= .65; g.vy *= .65; } else g.vz = 0; }
    if (g.z === 0) { const f = Math.pow(.15, dt); g.vx *= f; g.vy *= f; }
    const nx = g.x + g.vx * dt; if (shotTile(Math.floor(nx / T), Math.floor(g.y / T))) g.vx *= -.5; else g.x = nx;
    const ny = g.y + g.vy * dt; if (shotTile(Math.floor(g.x / T), Math.floor(ny / T))) g.vy *= -.5; else g.y = ny;
    if (g.z === 0 && isVoid(g.x, g.y)) { g.t = 0; g.fell = true; sfx('toss'); }
    if (g.t <= 0 && !g.fell) explosion(g.x, g.y, GRENADE_RADIUS, GRENADE_DAMAGE);
  }
  world.grenades = world.grenades.filter(g => g.t > 0);

  // roquettes
  for (const r of world.rockets) {
    r.life -= dt;
    const nx = r.x + r.vx * dt, ny = r.y + r.vy * dt;
    addPart({ t: 'smoke', x: r.x, y: r.y, z: 14, vx: rnd(15), vy: rnd(15), vz: 8, life: .5, max: .5, size: 4, color: 'rgba(200,196,188,' });
    let hit = shotTile(Math.floor(nx / T), Math.floor(ny / T)) !== 0;
    if (!hit) for (const e of world.enemies) if (Math.hypot(e.x - nx, e.y - ny) < e.r + 6) { hit = true; break; }
    if (hit || r.life <= 0) {
      const tx = Math.floor(nx / T), ty = Math.floor(ny / T);
      const b = blocks.get(ty * MW + tx); if (b && b.kind === 'barrel') explodeBarrel(b);
      explosion(r.x, r.y, ROCKET_RADIUS, ROCKET_DAMAGE); r.life = 0; continue;
    }
    r.x = nx; r.y = ny;
  }
  world.rockets = world.rockets.filter(r => r.life > 0);

  // barils en chaîne
  for (const p of world.pending) { p.t -= dt; if (p.t <= 0) explodeBarrel(p.b); }
  world.pending = world.pending.filter(p => p.t > 0);
  for (const b of world.bursts) { b.t -= dt; if (b.t <= 0) toxicBurst(b.x, b.y); }
  world.bursts = world.bursts.filter(b => b.t > 0);
  updateFires(dt);

  // ramassage
  if (!player.dead) for (const p of world.pickups) {
    if (mod('aimant')) {
      const ax = player.x - p.x, ay = player.y - p.y, d = Math.hypot(ax, ay);
      if (d < AIMANT_RANGE * mod('aimant') && d > 1) { const sp = Math.min(d, AIMANT_SPEED * dt); p.x += ax / d * sp; p.y += ay / d * sp; }
    }
    if (Math.hypot(p.x - player.x, p.y - player.y) < PICKUP_RADIUS) {
      p.taken = true; sfx('pickup');
      if (p.kind === 'hp') { player.hp = Math.min(player.maxHp, player.hp + MEDKIT_HP); pop(p.x, p.y - 30, `+${MEDKIT_HP} santé`, '#62c46e'); }
      else {
        const pool = W.map((w, i) => i).filter(i => i > 0 && unlocked[i]);
        if (!pool.length) { addScore(AMMO_NO_WEAPON_BONUS); pop(p.x, p.y - 30, `+${AMMO_NO_WEAPON_BONUS}`, '#ffffff'); }
        else {
          const picks = pool.sort(() => rng() - .5).slice(0, AMMO_REFILL_WEAPONS);
          for (const i of picks) ammo[i] += W[i].refill;
          pop(p.x, p.y - 30, picks.map(i => `+${W[i].refill} ${W[i].short}`).join(' · '), '#f2c230');
        }
      }
    }
  }
  world.pickups = world.pickups.filter(p => !p.taken);

  // blocs
  for (const b of blocks.values()) { b.flash -= dt; b.drop = Math.max(0, b.drop - dt * 6); if (b.turret && playing) updateTurret(b, dt); }

  // particules
  for (const p of world.parts) {
    p.life -= dt;
    if (p.t === 'smoke') { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.size += dt * 10; continue; }
    if (p.t === 'fire') { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= .92; p.vy *= .92; continue; }
    p.vz -= 520 * dt; p.z += p.vz * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.z <= 0) {
      p.z = 0;
      if (isVoid(p.x, p.y)) { p.life = 0; continue; }
      if (p.t === 'blood') { stampBlood(p.x, p.y, p.size * 1.3, .55); p.life = 0; }
      else if (p.t === 'gib' || p.t === 'casing') {
        if (p.t === 'gib') stampBlood(p.x, p.y, 2 + Math.random() * 2, .45);
        p.bounces++;
        if (p.bounces > 2 || p.vz > -50) {
          if (p.t === 'gib') { fctx.fillStyle = p.color; fctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * .7); }
          p.life = 0;
        } else { p.vz = -p.vz * .35; p.vx *= .5; p.vy *= .5; }
      } else p.life = 0;
    }
  }
  world.parts = world.parts.filter(p => p.life > 0);

  for (const t of world.tracers) t.t -= dt; world.tracers = world.tracers.filter(t => t.t > 0);
  for (const p of world.pops) { p.t -= dt * .9; p.y -= 26 * dt; } world.pops = world.pops.filter(p => p.t > 0);
  for (const b of world.booms) b.t += dt; world.booms = world.booms.filter(b => b.t < b.max);

  // caméra
  const lead = player.dead ? 0 : 34;
  cam.x += (player.x + player.fx * lead - cam.x) * Math.min(1, dt * 6);
  cam.y += (player.y + player.fy * lead - cam.y) * Math.min(1, dt * 6);
  const hw = VW / 2 / zoom, hh = VH / 2 / zoom;
  cam.x = MW * T < hw * 2 ? MW * T / 2 : clamp(cam.x, hw - 20, MW * T - hw + 20);
  cam.y = MH * T < hh * 2 ? MH * T / 2 : clamp(cam.y, hh - 60, MH * T - hh + 20);
  world.shake *= Math.pow(.004, dt);
}
