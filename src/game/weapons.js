// Tirs, armes, constructions posées (barricades, barils) et tourelles.
import { sfx } from '../audio/sfx.js';
import { BARREL_DAMAGE, BARREL_HP, BARREL_RADIUS, EMPTY_SWAP_CD, FRAG_DAMAGE, FRAG_KNOCK, FRAG_RANGE, GRENADE_FUSE, GRENADE_SPEED, GROSBARIL_RADIUS_MUL, MH, MW, PLACE_FAIL_CD, ROCKET_LIFE, ROCKET_SPEED, SHOTS, T, TURRET_CD, TURRET_DAMAGE, TURRET_EVERY, TURRET_FIRST_CD, TURRET_IDLE_CD, TURRET_KNOCK, TURRET_RANGE, TURRET_WALL_HP, W, WALL_HP } from '../config.js';
import { explosion, hurtEnemy } from './combat.js';
import { rumble } from '../input/gamepad.js';
import { casing, dust, gibs, muzzleFx, sparks } from '../render/effects.js';
import { GUNS } from '../render/sprites.js';
import { clearShot, doorSet, frontTile, map, moveCircle, shotTile } from '../state/arena.js';
import { S, ammo, blocks, cam, fireMul, jitter, mod, player, rng, unlocked, world } from '../state/world.js';
import { ammoCost, canSwitch, extraSpread, hoardMul, selfPush, shotDamageMul, shotKnockMul, specialMul, spreadMul, weaponCdMul } from '../rules/modifiers.js';
import { clamp } from '../util.js';

// pierce : nombre d'ennemis que le tir peut toucher (Infinity pour le railgun) ; bounce : rebonds restants
// pact : les pactes sur les dégâts des tirs s'appliquent (pas aux éclats de Fragmentation)
function shoot(ang, range, dmg, pierce, knock, look, bounce = 0, from = null, pact = true) {
  const dx = Math.cos(ang), dy = Math.sin(ang), ox = from ? from[0] : player.x, oy = from ? from[1] : player.y;
  let endT = range, hitB = null, wallHit = false, ptx = Math.floor(ox / T), pty = Math.floor(oy / T), htx = 0, hty = 0;
  for (let t = 4; t < range; t += 4) {
    const px = ox + dx * t, py = oy + dy * t, tx = Math.floor(px / T), ty = Math.floor(py / T);
    const s = shotTile(tx, ty);
    if (s) { endT = t; wallHit = true; htx = tx; hty = ty; if (s === 2) hitB = blocks.get(ty * MW + tx); break; }
    ptx = tx; pty = ty;
  }
  const hits = [];
  for (const e of world.enemies) {
    if (e.dead) continue;
    const ex = e.x - ox, ey = e.y - oy, tp = ex * dx + ey * dy;
    if (tp < -4 || tp > endT) continue;
    const perp = ex * ex + ey * ey - tp * tp, rr = e.r + 3;
    if (perp < rr * rr) hits.push([tp, e]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  if (hits.length >= pierce) { hits.length = pierce; endT = Math.max(0, hits[pierce - 1][0]); hitB = null; wallHit = false; }
  const wid = W[player.weapon].id, still = !player.moving, kmul = pact ? shotKnockMul(S.mods) : 1;
  for (let k = 0; k < hits.length; k++) {
    const e = hits[k][1], mul = pact ? shotDamageMul(S.mods, wid, Math.hypot(e.x - player.x, e.y - player.y), still, S.buffs) * hoardMul(S.mods, S.money) : 1;
    if (hurtEnemy(e, dmg * mul, dx, dy, knock * kmul, pierce === Infinity ? 'ap' : 'bullet') === 'blocked') {
      endT = Math.max(0, hits[k][0] - 8); hitB = null; wallHit = false; break;
    }
  }
  const ex = ox + dx * endT, ey = oy + dy * endT;
  if (hitB) {
    if (hitB.kind === 'barrel') explodeBarrel(hitB); else { hitB.flash = .06; sparks(ex, ey, 3); }
  } else if (wallHit) sparks(ex, ey, 3, '#e8e2cc');
  const tipL = GUNS[W[player.weapon].id] || 8;
  const gx = from ? ox : player.x + player.fx * (10 + tipL), gy = from ? oy : player.y + player.fy * (5 + tipL * .5);
  world.tracers.push({ x1: gx, y1: gy, x2: ex, y2: ey, t: look.t, max: look.t, w: look.w, c: look.c });
  if (wallHit && !hitB && bounce > 0 && range - endT > 30) {
    const rdx = htx !== ptx ? -dx : dx, rdy = hty !== pty ? -dy : dy;
    const back = Math.max(0, endT - 4);
    shoot(Math.atan2(rdy, rdx), range - endT, dmg, pierce, knock, look, bounce - 1, [ox + dx * back, oy + dy * back], pact);
  }
}
// Fragmentation : n éclats en étoile depuis le point d'explosion d'une grenade
export function fragments(x, y, n) {
  const a0 = rng() * Math.PI * 2;
  for (let k = 0; k < n; k++) shoot(a0 + k / n * Math.PI * 2, FRAG_RANGE, FRAG_DAMAGE, 1, FRAG_KNOCK, { t: .06, w: 1.2, c: '255,200,120' }, 0, [x, y], false);
}
function placeBlock(kind) {
  const [tx, ty] = frontTile();
  if (tx < 1 || ty < 1 || tx >= MW - 1 || ty >= MH - 1) return false;
  const i = ty * MW + tx;
  if (map[i] || blocks.has(i) || doorSet.has(i)) return false;
  const rx = tx * T, ry = ty * T;
  const overl = e => { const cx = clamp(e.x, rx, rx + T), cy = clamp(e.y, ry, ry + T); return (e.x - cx) ** 2 + (e.y - cy) ** 2 < e.r * e.r; };
  if (overl(player) || world.enemies.some(e => !e.dead && overl(e))) return false;
  const hp = kind === 'wall' ? WALL_HP * specialMul(S.mods) : BARREL_HP;
  const blk = { kind, i, tx, ty, hp, max: hp, flash: 0, drop: 1 };
  if (kind === 'wall') {
    S.wallCount++;
    if (mod('tourelle') && S.wallCount % TURRET_EVERY === 0) { blk.turret = { cd: TURRET_FIRST_CD, ang: Math.atan2(player.fy, player.fx), flash: 0 }; blk.hp = blk.max = TURRET_WALL_HP; }
  }
  blocks.set(i, blk);
  world.fieldDirty = true;
  dust(rx + T / 2, ry + T / 2, 6); sfx('thunk');
  return true;
}
export function damageBlock(b, dmg) {
  if (!blocks.has(b.i)) return;
  b.hp -= dmg; b.flash = .08;
  if (b.hp <= 0) {
    if (b.kind === 'barrel') { explodeBarrel(b); return; }
    blocks.delete(b.i); world.fieldDirty = true;
    const cx = b.tx * T + T / 2, cy = b.ty * T + T / 2;
    gibs(cx, cy, 8, ['#a9aea9', '#878c87', '#f2c230']); dust(cx, cy, 10); sfx('crumble');
  }
}
export function explodeBarrel(b) {
  if (!blocks.has(b.i)) return;
  blocks.delete(b.i); world.fieldDirty = true;
  explosion(b.tx * T + T / 2, b.ty * T + T / 2, BARREL_RADIUS * Math.pow(GROSBARIL_RADIUS_MUL, mod('grosbaril')), BARREL_DAMAGE, true);
}
// Recul ressenti : la caméra part à l'opposé de la visée (y écrasé par la vue 3/4), l'arme recule vers le héros
// Main lourde : recul une fois et demie plus fort.
function recoil(camKick, gunKick) {
  if (mod('lourde')) { camKick *= 1.5; gunKick *= 1.5; }
  cam.kvx -= player.fx * camKick; cam.kvy -= player.fy * camKick * .55; player.recoilV += gunKick;
}
export function fireWeapon() {
  const wi = player.weapon, w = W[wi];
  if (ammo[wi] <= 0) { sfx('click'); player.weapon = loadedWeapon(); player.cd = EMPTY_SWAP_CD; return; }
  const spread = extraSpread(S.mods, w.id), ang = Math.atan2(player.fy, player.fx) + (spread ? jitter(spread) : 0);
  let ok = true;
  switch (w.id) {
    case 'pistol':
      shoot(ang + jitter(SHOTS.pistol.spread), SHOTS.pistol.speed, SHOTS.pistol.damage, 1 + mod('perce'), SHOTS.pistol.knock, { t: .07, w: 1.6, c: '255,236,170' }, mod('ricochet'));
      player.muzzle = .05; recoil(80, 135); muzzleFx(3, 1); sfx('pistol'); casing('pistol'); rumble(0, .14, 35); break;
    case 'uzi':
      shoot(ang + jitter(SHOTS.uzi.spread * spreadMul(S.buffs, 'uzi')), SHOTS.uzi.speed, SHOTS.uzi.damage, 1 + mod('perce'), SHOTS.uzi.knock, { t: .05, w: 1.3, c: '255,226,150' }, mod('ricochet'));
      player.muzzle = .04; recoil(45, 90); muzzleFx(2, Math.random() < .3 ? 1 : 0); sfx('uzi'); casing('uzi'); rumble(0, .12, 30); break;
    case 'rifle':
      shoot(ang + jitter(SHOTS.rifle.spread), SHOTS.rifle.speed, SHOTS.rifle.damage, 1 + mod('perce'), SHOTS.rifle.knock, { t: .06, w: 1.5, c: '255,232,160' }, mod('ricochet'));
      player.muzzle = .05; recoil(90, 135); muzzleFx(3, 1); sfx('rifle'); casing('rifle'); rumble(0, .16, 40); break;
    case 'shotgun':
      for (let k = 0; k < SHOTS.shotgun.pellets; k++) shoot(ang + jitter(SHOTS.shotgun.spread * spreadMul(S.buffs, 'shotgun')), SHOTS.shotgun.speed + rng() * SHOTS.shotgun.speedRand, SHOTS.shotgun.damage, 1, SHOTS.shotgun.knock * (1 + mod('calibre')), { t: .08, w: 1.2, c: '255,214,140' }, mod('ricochet'));
      player.muzzle = .08; world.shake = Math.min(16, world.shake + 1.5); recoil(260, 270); muzzleFx(7, 3, '#ffc070'); sfx('shotgun'); player.shellT = .3; rumble(.35, .25, 90);
      moveCircle(player, -player.fx * 4, -player.fy * 4); break;
    case 'wall': ok = placeBlock('wall'); if (!ok) sfx('click'); break;
    case 'barrel': ok = placeBlock('barrel'); if (!ok) sfx('click'); break;
    case 'grenade':
      world.grenades.push({ x: player.x + player.fx * 10, y: player.y + player.fy * 10, z: 18, vx: player.fx * GRENADE_SPEED, vy: player.fy * GRENADE_SPEED, vz: 170, t: GRENADE_FUSE });
      sfx('toss'); break;
    case 'rocket':
      world.rockets.push({ x: player.x + player.fx * 16, y: player.y + player.fy * 16, vx: player.fx * ROCKET_SPEED, vy: player.fy * ROCKET_SPEED, life: ROCKET_LIFE });
      player.muzzle = .06; world.shake = Math.min(16, world.shake + 1); recoil(200, 225); muzzleFx(4, 4, '#ffc070'); sfx('launch'); rumble(.25, .2, 90); break;
    case 'rail':
      shoot(ang, SHOTS.rail.speed, SHOTS.rail.damage, Infinity, SHOTS.rail.knock, { t: .35, w: 4, c: '120,230,255' });
      player.muzzle = .1; world.shake = Math.min(16, world.shake + 2.5); recoil(340, 310); muzzleFx(6, 2, '#c8f6ff'); sfx('rail'); casing('rail'); rumble(.45, .35, 120); break;
  }
  const push = selfPush(S.mods, w.id);
  if (push) moveCircle(player, -player.fx * push, -player.fy * push);
  if (ok && ammo[wi] !== Infinity) ammo[wi] = Math.max(0, ammo[wi] - ammoCost(S.mods, w.id));
  player.cd = ok ? w.cd * fireMul() * weaponCdMul(S.mods, w.id) : PLACE_FAIL_CD;
}
// Arme vers laquelle revenir quand celle en main est vide : le pistolet, ou sous Mitraille la première arme chargée.
function loadedWeapon() {
  for (let i = 0; i < W.length; i++) if (unlocked[i] && ammo[i] > 0) return i;
  return player.weapon;
}
export function selectWeapon(i) {
  if (i < 0 || i >= W.length || !unlocked[i] || ammo[i] <= 0 || player.weapon === i || !canSwitch(S.special, i)) return;
  player.weapon = i; sfx('click');
}
export function cycleWeapon(dir) {
  for (let k = 1; k <= W.length; k++) {
    const i = (player.weapon + dir * k + W.length * 2) % W.length;
    if (unlocked[i] && ammo[i] > 0 && canSwitch(S.special, i)) { player.weapon = i; sfx('click'); return; }
  }
}
export function updateTurret(b, dt) {
  const tu = b.turret; tu.cd -= dt; tu.flash -= dt;
  if (tu.cd > 0) return;
  const cx = b.tx * T + T / 2, cy = b.ty * T + T / 2;
  let best = null, bd = TURRET_RANGE * TURRET_RANGE;
  for (const e of world.enemies) {
    if (e.dead) continue;
    const d = (e.x - cx) ** 2 + (e.y - cy) ** 2;
    if (d < bd && clearShot(cx, cy, e.x, e.y, b.i)) { bd = d; best = e; }
  }
  if (!best) { tu.cd = TURRET_IDLE_CD; return; }
  const d = Math.sqrt(bd) || 1, a = Math.atan2(best.y - cy, best.x - cx);
  tu.ang = a; tu.cd = TURRET_CD; tu.flash = .06;
  hurtEnemy(best, TURRET_DAMAGE, (best.x - cx) / d, (best.y - cy) / d, TURRET_KNOCK);
  const top = b.ty * T - 6;
  world.tracers.push({ x1: cx + Math.cos(a) * 16, y1: top + Math.sin(a) * .55 * 16 + 16, x2: best.x, y2: best.y, t: .06, max: .06, w: 1.4, c: '255,226,150' });
  sfx('uzi', 70);
}
