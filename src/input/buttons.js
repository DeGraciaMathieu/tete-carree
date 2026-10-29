// Boutons des écrans et des réglages.
import { showMute } from '../audio/sfx.js';
import { chooseArena, pause, resume, showArena, startGame } from '../game/flow.js';
import { lang, setLang } from '../i18n/index.js';
import { outlineOn, setOutline } from '../render/canvas.js';
import { fpsOn, setFps } from '../render/fps.js';
import { buildArsenal, buildCardsPanel, renderRuns, translatePage } from '../render/hud.js';
import { world } from '../state/world.js';
import { $ } from '../util.js';

$('playBtn').addEventListener('click', startGame);
$('againBtn').addEventListener('click', startGame);
$('resumeBtn').addEventListener('click', resume);
$('restartBtn').addEventListener('click', startGame);
$('arenaBtn').addEventListener('click', () => chooseArena(1));
$('pauseBtn').addEventListener('click', () => { if (world.state === 'play') pause(); });
for (const b of document.querySelectorAll('.optFps')) b.addEventListener('click', () => setFps(!fpsOn));
for (const b of document.querySelectorAll('.optOl')) b.addEventListener('click', () => setOutline(!outlineOn));

// Langue : réécrit l'accueil et les réglages ; le HUD et les cartes se construisent ensuite dans la langue courante.
export function applyLang() {
  translatePage(); buildArsenal(); buildCardsPanel(); renderRuns(); showArena();
  setFps(fpsOn); setOutline(outlineOn); showMute();
}
for (const b of document.querySelectorAll('.optLang')) b.addEventListener('click', () => { setLang(lang === 'fr' ? 'en' : 'fr'); applyLang(); });
for (const b of document.querySelectorAll('.tflag')) b.addEventListener('click', () => { setLang(b.dataset.lang); applyLang(); });

// Écran titre : les entrées du menu ouvrent un volet (commandes, bestiaire, arsenal, cartes, options) à la place de
// l'accueil ; le focus passe au bouton Fermer, puis revient à l'entrée qui l'a ouvert.
let opener = null;
export const panelOpen = () => $('titleScreen').classList.contains('panel');
export function openPanel(id) {
  for (const p of document.querySelectorAll('.tpanel')) p.hidden = p.id !== id;
  $('titleScreen').classList.toggle('panel', !!id);
  if (id) { opener = document.activeElement; $(id).querySelector('.tclose').focus(); }
  else if (opener) { opener.focus(); opener = null; }
}
// Flèches ou croix de la manette : entrée suivante ou précédente du menu, en boucle ; la première pression choisit Jouer.
export function moveMenu(d) {
  if (panelOpen()) return;
  const items = [...document.querySelectorAll('#titleMenu button')], i = items.indexOf(document.activeElement);
  items[i < 0 ? 0 : (i + d + items.length) % items.length].focus();
}
for (const b of document.querySelectorAll('[data-panel]')) b.addEventListener('click', () => openPanel(b.dataset.panel));
for (const b of document.querySelectorAll('.tclose')) b.addEventListener('click', () => openPanel(''));
