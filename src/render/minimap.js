// Mini-plan de l'arène sous le menu de l'écran titre : plan vu de dessus, joueur et horde de la démo en points.
import { MH, MW, T } from '../config.js';
import { doors, map } from '../state/arena.js';
import { player, world } from '../state/world.js';

const PX = 5; // pixels par case
const mapCv = document.getElementById('arenaMap');
const g = mapCv.getContext('2d');
mapCv.width = MW * PX; mapCv.height = MH * PX;
// le plan ne change qu'avec l'arène : peint une fois hors écran, recopié à chaque image
const plan = document.createElement('canvas');
plan.width = MW * PX; plan.height = MH * PX;
const pg = plan.getContext('2d');
const TILE_COLOR = ['#8d918a', '#596166', '#b98c55', '#0c0d0e']; // sol, mur, caisse, crevasse
let planArena = null;

function paintPlan() {
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    pg.fillStyle = TILE_COLOR[map[ty * MW + tx]];
    pg.fillRect(tx * PX, ty * PX, PX, PX);
  }
  pg.fillStyle = '#f2c230';
  for (let i = 0; i < doors.length; i++) pg.fillRect(doors[i][0] * PX, doors[i][1] * PX, PX, PX);
}
export function drawArenaMap() {
  if (planArena !== world.arena) { paintPlan(); planArena = world.arena; }
  g.drawImage(plan, 0, 0);
  g.fillStyle = '#d0352c';
  for (let i = 0; i < world.enemies.length; i++) {
    const e = world.enemies[i];
    if (!e.dead) g.fillRect(e.x / T * PX - 1.5, e.y / T * PX - 1.5, 3, 3);
  }
  if (!player.dead) { g.fillStyle = '#4fa3ff'; g.fillRect(player.x / T * PX - 2.5, player.y / T * PX - 2.5, 5, 5); }
}
