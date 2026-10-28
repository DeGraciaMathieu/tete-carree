// Boutons des écrans et des réglages.
import { pause, resume, startGame } from '../game/flow.js';
import { outlineOn, setOutline } from '../render/canvas.js';
import { fpsOn, setFps } from '../render/fps.js';
import { world } from '../state/world.js';
import { $ } from '../util.js';

$('playBtn').addEventListener('click', startGame);
$('againBtn').addEventListener('click', startGame);
$('resumeBtn').addEventListener('click', resume);
$('restartBtn').addEventListener('click', startGame);
$('pauseBtn').addEventListener('click', () => { if (world.state === 'play') pause(); });
$('fpsBtn').addEventListener('click', () => setFps(!fpsOn));
$('olBtn').addEventListener('click', () => setOutline(!outlineOn));
