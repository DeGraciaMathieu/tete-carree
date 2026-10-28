// Effets visuels éphémères : particules, sang, débris, étincelles, poussière, textes flottants, douilles.
import { MAX_PARTS } from '../config.js';
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
export function casing() {
  addPart({ t: 'casing', x: player.x, y: player.y, z: 16, vx: -player.fy * 60 + rnd(20), vy: player.fx * 60 + rnd(20), vz: 70 + Math.random() * 40, life: .9, max: .9, size: 2, color: '#d6a73c', bounces: 0 });
}
