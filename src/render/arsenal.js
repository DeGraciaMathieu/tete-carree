// Volet Arsenal de l'écran titre : une ligne par arme, dans l'ordre de leurs touches, avec son dessin en gros plan.
import {
  BARREL_DAMAGE, BARREL_RADIUS, GRENADE_DAMAGE, GRENADE_RADIUS, ROCKET_DAMAGE, ROCKET_RADIUS, SHOTS, TURRET_DAMAGE,
  TURRET_RANGE, W, WALL_HP,
} from '../config.js';
import { tr } from '../i18n/index.js';
import { drawOn, outlined } from './canvas.js';
import { drawBlock } from './scene.js';
import { drawGun } from './sprites.js';
import { $, fmt } from '../util.js';

const panel = $('panelArsenal');
const ICON_W = 96, ICON_H = 56, PAD = 6, MAX_SCALE = 4.5;
// Emprise de chaque dessin dans son repère (x0, y0, x1, y1), pour le centrer et l'agrandir dans sa vignette.
const BOUNDS = {
  pistol: [-1, -2, 8, 4.5], uzi: [-2, -2, 12, 6.5], rifle: [-6, -2, 17, 6.5], shotgun: [-7, -2, 18, 2.5],
  rocket: [-8, -5.5, 16, 6], rail: [-4, -3, 18, 3], grenade: [-1.2, -4.5, 5.2, 3.2], wall: [0, -20, 32, 32], barrel: [7, -4, 25, 23],
};
// barricade à tourelle et baril posés sur la case (0, 0), comme en jeu
const BLOCKS = {
  wall: { kind: 'wall', tx: 0, ty: 0, flash: 0, drop: 0, hp: 1, max: 1, turret: { ang: -.4, flash: 0 } },
  barrel: { kind: 'barrel', tx: 0, ty: 0, flash: 0, drop: 0, hp: 1, max: 1 },
};
const same = c => c;

function statsOf(w) {
  const refill = w.refill ? tr.armRefill(w.refill) : tr.armInfinite, shot = SHOTS[w.id];
  switch (w.id) {
    case 'shotgun': return [tr.armPellets(shot.pellets, shot.damage), tr.armRate(rate(w)), tr.armRange(shot.speed), refill];
    case 'wall': return [tr.armWall(WALL_HP), tr.armTurret(TURRET_DAMAGE), tr.armRange(TURRET_RANGE), refill];
    case 'barrel': return [tr.armBlast(BARREL_DAMAGE), tr.armRadius(BARREL_RADIUS), refill];
    case 'grenade': return [tr.armBlast(GRENADE_DAMAGE), tr.armRadius(GRENADE_RADIUS), refill];
    case 'rocket': return [tr.armBlast(ROCKET_DAMAGE), tr.armRadius(ROCKET_RADIUS), refill];
    case 'rail': return [tr.armDmg(shot.damage), tr.armPierce, tr.armRange(shot.speed), refill];
    default: return [tr.armDmg(shot.damage), tr.armRate(rate(w)), tr.armRange(shot.speed), refill];
  }
}
// tirs par seconde, sans les cartes, arrondis au dixième
const rate = w => Math.round(10 / w.cd) / 10;

export function buildArsenal() {
  $('arsenalList').innerHTML = W.map((w, i) => {
    const t = tr.weapons[w.id];
    return `<li><span class="akey">${i + 1}</span><canvas class="aicon" aria-hidden="true"></canvas>`
      + `<div class="aname"><h3>${t.name}</h3><span class="aunlock${w.unlock ? '' : ' start'}">${w.unlock ? tr.unlockAt(fmt(w.unlock)) : tr.starter}</span></div>`
      + `<p>${t.role()} <span class="atip">${t.tip}</span></p>`
      + `<div class="astats">${statsOf(w).map(s => `<span>${s}</span>`).join('')}</div></li>`;
  }).join('');
}
// Les dessins sont fixes : une vignette n'est repeinte que quand sa taille change (volet ouvert, langue, zoom).
export function drawArsenal() {
  if (panel.hidden) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), cvs = $('arsenalList').querySelectorAll('canvas');
  for (let i = 0; i < cvs.length; i++) {
    const cv = cvs[i], cw = Math.round(cv.clientWidth * dpr);
    if (!cw || cv.width === cw) continue;
    cv.width = cw; cv.height = Math.round(cv.clientHeight * dpr);
    const id = W[i].id, [x0, y0, x1, y1] = BOUNDS[id], k = cw / ICON_W;
    const s = Math.min((ICON_W - 2 * PAD) / (x1 - x0), (ICON_H - 2 * PAD) / (y1 - y0), MAX_SCALE);
    const g = cv.getContext('2d');
    g.setTransform(k * s, 0, 0, k * s, k * (ICON_W / 2 - (x0 + x1) / 2 * s), k * (ICON_H / 2 - (y0 + y1) / 2 * s));
    if (BLOCKS[id]) drawOn(g, () => drawBlock(BLOCKS[id]));
    else drawOn(g, () => outlined(null, () => drawGun(id, same)));
  }
}
