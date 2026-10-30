// HUD DOM : bannières, santé, score, combo, emplacements d'armes, cartes actives ; écrans d'accueil et de fin
// (dernière partie, meilleures parties) ; textes fixes de la page dans la langue courante.
import { sfx } from '../audio/sfx.js';
import { LOW_HP, MODS, SABLIER_HOLD, W } from '../config.js';
import { selectWeapon } from '../game/weapons.js';
import { lang, tr } from '../i18n/index.js';
import { S, ammo, comboTime, frenzy, mod, multiplier, player, queueCount, unlocked, world } from '../state/world.js';
import { cardIcon } from './cardIcons.js';
import { $, fmt } from '../util.js';

const bannerEl = $('banner');
let bannerCount = 0;
// kind : 'start' (début de vague), 'end' (fin de vague), 'info' (le reste) ; count : nombre qui défile dans la ligne du bas
export function banner(m, s = '', kind = 'info', count = 0) {
  if (world.demo) return;
  bannerEl.querySelector('.m').textContent = m;
  const sub = bannerEl.querySelector('.s');
  sub.textContent = s;
  bannerEl.className = kind; void bannerEl.offsetWidth; bannerEl.classList.add('on');
  const id = ++bannerCount;
  if (count) {
    const t0 = performance.now(), dur = 700;
    const step = now => {
      if (id !== bannerCount) return;
      const k = Math.min(1, (now - t0) / dur), v = Math.round(count * (1 - Math.pow(1 - k, 3)));
      sub.textContent = s + fmt(v);
      if (k < 1) requestAnimationFrame(step); else sfx('ding');
    };
    sub.textContent = s + '0'; requestAnimationFrame(step);
  }
}

let hudCache = {}, slotSig = [];
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function setStyle(id, prop, v) { const k = id + prop; if (hudCache[k] !== v) { hudCache[k] = v; $(id).style[prop] = v; } }
export function buildSlots() {
  const box = $('weapons'); box.innerHTML = '';
  W.forEach((w, i) => {
    const b = document.createElement('button');
    b.className = 'slot'; b.id = 'slot' + i; b.setAttribute('aria-label', tr.weapons[w.id].name);
    b.innerHTML = `<span class="k">${i + 1}</span><span class="n">${tr.weapons[w.id].short}</span><span class="a"></span>`;
    b.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); selectWeapon(i); });
    box.appendChild(b);
  });
}
let modsSig = '';
// Vide les caches du HUD pour forcer un redessin complet en début de partie.
export function resetHud() { slotSig = []; hudCache = {}; modsSig = ''; $('pauseScore').textContent = ''; }
function renderMods() {
  const act = MODS.filter(m => mod(m.id));
  const sig = act.map(m => m.id + mod(m.id)).join(',') + (S.souffleUsed ? 'u' : '');
  if (sig === modsSig) return;
  modsSig = sig;
  const html = act.map(m => `<span class="mchip r-${m.rar}">${tr.cards[m.id].short}${m.max > 1 ? ` <b>${mod(m.id)}</b>` : ''}${m.id === 'souffle' && S.souffleUsed ? ` <i>${tr.used}</i>` : ''}</span>`).join('');
  $('mods').innerHTML = html;
  $('pauseMods').innerHTML = html || `<span class="none">${tr.noCards}</span>`;
  $('hud').classList.toggle('silence', !!mod('silence')); // Silence : le HUD s'efface, la pause montre le score
}
// Portrait : la tête carrée du héros, 13 × 13 pixels, encaisse avec lui. Quatre états : intact, blessé (sous 60 %
// de la vie max : pansement, moue), critique (sous LOW_HP : yeux plissés, sang), mort (yeux en croix). Blanchit le temps
// du flash d'un coup ; cligne des yeux de temps en temps. Redessiné seulement quand son apparence change.
// La même tête, en grand, sert de mascotte à l'écran titre.
const FACE_HURT = .6, faceCtx = $('face').getContext('2d');
function renderFace() {
  const mood = player.dead || player.hp <= 0 ? 'dead' : player.hp < LOW_HP ? 'crit' : player.hp < player.maxHp * FACE_HURT ? 'hurt' : 'ok';
  const flash = player.flash > 0, blink = (mood === 'ok' || mood === 'hurt') && S.time % 3.2 < .12;
  const sig = mood + (flash ? 'f' : '') + (blink ? 'b' : '');
  if (hudCache.face === sig) return;
  hudCache.face = sig;
  drawFace(faceCtx, mood, flash, blink);
}
// mood : 'ok', 'hurt', 'crit' ou 'dead' ; dessin sur un canvas de 13 × 13
export function drawFace(c, mood, flash = false, blink = false) {
  const P = (col, x, y, w = 1, h = 1) => { c.fillStyle = flash ? '#ffffff' : col; c.fillRect(x, y, w, h); };
  c.clearRect(0, 0, 13, 13);
  P('#1b1b1b', 1, 1, 11, 12); P('#e2b48a', 2, 2, 9, 10); P('#4f3322', 2, 1, 9, 2);
  P('#c23a2e', 2, 3, 9, 1); P('#c23a2e', 0, 3, 2, 1); P('#c23a2e', 0, 4, 1, 1); // bandeau
  if (mood === 'dead') {
    for (const x of [3, 7]) { P('#1b1b1b', x, 5); P('#1b1b1b', x + 2, 5); P('#1b1b1b', x + 1, 6); P('#1b1b1b', x, 7); P('#1b1b1b', x + 2, 7); }
    P('#1b1b1b', 4, 10, 5, 1);
    return;
  }
  if (blink) { P('#1b1b1b', 3, 6, 2, 1); P('#1b1b1b', 8, 6, 2, 1); }
  else if (mood === 'crit') { P('#1b1b1b', 3, 6, 2, 1); P('#1b1b1b', 8, 6, 2, 1); P('#1b1b1b', 3, 5); P('#1b1b1b', 9, 5); }
  else { P('#1b1b1b', 4, 5, 1, 2); P('#1b1b1b', 8, 5, 1, 2); P('#ffffff', 3, 5); P('#ffffff', 7, 5); }
  if (mood !== 'ok') { P('#d9cfb8', 8, 8, 3, 1); P('#d9cfb8', 9, 7, 1, 3); } // pansement
  if (mood === 'crit') { P('#9c1a16', 3, 8, 1, 2); P('#9c1a16', 2, 10); P('#9c1a16', 6, 2, 1, 2); P('#5a2420', 4, 10, 5, 1); }
  else if (mood === 'hurt') { P('#5a2420', 5, 10, 3, 1); P('#5a2420', 4, 9); P('#5a2420', 8, 9); }
  else { P('#5a2420', 5, 10, 3, 1); P('#5a2420', 4, 9); }
}
// Santé : la traînée claire reste sur la vie perdue puis fond (transition CSS) ; un soin la recale aussitôt.
// Le portrait sursaute à chaque perte de vie.
function renderHp() {
  const pct = Math.max(0, player.hp) / player.maxHp * 100, width = pct.toFixed(1) + '%';
  const prev = hudCache.hpPct ?? Infinity;
  hudCache.hpPct = pct;
  if (pct !== prev) $('hpGhost').classList.toggle('snap', pct > prev);
  if (pct < prev) { const f = $('face'); f.classList.remove('jolt'); void f.offsetWidth; f.classList.add('jolt'); }
  setStyle('hpGhost', 'width', width);
  setStyle('hpFill', 'width', width);
  const tick = (25 / player.maxHp * 100).toFixed(2) + '%'; // un repère tous les 25 PV
  if (hudCache.hpTick !== tick) { hudCache.hpTick = tick; $('hpTicks').style.setProperty('--tick', tick); }
  const drain = mod('sablier') && S.waveActive && S.time - S.lastKill > SABLIER_HOLD && !player.dead; // le Sablier s'écoule
  if (hudCache.hpDrain !== drain) { hudCache.hpDrain = drain; $('hpBar').classList.toggle('drain', drain); }
  setText('hpNum', mod('unevie') && !player.dead ? tr.oneHit : String(Math.ceil(Math.max(0, player.hp))));
}
// Volet Cartes de l'écran titre : toutes les cartes par rareté, une ligne chacune, au texte de leur premier niveau.
export function buildCardsPanel() {
  $('cardsList').innerHTML = Object.keys(tr.rarGroups).map(r => {
    const cards = MODS.filter(m => m.rar === r).map(m => {
      const c = tr.cards[m.id], body = c.plus ? `<span class="plus">+ ${c.plus(1)}</span><span class="minus">− ${c.minus(1)}</span>` : `<span>${c.desc(1)}</span>`;
      return `<div class="crow r-${r}"><span class="mico">${cardIcon(m.id)}</span><span class="cname">${c.name}</span>`
        + `<span class="clv">${m.max > 1 ? tr.upTo(m.max) : tr.unique}</span><span class="ctext">${body}</span></div>`;
    }).join('');
    return `<h3 class="rgroup r-${r}">${tr.rarGroups[r]} · ${MODS.filter(m => m.rar === r).length}</h3><div class="clist">${cards}</div>`;
  }).join('');
}
function runDate(t) {
  if (!t) return '—';
  const d = new Date(t);
  return d.toDateString() === new Date().toDateString() ? tr.today : d.toLocaleDateString(tr.locale, { day: 'numeric', month: 'short' });
}
// Dernière partie (accueil) et meilleures parties (accueil et fin), la dernière surlignée dans le classement.
export function renderRuns() {
  const { last, top } = world.runs, none = `<p class="none">${tr.noRuns}</p>`;
  const rows = top.map((r, i) => `<tr${last && r.t === last.t ? ' class="me"' : ''}><td class="rank">${i + 1}</td><td>${fmt(r.score)}</td>`
    + `<td>${r.wave ?? '—'}</td><td>${r.combo ?? '—'}</td><td>${runDate(r.t)}</td></tr>`).join('');
  const board = top.length ? `<table class="runs"><thead><tr><th></th><th>${tr.score}</th><th>${tr.wave}</th><th>${tr.combo}</th><th>${tr.date}</th></tr></thead><tbody>${rows}</tbody></table>` : none;
  $('records').hidden = !last && !top.length;
  $('runsTitle').innerHTML = board; $('runsOver').innerHTML = board;
  if (!last) { $('lastRun').innerHTML = none; return; }
  const chips = MODS.filter(m => last.mods[m.id]).map(m => `<span class="mchip r-${m.rar}">${tr.cards[m.id].short}${m.max > 1 ? ` <b>${last.mods[m.id]}</b>` : ''}</span>`).join('');
  $('lastRun').innerHTML = `<b class="lscore">${fmt(last.score)}</b>`
    + `<div class="stats"><div><b>${last.wave}</b><span>${tr.wave}</span></div><div><b>${fmt(last.kills)}</b><span>${tr.killsLabel}</span></div><div><b>${last.combo}</b><span>${tr.combo}</span></div></div>`
    + `<h3 class="rlabel">${tr.cardsTaken}</h3><div class="lmods">${chips || `<span class="none">${tr.none}</span>`}</div>`;
}
// Textes fixes de la page : data-i18n (texte), data-i18n-html (texte avec balises), data-i18n-aria (aria-label).
export function translatePage() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = tr[el.dataset.i18n];
  for (const el of document.querySelectorAll('[data-i18n-html]')) el.innerHTML = tr[el.dataset.i18nHtml];
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', tr[el.dataset.i18nAria]);
  for (const el of document.querySelectorAll('.tflag')) el.setAttribute('aria-pressed', String(el.dataset.lang === lang)); // drapeaux de l'accueil
}
export function updateHud() {
  renderFace();
  renderHp();
  renderMods();
  const fz = frenzy();
  if (hudCache.fz !== fz) { hudCache.fz = fz; document.querySelector('.combo').classList.toggle('frenzy', fz); }
  const low = player.hp < LOW_HP ? 'low' : '';
  if (hudCache.low !== low) { hudCache.low = low; $('hpBar').classList.toggle('low', !!low); }
  setText('score', fmt(S.score));
  if (mod('silence') && hudCache.pauseScore !== S.score) { hudCache.pauseScore = S.score; $('pauseScore').textContent = tr.pauseScore(fmt(S.score)); }
  const pot = mod('toutourien') ? S.pot : -1; // Tout ou rien : points en jeu pendant la vague
  if (hudCache.pot !== pot) { hudCache.pot = pot; $('pot').hidden = pot < 0; $('pot').innerHTML = tr.pot(fmt(Math.max(0, pot))); }
  const rc = player.rollCharges <= 0 || !!player.roll;
  if (hudCache.rc !== rc) { hudCache.rc = rc; $('rollBtn').classList.toggle('cd', rc); }
  const nx = W.findIndex((w, i) => !unlocked[i]);
  const nextHtml = nx >= 0 ? tr.next(tr.weapons[W[nx].id].name, fmt(W[nx].unlock)) : tr.nextNone;
  if (hudCache.next !== nextHtml) { hudCache.next = nextHtml; $('next').innerHTML = nextHtml; }
  setText('waveNum', String(Math.max(1, S.wave)));
  const remaining = queueCount() + world.enemies.length;
  setText('left', S.waveActive ? tr.left(remaining) : tr.breakIn(Math.ceil(Math.max(0, S.breakT))));
  setText('comboNum', '×' + multiplier());
  setText('comboKills', tr.kills(S.combo));
  setStyle('comboFill', 'width', (S.combo ? S.comboT / comboTime() * 100 : 0).toFixed(1) + '%');
  W.forEach((w, i) => {
    const sealed = S.special >= 0 && i !== S.special; // Spécialiste : les autres armes sont condamnées
    const sig = (unlocked[i] ? 'u' : 'l') + (player.weapon === i ? 's' : '') + (sealed ? 'x' : '') + ammo[i];
    if (slotSig[i] === sig) return; slotSig[i] = sig;
    const b = $('slot' + i);
    b.classList.toggle('locked', !unlocked[i]);
    b.classList.toggle('sel', player.weapon === i);
    b.classList.toggle('sealed', sealed);
    b.classList.toggle('empty', unlocked[i] && ammo[i] <= 0);
    b.querySelector('.a').textContent = !unlocked[i] ? fmt(w.unlock) : ammo[i] === Infinity ? '∞' : ammo[i];
  });
}
