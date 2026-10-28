// Enchaînement des écrans : titre, partie, pause, choix de carte, fin de partie.
import { audio, sfx } from '../audio/sfx.js';
import { CONSTITUTION_HP, RAR, STORAGE_BEST } from '../config.js';
import { pad } from '../input/gamepad.js';
import { releaseFire } from '../input/keyboard.js';
import { cardIcon } from '../render/cardIcons.js';
import { paintFloor } from '../render/floor.js';
import { banner, buildSlots, resetHud } from '../render/hud.js';
import { rollCards } from '../rules/cards.js';
import { S, comboTime, mod, player, resetWorld, rng, rollMax, world } from '../state/world.js';
import { $, clamp, fmt } from '../util.js';

export function newGame() {
  resetWorld();
  paintFloor();
  resetHud();
  buildSlots();
}
export function showBest() {
  const t = world.best ? `Record : ${fmt(world.best)} points` : '';
  $('bestTitle').textContent = t; $('bestOver').textContent = t;
}
export function startGame() {
  audio(); newGame(); world.state = 'play';
  $('titleScreen').hidden = true; $('overScreen').hidden = true; $('pauseScreen').hidden = true; $('hud').hidden = false;
}
export function pause() { world.state = 'pause'; $('pauseScreen').hidden = false; }
export function resume() { audio(); world.state = 'play'; $('pauseScreen').hidden = true; }
export function gameOver() {
  world.state = 'over';
  if (S.score > world.best) { world.best = S.score; try { localStorage.setItem(STORAGE_BEST, String(world.best)); } catch (e) {} }
  $('ovScore').textContent = fmt(S.score); $('ovWave').textContent = S.wave; $('ovCombo').textContent = S.bestCombo;
  $('overLine').textContent = `Tombé pendant la vague ${S.wave}, après ${S.kills} éliminations.`;
  showBest(); $('overScreen').hidden = false;
}
let pickChoices = [], pickTimers = [], pickLocked = false;
// Distribution : les cartes arrivent face cachée puis se retournent une à une, la Légendaire en dernier.
const DEAL_FIRST_MS = 350, DEAL_STEP_MS = 300, DEAL_LEGEND_MS = 250, DEAL_OUT_MS = 320;
function cardHtml(m, i) {
  const n = mod(m.id) + 1, corner = m.max > 1 ? n : '★';
  const body = m.rar === 'p'
    ? `<span class="plus">+ ${m.plus(n)}</span><span class="minus">− ${m.minus(n)}</span>`
    : `<span>${m.desc(n)}</span>`;
  const pips = Array.from({ length: m.max }, (_, k) => `<i class="${k < n ? 'on' : ''}${k === n - 1 ? ' new' : ''}"></i>`).join('');
  const lvl = m.max > 1 ? `Niveau ${n} sur ${m.max}` : 'Unique';
  return `<div class="mflip down"><button class="mcard r-${m.rar}" aria-label="${m.name}, ${RAR[m.rar].name}, ${lvl}">`
    + `<span class="mix tl">${corner}</span><span class="mix br">${corner}</span><span class="rar">${RAR[m.rar].name}</span>`
    + `<span class="mico">${cardIcon(m.id)}</span><span class="mname">${m.name}</span><span class="mbody">${body}</span><span class="mpips" title="${lvl}">${pips}</span>`
    + `</button><span class="mback"><span class="mlogo"></span></span></div><span class="mkey only-desk">${i + 1}</span>`;
}
function dealCards(slots) {
  const fast = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const order = pickChoices.map((m, i) => i).sort((a, b) => (pickChoices[a].rar === 'l') - (pickChoices[b].rar === 'l'));
  order.forEach((i, k) => {
    const legend = pickChoices[i].rar === 'l';
    pickTimers.push(setTimeout(() => {
      slots[i].firstChild.classList.remove('down');
      if (legend) slots[i].querySelector('.mcard').classList.add('flash');
    }, fast ? 0 : DEAL_FIRST_MS + k * DEAL_STEP_MS + (legend ? DEAL_LEGEND_MS : 0)));
  });
}
export function openPick() {
  pickChoices = rollCards(S.mods, rng);
  if (!pickChoices.length) return;
  world.state = 'pick'; releaseFire();
  pickTimers.forEach(clearTimeout); pickTimers = []; pickLocked = false;
  $('pickWave').textContent = `Vague ${S.wave} terminée`;
  const box = $('cards'); box.innerHTML = '';
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
  const m = pickChoices[i], slots = $('cards').children;
  // une carte encore face cachée ne se choisit pas
  if (!m || world.state !== 'pick' || pickLocked || slots[i].firstChild.classList.contains('down')) return;
  pickLocked = true;
  S.mods[m.id] = mod(m.id) + 1;
  if (m.id === 'constitution') { player.maxHp += CONSTITUTION_HP; player.hp = Math.min(player.maxHp, player.hp + CONSTITUTION_HP); }
  if (m.id === 'double') player.rollCharges = Math.min(rollMax(), player.rollCharges + 1);
  if (m.id === 'fievre') S.comboT = Math.min(S.comboT, comboTime());
  for (let k = 0; k < slots.length; k++) slots[k].classList.add(k === i ? 'chosen' : 'away');
  sfx('unlock');
  const sub = m.rar === 'p' ? 'Pacte scellé' : mod(m.id) > 1 ? `Niveau ${mod(m.id)}` : 'Carte obtenue';
  pickTimers.push(setTimeout(() => { $('pickScreen').hidden = true; world.state = 'play'; banner(m.name, sub); }, DEAL_OUT_MS));
}
export let pickFocus = 0;
export function focusCard(i) {
  const cards = $('cards').querySelectorAll('.mcard'); if (!cards.length) return;
  pickFocus = clamp(i, 0, cards.length - 1);
  for (let k = 0; k < cards.length; k++) cards[k].classList.toggle('focus', k === pickFocus);
  try { cards[pickFocus].focus({ preventScroll: false }); } catch (e) {}
}
