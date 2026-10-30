// Boîte de dialogue du mode Histoire : portrait, nom, réplique qui s'écrit lettre par lettre.
// Tête Carrée a le visage du HUD (humeur selon sa vie), le Dev une flèche de souris en pixels.
import { tr } from '../i18n/index.js';
import { drawFace, heroMood } from './hud.js';
import { $ } from '../util.js';

const CHAR_MS = 32; // vitesse d'écriture d'une réplique (réglage d'affichage)
const box = $('talkBox'), faceCtx = $('talkFace').getContext('2d'), nameEl = $('talkName'), textEl = $('talkText'), fullEl = $('talkFull');
let timer = 0, full = '', shown = 0;

// Flèche de souris sur la grille 13 × 13 du portrait : X contour, O blanc.
const ARROW = ['X', 'XX', 'XOX', 'XOOX', 'XOOOX', 'XOOOOX', 'XOOOOOX', 'XOOOXXXX', 'XOXOX', 'XX XOX', 'X  XOX', '    XX'];
function drawDevFace(c) {
  c.clearRect(0, 0, 13, 13);
  c.fillStyle = '#1b1b2a'; c.fillRect(0, 0, 13, 13);
  ARROW.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === ' ') return;
    c.fillStyle = ch === 'X' ? '#0f1012' : '#ffffff'; c.fillRect(x + 3, y, 1, 1);
  }));
}
function typeNext() {
  shown++; textEl.textContent = full.slice(0, shown); textEl.scrollTop = textEl.scrollHeight;
  if (shown >= full.length) { clearInterval(timer); timer = 0; }
}
export function showLine(who, text) {
  box.classList.toggle('dev', who === 'dev');
  if (who === 'dev') drawDevFace(faceCtx); else drawFace(faceCtx, heroMood());
  nameEl.textContent = tr.speakers[who];
  full = text; shown = 0; fullEl.textContent = text; textEl.textContent = '';
  clearInterval(timer); timer = 0;
  box.hidden = false; document.body.classList.add('talking');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { shown = full.length; textEl.textContent = full; }
  else timer = setInterval(typeNext, CHAR_MS);
}
export function lineDone() { return shown >= full.length; }
export function completeLine() { clearInterval(timer); timer = 0; shown = full.length; textEl.textContent = full; }
export function closeTalk() { clearInterval(timer); timer = 0; box.hidden = true; document.body.classList.remove('talking'); }
