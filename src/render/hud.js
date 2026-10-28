// HUD DOM : bannières, santé, score, combo, emplacements d'armes, cartes actives.
import { sfx } from '../audio/sfx.js';
import { LOW_HP, MODS, W } from '../config.js';
import { selectWeapon } from '../game/weapons.js';
import { S, ammo, comboTime, frenzy, mod, multiplier, player, queueCount, unlocked, world } from '../state/world.js';
import { $, fmt } from '../util.js';

const bannerEl = $('banner');
let bannerCount = 0;
// kind : 'start' (début de vague), 'end' (fin de vague), 'info' (le reste) ; count : nombre qui défile dans la ligne du bas
export function banner(m, s = '', kind = 'info', count = 0) {
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
    b.className = 'slot'; b.id = 'slot' + i; b.setAttribute('aria-label', w.name);
    b.innerHTML = `<span class="k">${i + 1}</span><span class="n">${w.short}</span><span class="a"></span>`;
    b.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); selectWeapon(i); });
    box.appendChild(b);
  });
}
let modsSig = '';
// Vide les caches du HUD pour forcer un redessin complet en début de partie.
export function resetHud() { slotSig = []; hudCache = {}; modsSig = ''; }
function renderMods() {
  const act = MODS.filter(m => mod(m.id));
  const sig = act.map(m => m.id + mod(m.id)).join(',') + (S.souffleUsed ? 'u' : '');
  if (sig === modsSig) return;
  modsSig = sig;
  const html = act.map(m => `<span class="mchip r-${m.rar}">${m.short}${m.max > 1 ? ` <b>${mod(m.id)}</b>` : ''}${m.id === 'souffle' && S.souffleUsed ? ' <i>utilisé</i>' : ''}</span>`).join('');
  $('mods').innerHTML = html;
  $('pauseMods').innerHTML = html || `<span class="none">Aucune carte pour l'instant</span>`;
}
// Santé : la traînée claire reste sur la vie perdue puis fond (transition CSS) ; un soin la recale aussitôt.
function renderHp() {
  const pct = Math.max(0, player.hp) / player.maxHp * 100, width = pct.toFixed(1) + '%';
  const prev = hudCache.hpPct ?? Infinity;
  hudCache.hpPct = pct;
  if (pct !== prev) $('hpGhost').classList.toggle('snap', pct > prev);
  setStyle('hpGhost', 'width', width);
  setStyle('hpFill', 'width', width);
  const tick = (25 / player.maxHp * 100).toFixed(2) + '%'; // un repère tous les 25 PV
  if (hudCache.hpTick !== tick) { hudCache.hpTick = tick; $('hpTicks').style.setProperty('--tick', tick); }
  setText('hpNum', String(Math.ceil(Math.max(0, player.hp))));
}
export function updateHud() {
  renderHp();
  renderMods();
  const fz = frenzy();
  if (hudCache.fz !== fz) { hudCache.fz = fz; document.querySelector('.combo').classList.toggle('frenzy', fz); }
  const low = player.hp < LOW_HP ? 'low' : '';
  if (hudCache.low !== low) { hudCache.low = low; $('hpBar').classList.toggle('low', !!low); }
  setText('score', fmt(S.score));
  const rc = player.rollCharges <= 0 || !!player.roll;
  if (hudCache.rc !== rc) { hudCache.rc = rc; $('rollBtn').classList.toggle('cd', rc); }
  const nx = W.findIndex((w, i) => !unlocked[i]);
  const nextHtml = nx >= 0 ? `Prochaine : <b>${W[nx].name}</b> à ${fmt(W[nx].unlock)}` : 'Arsenal complet';
  if (hudCache.next !== nextHtml) { hudCache.next = nextHtml; $('next').innerHTML = nextHtml; }
  setText('waveNum', String(Math.max(1, S.wave)));
  const remaining = queueCount() + world.enemies.length;
  setText('left', S.waveActive ? `${remaining} restant${remaining > 1 ? 's' : ''}` : `Prochaine dans ${Math.ceil(Math.max(0, S.breakT))} s`);
  setText('comboNum', '×' + multiplier());
  setText('comboKills', S.combo + (S.combo > 1 ? ' kills' : ' kill'));
  setStyle('comboFill', 'width', (S.combo ? S.comboT / comboTime() * 100 : 0).toFixed(1) + '%');
  W.forEach((w, i) => {
    const sig = (unlocked[i] ? 'u' : 'l') + (player.weapon === i ? 's' : '') + ammo[i];
    if (slotSig[i] === sig) return; slotSig[i] = sig;
    const b = $('slot' + i);
    b.classList.toggle('locked', !unlocked[i]);
    b.classList.toggle('sel', player.weapon === i);
    b.classList.toggle('empty', unlocked[i] && ammo[i] <= 0);
    b.querySelector('.a').textContent = !unlocked[i] ? fmt(w.unlock) : ammo[i] === Infinity ? '∞' : ammo[i];
  });
}
