// Point d'entrée : branchement initial et démarrage de la boucle.
import { startDemo } from './game/flow.js';
// Les modules d'entrée posent leurs écouteurs à l'import.
import './input/keyboard.js';
import './input/touch.js';
import './input/buttons.js';
import './input/gamepad.js';
import { frame } from './loop/frame.js';
import { outlineOn, resize, setOutline } from './render/canvas.js';
import { fpsOn, setFps } from './render/fps.js';
import { buildArsenal, buildCardsPanel, drawFace, renderRuns } from './render/hud.js';
import { $ } from './util.js';

addEventListener('resize', resize); resize();
setOutline(outlineOn);
setFps(fpsOn);
startDemo(); renderRuns();
buildArsenal(); buildCardsPanel(); drawFace($('mascot').getContext('2d'), 'ok');
requestAnimationFrame(frame);
