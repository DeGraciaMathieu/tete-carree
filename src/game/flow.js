// Enchaînement des écrans : titre, partie, pause, choix de carte, fin de partie.
import { audio, sfx, silence } from '../audio/sfx.js';
import { ARENAS, CONSTITUTION_HP, DIABLE_HP, MITRAILLE_PISTOL_AMMO, STORAGE_ARENA, STORAGE_BEST, STORAGE_RUNS, TOP_RUNS, VERRE_HP, W } from '../config.js';
import { demoStart } from './demo.js';
import { recordStoryRun, startStory } from './story.js';
import { tr } from '../i18n/index.js';
import { pad } from '../input/gamepad.js';
import { releaseFire } from '../input/keyboard.js';
import { cardIcon } from '../render/cardIcons.js';
import { paintFloor } from '../render/floor.js';
import { banner, buildSlots, renderRuns, resetHud } from '../render/hud.js';
import { isPact, rollCards } from '../rules/cards.js';
import { takeAllCards, waveBreak } from '../rules/modifiers.js';
import { rankRun } from '../rules/records.js';
import { chapterArena } from '../rules/story.js';
import { S, ammo, comboTime, mod, player, resetWorld, rng, rollMax, unlocked, world } from '../state/world.js';
import { $, clamp, fmt } from '../util.js';

export function newGame(arenaId) {
  resetWorld(arenaId);
  paintFloor();
  resetHud();
  buildSlots();
}
// Partie de démo derrière l'écran titre : pilotée par game/demo.js, muette, sans record, relancée quand elle s'achève.
export function startDemo() { newGame(); demoStart(); world.demo = true; world.state = 'title'; silence(true); }
// Arène suivante (d = 1) ou précédente (d = -1) sur l'accueil : retenue, et la démo repart dessus pour la montrer.
export function chooseArena(d) {
  const i = ARENAS.indexOf(world.arena);
  world.arena = ARENAS[(i + d + ARENAS.length) % ARENAS.length];
  try { localStorage.setItem(STORAGE_ARENA, world.arena); } catch (e) {}
  showArena(); startDemo();
}
export function showArena() { $('arenaBtn').textContent = tr.arenaBtn(tr.arenas[world.arena]); }
export function startGame() {
  audio(); world.mode = 'arena'; newGame(); world.demo = false; silence(false); world.state = 'play';
  $('titleScreen').hidden = true; $('overScreen').hidden = true; $('pauseScreen').hidden = true; $('hud').hidden = false;
}
export function pause() { world.state = 'pause'; $('pauseScreen').hidden = false; }
export function resume() { audio(); world.state = 'play'; $('pauseScreen').hidden = true; }
// Rejouer et Recommencer relancent le mode de la partie en cours.
export function restart() { if (world.mode === 'story') startStory(); else startGame(); }
// Retour à l'accueil (tableau de fin du mode Histoire) : la démo repart en mode Arène.
export function toTitle() {
  world.mode = 'arena';
  $('winScreen').hidden = true; $('overScreen').hidden = true; $('pauseScreen').hidden = true; $('hud').hidden = true; $('titleScreen').hidden = false;
  startDemo(); $('storyBtn').focus();
}
export function gameOver() {
  world.state = 'over';
  $('ovScore').textContent = fmt(S.score); $('ovWave').textContent = S.wave; $('ovCombo').textContent = S.bestCombo;
  // mode Histoire : classement à part, le record et les meilleures parties du mode Arène ne bougent pas
  if (world.mode === 'story') {
    recordStoryRun(false);
    $('overLine').textContent = tr.overLineStory(S.chapter + 1, tr.arenas[chapterArena(S.chapter)], S.wave, S.kills);
    $('overScreen').hidden = false;
    return;
  }
  if (S.score > world.best) { world.best = S.score; try { localStorage.setItem(STORAGE_BEST, String(world.best)); } catch (e) {} }
  $('overLine').textContent = tr.overLineRun(S.wave, S.kills);
  const run = { score: S.score, wave: S.wave, kills: S.kills, combo: S.bestCombo, mods: { ...S.mods }, t: Date.now() };
  world.runs = { last: run, top: rankRun(world.runs.top, run, TOP_RUNS) };
  try { localStorage.setItem(STORAGE_RUNS, JSON.stringify(world.runs)); } catch (e) {}
  renderRuns(); $('overScreen').hidden = false;
}
let pickChoices = [], pickTimers = [], pickLocked = false, weaponChoices = null;
// Distribution : les cartes arrivent face cachée puis se retournent une à une, Légendaire et pacte majeur en dernier.
const DEAL_FIRST_MS = 350, DEAL_STEP_MS = 300, DEAL_LEGEND_MS = 250, DEAL_OUT_MS = 320;
function cardHtml(m, i) {
  const n = mod(m.id) + 1, corner = m.max > 1 ? n : '★', c = tr.cards[m.id], rar = tr.rar[m.rar];
  const body = isPact(m)
    ? `<span class="plus">+ ${c.plus(n)}</span><span class="minus">− ${c.minus(n)}</span>`
    : `<span>${c.desc(n)}</span>`;
  const pips = Array.from({ length: m.max }, (_, k) => `<i class="${k < n ? 'on' : ''}${k === n - 1 ? ' new' : ''}"></i>`).join('');
  const lvl = m.max > 1 ? tr.level(n, m.max) : tr.unique;
  return `<div class="mflip down"><button class="mcard r-${m.rar}" aria-label="${c.name}, ${rar}, ${lvl}">`
    + `<span class="mix tl">${corner}</span><span class="mix br">${corner}</span><span class="rar">${rar}</span>`
    + `<span class="mico">${cardIcon(m.id)}</span><span class="mname">${c.name}</span><span class="mbody">${body}</span><span class="mpips" title="${lvl}">${pips}</span>`
    + `</button><span class="mback"><span class="mlogo"></span></span></div><span class="mkey only-desk">${i + 1}</span>`;
}
function dealCards(slots) {
  const fast = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rare = m => m.rar === 'l' || m.rar === 'm';
  const order = pickChoices.map((m, i) => i).sort((a, b) => rare(pickChoices[a]) - rare(pickChoices[b]));
  order.forEach((i, k) => {
    const legend = rare(pickChoices[i]);
    pickTimers.push(setTimeout(() => {
      slots[i].firstChild.classList.remove('down');
      if (legend) slots[i].querySelector('.mcard').classList.add('flash');
    }, fast ? 0 : DEAL_FIRST_MS + k * DEAL_STEP_MS + (legend ? DEAL_LEGEND_MS : 0)));
  });
}
export function openPick() {
  // Pas de pause : le joueur gagne toutes les cartes proposées, tirées hors pactes
  const all = takeAllCards(S.mods);
  pickChoices = rollCards(S.mods, rng, S.legendNext, { wave: S.wave, noPacts: all, weapons: unlocked.filter(Boolean).length });
  if (!pickChoices.length) return;
  S.legendNext = false;
  world.state = 'pick'; releaseFire();
  pickTimers.forEach(clearTimeout); pickTimers = []; pickLocked = false;
  $('pickWave').textContent = tr.pickWave(S.wave);
  $('pickHint').textContent = all ? tr.pickHintAll : tr.pickHint;
  $('pickTitle').textContent = all ? tr.pickTitleAll(pickChoices.length) : tr.pickTitle;
  const box = $('cards'); box.innerHTML = ''; box.classList.remove('weapons');
  pickChoices.forEach((m, i) => {
    const slot = document.createElement('div');
    slot.className = 'mslot'; slot.style.animationDelay = (i * 80) + 'ms';
    slot.innerHTML = cardHtml(m, i);
    const b = slot.querySelector('.mcard');
    b.addEventListener('click', () => choosePick(i));
    b.addEventListener('pointerenter', () => { pickFocus = i; });
    box.appendChild(slot);
  });
  $('pickScreen').hidden = false;
  pickFocus = 0; if (pad.on) focusCard(0);
  dealCards(box.children);
  sfx('pickup');
}
export function choosePick(i) {
  if (weaponChoices) { chooseWeapon(i); return; }
  const m = pickChoices[i], slots = $('cards').children;
  // une carte encore face cachée ne se choisit pas
  if (!m || world.state !== 'pick' || pickLocked || slots[i].firstChild.classList.contains('down')) return;
  if (takeAllCards(S.mods)) { takeAll(slots); return; }
  pickLocked = true;
  applyCard(m);
  for (let k = 0; k < slots.length; k++) slots[k].classList.add(k === i ? 'chosen' : 'away');
  sfx('unlock');
  const sub = isPact(m) ? tr.pactSealed : mod(m.id) > 1 ? tr.levelN(mod(m.id)) : tr.cardGained;
  if (m.id === 'specialiste') { pickTimers.push(setTimeout(openWeaponPick, DEAL_OUT_MS)); return; }
  pickTimers.push(setTimeout(() => { $('pickScreen').hidden = true; world.state = 'play'; banner(tr.cards[m.id].name, sub); }, DEAL_OUT_MS));
}
// Spécialiste : le pacte pris, le joueur choisit parmi ses armes débloquées celle qu'il gardera. Pas de retour en arrière.
function openWeaponPick() {
  weaponChoices = W.map((w, i) => i).filter(i => unlocked[i]); pickLocked = false;
  $('pickWave').textContent = tr.weaponPickWave;
  $('pickTitle').textContent = tr.weaponPickTitle;
  $('pickHint').textContent = tr.weaponPickHint(weaponChoices.length);
  const box = $('cards'); box.innerHTML = ''; box.classList.add('weapons');
  weaponChoices.forEach((wi, k) => {
    const slot = document.createElement('div');
    slot.className = 'mslot'; slot.style.animationDelay = (k * 50) + 'ms';
    const now = ammo[wi] === Infinity ? tr.alreadyInfinite : tr.ammoToInfinite(ammo[wi]), name = tr.weapons[W[wi].id].name;
    slot.innerHTML = `<div class="mflip"><button class="mcard r-m wcard" aria-label="${name}"><span class="rar">${tr.weaponN(wi + 1)}</span>`
      + `<span class="mname">${name}</span><span class="mbody"><span>${now}</span></span></button></div><span class="mkey only-desk">${k + 1}</span>`;
    const b = slot.querySelector('.mcard');
    b.addEventListener('click', () => chooseWeapon(k));
    b.addEventListener('pointerenter', () => { pickFocus = k; });
    box.appendChild(slot);
  });
  pickFocus = 0; if (pad.on) focusCard(0);
  sfx('pickup');
}
function chooseWeapon(k) {
  const wi = weaponChoices[k], slots = $('cards').children;
  if (wi === undefined || world.state !== 'pick' || pickLocked) return;
  pickLocked = true; weaponChoices = null;
  S.special = wi; player.weapon = wi; ammo[wi] = Infinity;
  for (let j = 0; j < slots.length; j++) slots[j].classList.add(j === k ? 'chosen' : 'away');
  sfx('unlock');
  pickTimers.push(setTimeout(() => { $('pickScreen').hidden = true; world.state = 'play'; banner(tr.cards.specialiste.name, `${tr.pactSealed} · ${tr.weapons[W[wi].id].name}`); }, DEAL_OUT_MS));
}
// Pas de pause : toutes les cartes sont gagnées d'un coup, une fois toutes retournées.
function takeAll(slots) {
  for (let k = 0; k < slots.length; k++) if (slots[k].firstChild.classList.contains('down')) return;
  pickLocked = true;
  const won = pickChoices.slice();
  for (const m of won) applyCard(m);
  for (let k = 0; k < slots.length; k++) slots[k].classList.add('chosen');
  sfx('unlock');
  pickTimers.push(setTimeout(() => { $('pickScreen').hidden = true; world.state = 'play'; banner(won.length > 1 ? tr.cardsGained : tr.cards[won[0].id].name, won.map(m => tr.cards[m.id].short).join(' · ')); }, DEAL_OUT_MS));
}
// Effets d'une carte prise : niveau, et effet immédiat de certaines cartes.
function applyCard(m) {
  S.mods[m.id] = mod(m.id) + 1;
  if (m.id === 'constitution') { player.maxHp += CONSTITUTION_HP; player.hp = Math.min(player.maxHp, player.hp + CONSTITUTION_HP); }
  if (m.id === 'double') player.rollCharges = Math.min(rollMax(), player.rollCharges + 1);
  if (m.id === 'mitraille') ammo[0] = MITRAILLE_PISTOL_AMMO;
  if (m.id === 'entrave') { player.rollCharges = 0; player.rollCd = 0; }
  if (m.id === 'fievre') S.comboT = Math.min(S.comboT, comboTime());
  if (m.id === 'repit' || m.id === 'sanspause') S.breakT = Math.min(S.breakT, waveBreak(S.mods));
  if (m.id === 'diable') S.legendNext = true;
  // Marché du diable, Canon de verre : la vie max baisse, la vie suit sans tomber sous 1
  const lost = m.id === 'diable' ? DIABLE_HP : m.id === 'verre' ? VERRE_HP : 0;
  if (lost) { player.maxHp -= lost; player.hp = Math.max(1, Math.min(player.hp, player.maxHp)); }
  if (m.id === 'unevie') player.maxHp = player.hp = 1; // le premier coup, quel qu'il soit, est mortel
}
// Démo : une des cartes qu'on aurait proposées, prise au hasard, sans écran de choix.
export function demoPick() {
  const cards = rollCards(S.mods, rng, S.legendNext, { wave: S.wave, demo: true });
  S.legendNext = false;
  if (cards.length) applyCard(cards[rng() * cards.length | 0]);
}
export let pickFocus = 0;
export function focusCard(i) {
  const cards = $('cards').querySelectorAll('.mcard'); if (!cards.length) return;
  pickFocus = clamp(i, 0, cards.length - 1);
  for (let k = 0; k < cards.length; k++) cards[k].classList.toggle('focus', k === pickFocus);
  try { cards[pickFocus].focus({ preventScroll: false }); } catch (e) {}
}
