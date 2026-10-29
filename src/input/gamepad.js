// Manette : sondage à chaque image (getGamepads protégé), vibrations, navigation dans les cartes.
import { audio } from '../audio/sfx.js';
import { PAD_AIM_DEADZONE, PAD_MOVE_DEADZONE } from '../config.js';
import { chooseArena, choosePick, focusCard, pause, pickFocus, resume, startGame } from '../game/flow.js';
import { tryRoll } from '../game/player.js';
import { cycleWeapon } from '../game/weapons.js';
import { moveMenu, openPanel, panelOpen } from './buttons.js';
import { root } from './touch.js';
import { tr } from '../i18n/index.js';
import { S, world } from '../state/world.js';
import { $ } from '../util.js';

// disposition « standard » : 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 Select, 9 Start, 12-15 croix
export const pad = { on: false, mx: 0, my: 0, ax: 0, ay: 0, fire: false, prev: [], idx: -1, blocked: false };
let padFlick = 0, rumbleT = 0, toastT = 0;
function deadzone(x, y, d) {
  const l = Math.hypot(x, y);
  if (l < d) return [0, 0];
  const k = Math.min(1, (l - d) / (1 - d)) / l;
  return [x * k, y * k];
}
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200);
}
export function rumble(strong, weak, ms) {
  if (!pad.on || world.demo) return;
  const now = performance.now(); if (now < rumbleT) return; rumbleT = now + 40;
  try {
    const gp = navigator.getGamepads()[pad.idx], va = gp && gp.vibrationActuator;
    if (va && va.playEffect) va.playEffect('dual-rumble', { startDelay: 0, duration: ms, weakMagnitude: weak, strongMagnitude: strong }).catch(() => {});
  } catch (e) {}
}
export function pollPad() {
  let list;
  try { list = navigator.getGamepads ? navigator.getGamepads() : []; }
  catch (e) { if (!pad.blocked) { pad.blocked = true; const hint = $('padHint'); hint.dataset.i18n = 'padBlocked'; hint.textContent = tr.padBlocked; } return; }
  let gp = null;
  for (const g of list || []) if (g && g.connected && g.axes.length >= 2) { gp = g; break; }
  if (!gp) {
    if (pad.on) { pad.on = false; pad.mx = pad.my = pad.ax = pad.ay = 0; pad.fire = false; root.classList.remove('has-pad'); toast(tr.padOff); if (world.state === 'play') pause(); }
    return;
  }
  if (!pad.on) { pad.on = true; root.classList.add('has-pad'); toast(tr.padOn(gp.id.split('(')[0].trim())); audio(); }
  pad.idx = gp.index;
  const ax = gp.axes, btn = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > .5));
  const now = gp.buttons.map((_, i) => btn(i));
  [pad.mx, pad.my] = deadzone(ax[0] || 0, ax[1] || 0, PAD_MOVE_DEADZONE);
  [pad.ax, pad.ay] = ax.length >= 4 ? deadzone(ax[2] || 0, ax[3] || 0, PAD_AIM_DEADZONE) : [0, 0];
  pad.fire = !!(gp.buttons[7] && gp.buttons[7].value > .35);
  const prev = pad.prev, hit = i => now[i] && !prev[i];
  const fdir = Math.abs(ax[0] || 0) > .6 ? Math.sign(ax[0]) : Math.abs(ax[1] || 0) > .6 ? Math.sign(ax[1]) * 2 : 0;
  const flick = fdir && fdir !== padFlick ? fdir : 0; padFlick = fdir;
  pad.prev = now;
  if (world.state === 'title') {
    // volet ouvert : A ou B le referme ; sinon croix ou stick pour choisir, A pour valider, Start pour jouer
    if (panelOpen()) { if (hit(0) || hit(1)) openPanel(''); return; }
    if (hit(12) || flick === -2) moveMenu(-1);
    if (hit(13) || flick === 2) moveMenu(1);
    if (hit(14) || flick === -1) chooseArena(-1);
    if (hit(15) || flick === 1) chooseArena(1);
    const f = document.activeElement;
    if (hit(9) || (hit(0) && !(f && f.closest('#titleMenu')))) startGame();
    else if (hit(0)) f.click();
    return;
  }
  if (world.state === 'over') { if (hit(0) || hit(9)) startGame(); return; }
  if (world.state === 'pause') { if (hit(0) || hit(1) || hit(9)) resume(); return; }
  if (world.state === 'pick') {
    if (hit(14) || hit(12) || flick < 0) focusCard(pickFocus - 1);
    if (hit(15) || hit(13) || flick > 0) focusCard(pickFocus + 1);
    if (hit(0)) choosePick(pickFocus);
    return;
  }
  if (world.state !== 'play') return;
  if (hit(9)) { pause(); return; }
  if (hit(0) || hit(6)) tryRoll();
  if (hit(4) || hit(14)) cycleWeapon(-1);
  if (hit(5) || hit(15)) cycleWeapon(1);
  if (hit(3) && !S.waveActive && S.wave > 0 && S.pickT <= 0) S.breakT = 0;
}
addEventListener('gamepadconnected', () => pollPad());
addEventListener('gamepaddisconnected', () => pollPad());
