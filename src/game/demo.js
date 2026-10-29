// Partie de démo derrière l'écran titre : pilote automatique du joueur et fin de la démo.
import { MH, MW, SHOTS, T, W } from '../config.js';
import { tryRoll } from './player.js';
import { selectWeapon } from './weapons.js';
import { los } from '../state/arena.js';
import { S, ammo, player, unlocked, world } from '../state/world.js';

export const DEMO_WAVES = 3;  // la démo repart après cette vague
export const DEMO_BREAK = 2;  // pause entre deux vagues de démo (s)
// Armes que la démo sait manier, de la préférée à la dernière : pas de construction ni d'explosif.
const GUNS = ['shotgun', 'rifle', 'uzi', 'pistol'].map(id => W.findIndex(w => w.id === id));
const FLEE = 170, DODGE = 30, CENTER_PULL = .45, CRATE_PULL = .6;

// Commandes produites à chaque image, à la place du clavier, de la manette et du tactile.
export const ctl = { mx: 0, my: 0, ax: 0, ay: 0 };

export function demoControl() {
  for (const i of GUNS) if (unlocked[i] && ammo[i] > 0) { selectWeapon(i); break; }
  const range = SHOTS[W[player.weapon].id].speed;
  // s'éloigner de la horde, revenir vers le centre, aller chercher une caisse proche
  let fx = 0, fy = 0, aim = null, ad = range, near = Infinity;
  for (const e of world.enemies) {
    if (e.dead) continue;
    const dx = player.x - e.x, dy = player.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (d < FLEE) { fx += dx / d * (1 - d / FLEE); fy += dy / d * (1 - d / FLEE); }
    if (d - e.r < near) near = d - e.r;
    if (d < ad && los(player.x, player.y, e.x, e.y)) { ad = d; aim = e; }
  }
  const cx = MW * T / 2 - player.x, cy = MH * T / 2 - player.y, cd = Math.hypot(cx, cy) || 1, pull = CENTER_PULL * Math.min(1, cd / 300);
  let mx = fx + cx / cd * pull, my = fy + cy / cd * pull;
  let crate = null, kd = 260;
  for (const p of world.pickups) { const d = Math.hypot(p.x - player.x, p.y - player.y); if (d < kd) { kd = d; crate = p; } }
  if (crate && near > 90) { mx += (crate.x - player.x) / kd * CRATE_PULL; my += (crate.y - player.y) / kd * CRATE_PULL; }
  const ml = Math.hypot(mx, my);
  ctl.mx = ml > .15 ? mx / ml : 0; ctl.my = ml > .15 ? my / ml : 0;
  ctl.ax = aim ? (aim.x - player.x) / ad : 0; ctl.ay = aim ? (aim.y - player.y) / ad : 0;
  // roulade pour se dégager quand un ennemi est au contact
  if (near < DODGE && fx * fx + fy * fy > .01) tryRoll(fx, fy);
}
// La démo s'achève à la mort du joueur (après la chute) ou à la fin de la vague DEMO_WAVES.
export function demoOver() { return player.dead ? S.overT <= 0 : !S.waveActive && S.wave >= DEMO_WAVES; }
