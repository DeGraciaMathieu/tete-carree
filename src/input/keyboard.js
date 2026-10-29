// Clavier et souris ; pause automatique sur perte de focus ou onglet masqué.
import { chooseArena, choosePick, pause, resume, startGame } from '../game/flow.js';
import { moveMenu, openPanel, panelOpen } from './buttons.js';
import { tryRoll } from '../game/player.js';
import { cycleWeapon, selectWeapon } from '../game/weapons.js';
import { cv } from '../render/canvas.js';
import { fpsOn, setFps } from '../render/fps.js';
import { S, world } from '../state/world.js';

export const keys = {};
export let mouseFire = false;
export function releaseFire() { mouseFire = false; }
const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
addEventListener('keydown', e => {
  if (PREVENT.has(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (world.state === 'title') {
    if (e.code === 'Escape') openPanel('');
    else if (e.code === 'ArrowUp' || e.code === 'ArrowDown') moveMenu(e.code === 'ArrowUp' ? -1 : 1);
    else if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && !panelOpen()) chooseArena(e.code === 'ArrowLeft' ? -1 : 1);
    // un bouton qui a le focus traite lui-même Entrée et Espace
    else if ((e.code === 'Enter' || e.code === 'Space') && !(e.target instanceof HTMLButtonElement)) startGame();
    return;
  }
  if (world.state === 'over' && e.code === 'Enter') { startGame(); return; }
  if (world.state === 'pick') { const m = /^(Digit|Numpad)([1-9])$/.exec(e.code); if (m) choosePick(+m[2] - 1); return; }
  if (e.code === 'KeyP' || e.code === 'Escape') { if (world.state === 'play') pause(); else if (world.state === 'pause') resume(); return; }
  if (e.code === 'KeyF') { setFps(!fpsOn); return; }
  if (world.state !== 'play') return;
  if (e.ctrlKey) e.preventDefault();
  if ((e.code === 'Space' || e.code === 'ControlLeft' || e.code === 'ControlRight') && !e.repeat) tryRoll();
  if (e.code === 'Enter' && !S.waveActive && S.wave > 0) S.breakT = 0;
  if (/^Digit[1-9]$/.test(e.code)) selectWeapon(+e.code.slice(5) - 1);
  if (/^Numpad[1-9]$/.test(e.code)) selectWeapon(+e.code.slice(6) - 1);
  if (e.code === 'KeyE') cycleWeapon(1);
  if (e.code === 'KeyQ') cycleWeapon(-1);
});
addEventListener('keyup', e => { keys[e.code] = false; });
let wheelT = 0;
addEventListener('wheel', e => {
  if (world.state !== 'play') return;
  const now = performance.now(); if (now - wheelT < 90) return; wheelT = now;
  cycleWeapon(e.deltaY > 0 ? 1 : -1);
}, { passive: true });
cv.addEventListener('mousedown', e => { if (e.button === 0) mouseFire = true; });
addEventListener('mouseup', () => { mouseFire = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseFire = false; if (world.state === 'play') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && world.state === 'play') pause(); });
