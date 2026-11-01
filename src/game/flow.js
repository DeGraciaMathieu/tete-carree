// Enchaînement des écrans : titre, partie, pause, choix de carte, Comptoir, fin de partie.
import { audio, sfx, silence } from '../audio/sfx.js';
import { ARENAS, BAN_COST, BUYBACK_COST, CONSTITUTION_HP, DIABLE_HP, EXTRA_CARD_COST, MITRAILLE_PISTOL_AMMO, STORAGE_ARENA, STORAGE_BEST, STORAGE_RUNS, TOP_RUNS, VERRE_HP, W } from '../config.js';
import { openShop } from './counter.js';
import { demoStart } from './demo.js';
import { tr } from '../i18n/index.js';
import { pad } from '../input/gamepad.js';
import { releaseFire } from '../input/keyboard.js';
import { cardIcon } from '../render/cardIcons.js';
import { paintFloor } from '../render/floor.js';
import { banner, buildSlots, renderRuns, resetHud } from '../render/hud.js';
import { isPact, rollCards } from '../rules/cards.js';
import { takeAllCards, waveBreak } from '../rules/modifiers.js';
import { rankRun } from '../rules/records.js';
import { buybackable, canBuyExtra, rerollCost, undoPact, withoutPact } from '../rules/shop.js';
import { S, ammo, comboTime, mod, player, resetWorld, rng, rollMax, unlocked, world } from '../state/world.js';
import { $, clamp, fmt } from '../util.js';

export function newGame() {
  resetWorld();
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
  audio(); newGame(); world.demo = false; silence(false); world.state = 'play';
  $('titleScreen').hidden = true; $('overScreen').hidden = true; $('pauseScreen').hidden = true; $('hud').hidden = false;
}
export function pause() { world.state = 'pause'; $('pauseScreen').hidden = false; }
export function resume() { audio(); world.state = 'play'; $('pauseScreen').hidden = true; }
export function gameOver() {
  world.state = 'over';
  if (S.score > world.best) { world.best = S.score; try { localStorage.setItem(STORAGE_BEST, String(world.best)); } catch (e) {} }
  $('ovScore').textContent = fmt(S.score); $('ovWave').textContent = S.wave; $('ovCombo').textContent = S.bestCombo;
  $('overLine').textContent = tr.overLineRun(S.wave, S.kills);
  const run = { score: S.score, wave: S.wave, kills: S.kills, combo: S.bestCombo, mods: { ...S.mods }, t: Date.now() };
  world.runs = { last: run, top: rankRun(world.runs.top, run, TOP_RUNS) };
  try { localStorage.setItem(STORAGE_RUNS, JSON.stringify(world.runs)); } catch (e) {}
  renderRuns(); $('overScreen').hidden = false;
}
let pickChoices = [], pickTimers = [], pickLocked = false, weaponChoices = null;
// Boutique de l'écran : relances payées, carte en plus achetée, mode bannissement, Légendaire promise (gardée à la relance).
let pickRerolls = 0, pickExtra = false, pickBanning = false, pickLegend = false;
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
  pickLegend = S.legendNext;
  pickChoices = rollCards(S.mods, rng, pickLegend, pickCtx());
  if (!pickChoices.length) return false;
  S.legendNext = false;
  world.state = 'pick'; releaseFire();
  pickTimers.forEach(clearTimeout); pickTimers = []; pickLocked = false;
  pickRerolls = 0; pickExtra = false; pickBanning = false; pactFocus = -1;
  $('pickWave').textContent = tr.pickWave(S.wave);
  $('pickTitle').textContent = all ? tr.pickTitleAll(pickChoices.length) : tr.pickTitle;
  $('shop').hidden = false;
  layHand(true);
  $('pickScreen').hidden = false;
  pickFocus = 0; if (pad.on) focusCard(0);
  sfx('pickup');
  return true;
}
// Contexte de tirage de l'écran en cours, complété par `more` (nombre de cartes, carte d'appoint…).
function pickCtx(more) {
  return { wave: S.wave, noPacts: takeAllCards(S.mods), weapons: unlocked.filter(Boolean).length, banned: S.banned, ...more };
}
// Pose les cartes de pickChoices : distribuées face cachée puis retournées (deal), ou posées face visible.
function layHand(deal) {
  const box = $('cards'); box.innerHTML = ''; box.classList.remove('weapons');
  box.classList.toggle('four', pickChoices.length > 3);
  pickChoices.forEach((m, i) => {
    const slot = document.createElement('div');
    slot.className = 'mslot'; slot.style.animationDelay = (deal ? i * 80 : 0) + 'ms';
    slot.innerHTML = cardHtml(m, i);
    const b = slot.querySelector('.mcard');
    b.addEventListener('click', () => choosePick(i));
    b.addEventListener('pointerenter', () => { pickFocus = i; });
    box.appendChild(slot);
  });
  if (deal) dealCards(box.children);
  else for (let k = 0; k < box.children.length; k++) box.children[k].firstChild.classList.remove('down');
  renderShop();
}
// La boutique n'agit que sur l'écran des cartes, toutes retournées, avant le choix.
function shopReady() {
  if (world.state !== 'pick' || pickLocked || weaponChoices) return false;
  const slots = $('cards').children;
  for (let k = 0; k < slots.length; k++) if (slots[k].firstChild.classList.contains('down')) return false;
  return true;
}
const coinPrice = n => `<i class="coinico" aria-hidden="true"></i>${n}`;
// Bourse, prix, boutons grisés, pactes rachetables et aide selon le mode.
function renderShop() {
  const all = takeAllCards(S.mods), reroll = rerollCost(pickRerolls);
  $('purseNum').textContent = S.money;
  $('rerollPrice').innerHTML = coinPrice(reroll);
  $('rerollBtn').disabled = pickBanning || S.money < reroll;
  $('extraPrice').innerHTML = coinPrice(EXTRA_CARD_COST);
  $('extraBtn').hidden = all;
  $('extraBtn').disabled = pickBanning || !canBuyExtra(S.mods, pickExtra) || S.money < EXTRA_CARD_COST;
  $('banPrice').innerHTML = coinPrice(BAN_COST);
  $('banLabel').textContent = pickBanning ? tr.banCancel : tr.ban;
  $('banBtn').disabled = !pickBanning && S.money < BAN_COST;
  $('banBtn').classList.toggle('on', pickBanning);
  $('cards').classList.toggle('banning', pickBanning);
  $('pickHint').textContent = pickBanning ? tr.banHint : all ? tr.pickHintAll : tr.pickHint;
  const pacts = buybackable(S.mods), off = pickBanning || S.money < BUYBACK_COST ? ' disabled' : '';
  $('buyback').innerHTML = pacts.length ? `<span class="label">${tr.buyback}</span>` + pacts.map(m =>
    `<button class="mchip r-p" data-id="${m.id}"${off}><b>${tr.cards[m.id].name}</b><span class="price">${coinPrice(BUYBACK_COST)}</span></button>`).join('') : '';
  if (pactFocus >= 0) focusPact(pactFocus);
}
export function rerollPick() {
  const cost = rerollCost(pickRerolls);
  if (!shopReady() || pickBanning || S.money < cost) return;
  const cards = rollCards(S.mods, rng, pickLegend, pickCtx({ count: pickChoices.length }));
  if (!cards.length) return;
  S.money -= cost; pickRerolls++; pickChoices = cards;
  if (takeAllCards(S.mods)) $('pickTitle').textContent = tr.pickTitleAll(pickChoices.length);
  sfx('toss');
  layHand(true);
  pickFocus = 0; if (pad.on && pactFocus < 0) focusCard(0);
}
// Carte d'appoint : hors de la table, sans Légendaire promise ni pacte majeur garanti.
const extraCard = () => rollCards(S.mods, rng, false, pickCtx({ free: true, count: 1, without: pickChoices.map(m => m.id) }))[0];
export function buyExtraCard() {
  if (!shopReady() || pickBanning || !canBuyExtra(S.mods, pickExtra) || S.money < EXTRA_CARD_COST) return;
  const m = extraCard();
  if (!m) return;
  S.money -= EXTRA_CARD_COST; pickExtra = true; pickChoices.push(m);
  if (takeAllCards(S.mods)) $('pickTitle').textContent = tr.pickTitleAll(pickChoices.length);
  sfx('pickup');
  layHand(false);
  if (pad.on && pactFocus < 0) focusCard(pickChoices.length - 1);
}
export function toggleBan() {
  if (!shopReady() || (!pickBanning && S.money < BAN_COST)) return;
  pickBanning = !pickBanning; sfx('click');
  renderShop();
}
export function cancelBan() { if (pickBanning) toggleBan(); }
// Carte bannie : remplacée par une carte d'appoint, jamais plus proposée. S'il n'y a plus rien à proposer, l'écran se ferme.
function banCard(i) {
  const m = pickChoices[i];
  if (!m || S.money < BAN_COST) return;
  S.money -= BAN_COST; S.banned.push(m.id); pickBanning = false;
  const r = extraCard();
  if (r) pickChoices[i] = r; else pickChoices.splice(i, 1);
  sfx('crumble');
  if (!pickChoices.length) { closePick(); return; }
  layHand(false);
  if (pad.on && pactFocus < 0) focusCard(Math.min(i, pickChoices.length - 1));
}
// Rachat d'un pacte ordinaire : il disparaît avec son avantage et sa contrepartie, et ne ressortira plus.
export function buybackPact(id) {
  if (!shopReady() || pickBanning || S.money < BUYBACK_COST || !buybackable(S.mods).some(m => m.id === id)) return;
  S.money -= BUYBACK_COST;
  S.mods = withoutPact(S.mods, id); S.banned.push(id);
  const undone = undoPact(id, { maxHp: player.maxHp, legendNext: S.legendNext, repit: S.repit });
  player.maxHp = undone.maxHp; S.legendNext = undone.legendNext; S.repit = undone.repit;
  sfx('unlock');
  renderShop();
}
// L'écran des cartes se ferme sur le Comptoir, ou sur la partie si celui-ci ne s'ouvre pas ; la bannière de la carte
// prise (`after`) attend la sortie du Comptoir.
function closePick(after) { $('pickScreen').hidden = true; if (!openShop(after)) world.state = 'play'; }
export function choosePick(i) {
  if (weaponChoices) { chooseWeapon(i); return; }
  if (pickBanning) { if (shopReady()) banCard(i); return; }
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
  pickTimers.push(setTimeout(() => closePick(() => banner(tr.cards[m.id].name, sub)), DEAL_OUT_MS));
}
// Spécialiste : le pacte pris, le joueur choisit parmi ses armes débloquées celle qu'il gardera. Pas de retour en arrière.
function openWeaponPick() {
  weaponChoices = W.map((w, i) => i).filter(i => unlocked[i]); pickLocked = false;
  $('shop').hidden = true; $('buyback').innerHTML = ''; pactFocus = -1;
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
  pickTimers.push(setTimeout(() => closePick(() => banner(tr.cards.specialiste.name, `${tr.pactSealed} · ${tr.weapons[W[wi].id].name}`)), DEAL_OUT_MS));
}
// Pas de pause : toutes les cartes sont gagnées d'un coup, une fois toutes retournées.
function takeAll(slots) {
  for (let k = 0; k < slots.length; k++) if (slots[k].firstChild.classList.contains('down')) return;
  pickLocked = true;
  const won = pickChoices.slice();
  for (const m of won) applyCard(m);
  for (let k = 0; k < slots.length; k++) slots[k].classList.add('chosen');
  sfx('unlock');
  pickTimers.push(setTimeout(() => closePick(() => banner(won.length > 1 ? tr.cardsGained : tr.cards[won[0].id].name, won.map(m => tr.cards[m.id].short).join(' · '))), DEAL_OUT_MS));
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
// Manette : rangée des pactes à racheter, sous les cartes (-1 : le focus est sur les cartes). Faux s'il n'y en a aucun.
export let pactFocus = -1;
export function focusPact(i) {
  const chips = $('buyback').querySelectorAll('.mchip');
  if (i < 0 || !chips.length) {
    pactFocus = -1;
    for (let k = 0; k < chips.length; k++) chips[k].classList.remove('focus');
    if (pad.on) focusCard(pickFocus);
    return false;
  }
  pactFocus = clamp(i, 0, chips.length - 1);
  const cards = $('cards').querySelectorAll('.mcard');
  for (let k = 0; k < cards.length; k++) cards[k].classList.remove('focus');
  for (let k = 0; k < chips.length; k++) chips[k].classList.toggle('focus', k === pactFocus);
  try { chips[pactFocus].focus({ preventScroll: false }); } catch (e) {}
  return true;
}
export function buybackFocused() {
  const chip = $('buyback').querySelectorAll('.mchip')[pactFocus];
  if (chip) buybackPact(chip.dataset.id);
}
