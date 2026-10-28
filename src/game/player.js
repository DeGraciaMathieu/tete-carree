// Déplacement du joueur et roulade (avec ses cartes : onde de choc, munitions, traînée de feu).
import { sfx } from '../audio/sfx.js';
import { FIRETRAIL_DAMAGE, FIRETRAIL_LIFE, FIRETRAIL_RADIUS, FIRETRAIL_TICK, ROLL, ROLLBOOM_DAMAGE, ROLLBOOM_DAMAGE_LVL, ROLLBOOM_RADIUS, ROLLBOOM_RADIUS_LVL, W } from '../config.js';
import { hurtEnemy, shockwave } from './combat.js';
import { pad, rumble } from '../input/gamepad.js';
import { keys } from '../input/keyboard.js';
import { stick } from '../input/touch.js';
import { addPart, dust, pop } from '../render/effects.js';
import { rollAmmo } from '../rules/modifiers.js';
import { circleTouchesVoid, moveCircle, unstick } from '../state/arena.js';
import { S, ammo, mod, player, rollMax, world } from '../state/world.js';
import { rnd } from '../util.js';

export function moveInput() {
  let mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  let my = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
  if (stick.id !== null && Math.hypot(stick.x, stick.y) > .2) { mx = stick.x; my = stick.y; }
  if (pad.on && (pad.mx || pad.my)) { mx = pad.mx; my = pad.my; }
  return [mx, my];
}
// simule la roulade en ignorant le vide : on ne saute par-dessus que si on retombe sur du sol ferme
function rollClears(dx, dy) {
  const o = { x: player.x, y: player.y, r: player.r }, h = 1 / 120;
  let t = 0, over = false;
  while (t < ROLL.D) {
    t += h;
    const v = t < ROLL.A ? 0 : t < ROLL.B ? ROLL.V * (1 - (t - ROLL.A) / (ROLL.B - ROLL.A) * .55) : 90 * (1 - (t - ROLL.B) / (ROLL.D - ROLL.B));
    if (v > 0) { moveCircle(o, dx * v * h, 0, true); moveCircle(o, 0, dy * v * h, true); }
    if (!over && circleTouchesVoid(o, 0)) over = true;
  }
  return over && !circleTouchesVoid(o, 4);
}
export function tryRoll() {
  if (world.state !== 'play' || player.dead || player.roll || player.rollCharges <= 0) return;
  let [mx, my] = moveInput(), l = Math.hypot(mx, my);
  if (l < .2) { mx = player.fx; my = player.fy; l = Math.hypot(mx, my) || 1; }
  const dx = mx / l, dy = my / l;
  const sgn = Math.abs(dx) > .2 ? Math.sign(dx) : (player.fx >= 0 ? 1 : -1);
  player.roll = { t: 0, dx, dy, sgn, dist: 0, trail: [], trailT: 0, fireT: 0, landed: false, started: false, fly: rollClears(dx, dy) };
  player.rollCharges--;
  player.moving = false;
}
function rollPerks() {
  const lb = mod('rollboom');
  if (lb) shockwave(player.x, player.y, ROLLBOOM_RADIUS + ROLLBOOM_RADIUS_LVL * lb, ROLLBOOM_DAMAGE + ROLLBOOM_DAMAGE_LVL * lb);
  const wi = player.weapon, w = W[wi], n = rollAmmo(S.mods, w.refill, ammo[wi]);
  if (n) { ammo[wi] += n; pop(player.x, player.y - 46, `+${n} ${w.short}`, '#f2c230'); }
}
export function updateRoll(dt) {
  const r = player.roll;
  r.t += dt;
  let v = 0;
  if (r.t >= ROLL.A && r.t < ROLL.B) {
    if (!r.started) { r.started = true; dust(player.x - r.dx * 6, player.y - r.dy * 6, 4); sfx('roll'); rollPerks(); rumble(0, .22, 60); }
    const q = (r.t - ROLL.A) / (ROLL.B - ROLL.A);
    v = ROLL.V * (1 - q * .55);
    r.trailT -= dt;
    if (r.trailT <= 0) {
      r.trailT = .022;
      r.trail.push({ x: player.x, y: player.y, h: Math.sin(q * Math.PI) * (r.fly ? 13 : 5) });
      if (r.trail.length > 5) r.trail.shift();
    }
    if (mod('firetrail')) {
      r.fireT -= dt;
      if (r.fireT <= 0) { r.fireT = .035; world.fires.push({ x: player.x, y: player.y, t: FIRETRAIL_LIFE, max: FIRETRAIL_LIFE, tick: 0 }); }
    }
  } else if (r.t >= ROLL.B) {
    if (!r.landed) { r.landed = true; dust(player.x, player.y, 6); sfx('land'); r.trail.length = 0; }
    v = 90 * (1 - (r.t - ROLL.B) / (ROLL.D - ROLL.B));
  }
  if (v > 0) {
    const ox = player.x, oy = player.y;
    moveCircle(player, r.dx * v * dt, 0, r.fly); moveCircle(player, 0, r.dy * v * dt, r.fly);
    r.dist += Math.hypot(player.x - ox, player.y - oy);
  }
  if (r.t >= ROLL.D && circleTouchesVoid(player, 0)) unstick(player);
  if (r.t >= ROLL.D) { player.roll = null; if (player.rollCd <= 0 && player.rollCharges < rollMax()) player.rollCd = ROLL.CD; }
}
export function updateFires(dt) {
  if (!world.fires.length) return;
  const dmg = FIRETRAIL_DAMAGE * Math.max(1, mod('firetrail'));
  for (const f of world.fires) {
    f.t -= dt; f.tick -= dt;
    if (f.tick <= 0) {
      f.tick = FIRETRAIL_TICK;
      for (const e of world.enemies) if (!e.dead && (e.x - f.x) ** 2 + (e.y - f.y) ** 2 < FIRETRAIL_RADIUS ** 2) hurtEnemy(e, dmg, 0, 0, 0);
    }
    if (Math.random() < dt * 5) addPart({ t: 'fire', x: f.x + rnd(6), y: f.y + rnd(4), z: 2, vx: rnd(10), vy: rnd(10), vz: 30 + Math.random() * 30, life: .4, max: .4, size: 3 + Math.random() * 2 });
  }
  world.fires = world.fires.filter(f => f.t > 0);
}
