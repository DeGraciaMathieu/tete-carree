// Boucle requestAnimationFrame : entrées manette, simulation, HUD, rendu.
import { MAX_DT } from '../config.js';
import { pollPad } from '../input/gamepad.js';
import { update } from './update.js';
import { tickFps } from '../render/fps.js';
import { updateHud } from '../render/hud.js';
import { render } from '../render/scene.js';
import { S, world } from '../state/world.js';

let last = performance.now();
export function frame(now) {
  pollPad();
  tickFps(now - last, now);
  const dt = Math.min(MAX_DT, (now - last) / 1000); last = now;
  if (world.state === 'play') { update(dt); updateHud(); }
  else if (world.state === 'title' || world.state === 'over') { S.time += dt; }
  render();
  requestAnimationFrame(frame);
}
