// Boutons des écrans et des réglages.
import { showMute } from '../audio/sfx.js';
import { pause, resume, startGame } from '../game/flow.js';
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
$('pauseBtn').addEventListener('click', () => { if (world.state === 'play') pause(); });
for (const b of document.querySelectorAll('.optFps')) b.addEventListener('click', () => setFps(!fpsOn));
for (const b of document.querySelectorAll('.optOl')) b.addEventListener('click', () => setOutline(!outlineOn));

// Langue : réécrit l'accueil et les réglages ; le HUD et les cartes se construisent ensuite dans la langue courante.
export function applyLang() {
  translatePage(); buildArsenal(); buildCardsPanel(); renderRuns();
  setFps(fpsOn); setOutline(outlineOn); showMute();
}
for (const b of document.querySelectorAll('.optLang')) b.addEventListener('click', () => { setLang(lang === 'fr' ? 'en' : 'fr'); applyLang(); });
for (const b of document.querySelectorAll('.tflag')) b.addEventListener('click', () => { setLang(b.dataset.lang); applyLang(); });

// Écran titre : les liens du bas ouvrent un volet (commandes, bestiaire, arsenal, options) à la place du titre.
export function openPanel(id) {
  for (const p of document.querySelectorAll('.tpanel')) p.hidden = p.id !== id;
  $('titleMain').hidden = !!id;
}
for (const b of document.querySelectorAll('[data-panel]')) b.addEventListener('click', () => openPanel(b.dataset.panel));
for (const b of document.querySelectorAll('.tclose')) b.addEventListener('click', () => openPanel(''));
