// Effets visuels éphémères : particules, sang, débris, étincelles, poussière, textes flottants, douilles.
import { MAX_PARTS } from '../config.js';
import { aimMuzzle } from './sprites.js';
import { player, world } from '../state/world.js';
import { rnd } from '../util.js';

export function addPart(p) { if (world.parts.length < MAX_PARTS) world.parts.push(p); }
export function blood(x, y, n, dx = 0, dy = 0, spd = 90) {
  for (let k = 0; k < n; k++) addPart({ t: 'blood', x, y, z: 14 + Math.random() * 8, vx: dx * spd + rnd(70), vy: dy * spd + rnd(70), vz: 40 + Math.random() * 120, life: 2, size: 1.5 + Math.random() * 2.2, color: '#9c1a16' });
}
export function gibs(x, y, n, colors) {
  for (let k = 0; k < n; k++) addPart({ t: 'gib', x, y, z: 16 + Math.random() * 10, vx: rnd(150), vy: rnd(150), vz: 120 + Math.random() * 160, life: 3, size: 3 + Math.random() * 3, color: colors[k % colors.length], bounces: 0 });
}
export function sparks(x, y, n, color = '#ffd36a') {
  for (let k = 0; k < n; k++) addPart({ t: 'spark', x, y, z: 14, vx: rnd(160), vy: rnd(160), vz: 60 + Math.random() * 100, life: .25 + Math.random() * .2, size: 1.6, color });
}
export function dust(x, y, n, color = 'rgba(180,176,166,') {
  for (let k = 0; k < n; k++) addPart({ t: 'smoke', x: x + rnd(10), y: y + rnd(10), z: 4 + Math.random() * 8, vx: rnd(40), vy: rnd(40), vz: 10 + Math.random() * 20, life: .7, max: .7, size: 5 + Math.random() * 5, color });
}
export function pop(x, y, text, color = '#f2c230', big = false) { world.pops.push({ x, y, text, color, t: 1, big }); }
// Douilles par arme : longueur, épaisseur, couleur, vitesse d'éjection
const CASINGS = {
  pistol: { len: 4, size: 2, color: '#e0b04a', sp: 90 },
  uzi: { len: 3.5, size: 2, color: '#d9a640', sp: 85 },
  rifle: { len: 6, size: 2, color: '#e0b04a', sp: 100 },
  shotgun: { len: 7, size: 3.5, color: '#c4362d', sp: 70 },
  rail: { len: 6, size: 4, color: '#78e6ff', sp: 60 },
};
// éjectée sur le côté de l'arme, en tournant ; elle disparaît après ses rebonds
export function casing(id) {
  const c = CASINGS[id];
  addPart({ t: 'casing', x: player.x, y: player.y, z: 16, vx: -player.fy * c.sp + rnd(20), vy: player.fx * c.sp * .6 + rnd(15), vz: 110 + Math.random() * 50, life: 2, max: 2, size: c.size, len: c.len, rot: Math.random() * 7, vr: (Math.random() < .5 ? -1 : 1) * (16 + Math.random() * 10), color: c.color, bounces: 0 });
}
// Bouche du canon : étincelles projetées vers l'avant et fumée qui s'échappe
export function muzzleFx(n, puffs, color = '#ffe7a0') {
  const m = aimMuzzle(), fx = player.fx, fy = player.fy;
  for (let k = 0; k < n; k++) {
    const s = 180 + Math.random() * 160;
    addPart({ t: 'spark', x: m.x, y: m.y, z: m.h, vx: fx * s + rnd(70), vy: fy * s * .5 + rnd(50), vz: rnd(60), life: .08 + Math.random() * .1, size: 1.4, color });
  }
  for (let k = 0; k < puffs; k++) addPart({ t: 'smoke', x: m.x, y: m.y, z: m.h, vx: fx * 18 + rnd(8), vy: fy * 9 + rnd(6), vz: 14 + Math.random() * 12, life: .6, max: .6, size: 3 + Math.random() * 3, color: 'rgba(205,205,198,' });
}
