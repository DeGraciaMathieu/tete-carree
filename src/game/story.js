// Mode Histoire : lancement, ouverture et fin des chapitres, passage d'une arène à la suivante, victoire.
import { audio, silence } from '../audio/sfx.js';
import { FIRST_BREAK, STORAGE_STORY, TOP_RUNS } from '../config.js';
import { newGame } from './flow.js';
import { tr } from '../i18n/index.js';
import { closeTalk, completeLine, lineDone, showLine } from '../render/dialog.js';
import { paintFloor } from '../render/floor.js';
import { banner, renderRuns, renderWin, setWaveLabel } from '../render/hud.js';
import { waveBreak } from '../rules/modifiers.js';
import { rankStoryRun } from '../rules/records.js';
import { chapterArena, endsStory } from '../rules/story.js';
import { S, enterArena, world } from '../state/world.js';
import { $ } from '../util.js';

const FADE_MS = 420; // durée du fondu au noir entre deux chapitres (transition CSS de #fade)
const TALK_GUARD_MS = 250; // une scène ignore les entrées tout juste après son ouverture (tir maintenu, Entrée appuyée)

export function startStory() {
  audio(); world.mode = 'story'; newGame(chapterArena(0)); world.demo = false; silence(false);
  $('titleScreen').hidden = true; $('overScreen').hidden = true; $('pauseScreen').hidden = true; $('winScreen').hidden = true; $('hud').hidden = false;
  beginChapter(0);
}
// Scène de dialogue : une réplique à la fois, le monde figé ; `done` est appelé quand elle se ferme.
let scene = null, line = 0, sceneAt = 0, sceneDone = null;
function playScene(lines, done) {
  if (!lines || !lines.length) { done(); return; }
  scene = lines; line = 0; sceneDone = done; sceneAt = performance.now();
  world.state = 'talk'; showLine(lines[0][0], lines[0][1]);
}
function finishScene() { const done = sceneDone; scene = sceneDone = null; closeTalk(); done(); }
// Entrée, Espace, clic, toucher, A, Start : finit la réplique qui s'écrit, sinon passe à la suivante.
export function advanceScene() {
  if (!scene || performance.now() - sceneAt < TALK_GUARD_MS) return;
  if (!lineDone()) { completeLine(); return; }
  if (++line < scene.length) showLine(scene[line][0], scene[line][1]); else finishScene();
}
// Échap, B, bouton Passer : ferme toute la scène.
export function skipScene() { if (scene && performance.now() - sceneAt >= TALK_GUARD_MS) finishScene(); }
function chapterIntro(i, done) { playScene(tr.scenes[chapterArena(i)].intro, done); }
function chapterOutro(i, done) { playScene(tr.scenes[chapterArena(i)].outro, done); }

function beginChapter(i) {
  S.chapter = i; world.state = 'talk'; setWaveLabel();
  chapterIntro(i, () => {
    world.state = 'play';
    S.breakT = i ? waveBreak(S.mods) : FIRST_BREAK;
    banner(tr.chapterN(i + 1), tr.arenas[chapterArena(i)], 'start');
  });
}
// Appelé par loop/update.js quand la pause qui suit la dernière vague d'un chapitre est écoulée.
export function endChapter() {
  world.state = 'talk'; S.outroT = -1;
  chapterOutro(S.chapter, () => { if (endsStory(S.wave)) winStory(); else changeChapter(S.chapter + 1); });
}
// Fondu au noir ; au noir, la nouvelle arène remplace l'ancienne, puis le chapitre s'ouvre.
function changeChapter(i) {
  $('fade').classList.add('on');
  setTimeout(() => {
    enterArena(chapterArena(i)); paintFloor();
    $('fade').classList.remove('on');
    beginChapter(i);
  }, FADE_MS);
}
// Partie Histoire enregistrée, à la mort comme à la victoire.
export function recordStoryRun(won) {
  const run = { score: S.score, wave: S.wave, kills: S.kills, combo: S.bestCombo, mods: { ...S.mods }, t: Date.now(), chapter: S.chapter + 1, won, time: S.time };
  world.storyRuns = { last: run, top: rankStoryRun(world.storyRuns.top, run, TOP_RUNS) };
  try { localStorage.setItem(STORAGE_STORY, JSON.stringify(world.storyRuns)); } catch (e) {}
  renderRuns();
}
function winStory() {
  world.state = 'win';
  recordStoryRun(true);
  renderWin();
  $('winScreen').hidden = false;
}
