// Enchaînement des écrans : titre, partie, pause, choix de carte, fin de partie.
import { audio, sfx } from '../audio/sfx.js';
import { CONSTITUTION_HP, RAR, STORAGE_BEST } from '../config.js';
import { pad } from '../input/gamepad.js';
import { releaseFire } from '../input/keyboard.js';
import { paintFloor } from '../render/floor.js';
import { banner, buildSlots, resetHud } from '../render/hud.js';
import { rollCards } from '../rules/cards.js';
import { S, mod, player, resetWorld, rng, rollMax, world } from '../state/world.js';
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
let pickChoices = [];
export function openPick() {
  pickChoices = rollCards(S.mods, rng);
  if (!pickChoices.length) return;
  world.state = 'pick'; releaseFire();
  $('pickWave').textContent = `Vague ${S.wave} terminée`;
  const box = $('cards'); box.innerHTML = '';
  pickChoices.forEach((m, i) => {
    const n = mod(m.id) + 1, b = document.createElement('button');
    b.className = 'mcard r-' + m.rar; b.style.animationDelay = (i * 80) + 'ms';
    const body = m.rar === 'p'
      ? `<span class="plus">+ ${m.plus(n)}</span><span class="minus">− ${m.minus(n)}</span>`
      : `<span class="mdesc">${m.desc(n)}</span>`;
    b.innerHTML = `<span class="mtop"><span class="rar">${RAR[m.rar].name}</span><span class="mkey only-desk">${i + 1}</span></span><span class="mname">${m.name}</span>${body}<span class="mlvl">${m.max > 1 ? `Niveau ${n} sur ${m.max}` : 'Unique'}</span>`;
    b.addEventListener('click', () => choosePick(i));
    b.addEventListener('pointerenter', () => { pickFocus = i; });
    box.appendChild(b);
  });
  $('pickScreen').hidden = false;
  pickFocus = 0; if (pad.on) focusCard(0);
  sfx('pickup');
}
export function choosePick(i) {
  const m = pickChoices[i];
  if (!m || world.state !== 'pick') return;
  S.mods[m.id] = mod(m.id) + 1;
  if (m.id === 'constitution') { player.maxHp += CONSTITUTION_HP; player.hp = Math.min(player.maxHp, player.hp + CONSTITUTION_HP); }
  if (m.id === 'double') player.rollCharges = Math.min(rollMax(), player.rollCharges + 1);
  $('pickScreen').hidden = true; world.state = 'play'; sfx('unlock');
  banner(m.name, m.rar === 'p' ? 'Pacte scellé' : mod(m.id) > 1 ? `Niveau ${mod(m.id)}` : 'Carte obtenue');
}
export let pickFocus = 0;
export function focusCard(i) {
  const cards = $('cards').children; if (!cards.length) return;
  pickFocus = clamp(i, 0, cards.length - 1);
  for (let k = 0; k < cards.length; k++) cards[k].classList.toggle('focus', k === pickFocus);
  try { cards[pickFocus].focus({ preventScroll: false }); } catch (e) {}
}
