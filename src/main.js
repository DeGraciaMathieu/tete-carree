// Point d'entrée : branchement initial et démarrage de la boucle.
import { startDemo } from './game/flow.js';
// Les modules d'entrée posent leurs écouteurs à l'import.
import './input/keyboard.js';
import './input/touch.js';
import { applyLang } from './input/buttons.js';
import './input/gamepad.js';
import { frame } from './loop/frame.js';
import { resize } from './render/canvas.js';
import { drawFace } from './render/hud.js';
import { $ } from './util.js';

addEventListener('resize', resize); resize();
startDemo(); applyLang();
drawFace($('mascot').getContext('2d'), 'ok');
requestAnimationFrame(frame);
