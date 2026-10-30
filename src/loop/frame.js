// Boucle requestAnimationFrame : entrées manette, simulation, HUD, rendu.
import { MAX_DT } from '../config.js';
import { demoOver } from '../game/demo.js';
import { startDemo } from '../game/flow.js';
import { pollPad } from '../input/gamepad.js';
import { update } from './update.js';
import { drawArsenal } from '../render/arsenal.js';
import { drawBestiary } from '../render/bestiary.js';
import { tickFps } from '../render/fps.js';
import { updateHud } from '../render/hud.js';
import { drawArenaMap } from '../render/minimap.js';
import { render } from '../render/scene.js';
import { S, world } from '../state/world.js';

let last = performance.now();
export function frame(now) {
  pollPad();
  tickFps(now - last, now);
  const dt = Math.min(MAX_DT, (now - last) / 1000); last = now;
  if (world.state === 'play') { update(dt); updateHud(); }
  else if (world.demo) { update(dt); if (demoOver()) startDemo(); drawArenaMap(); drawBestiary(dt); drawArsenal(); }
  else if (world.state === 'title' || world.state === 'over' || world.state === 'win') { S.time += dt; }
  render();
  requestAnimationFrame(frame);
}
