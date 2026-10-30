// Volet Bestiaire de l'écran titre : une ligne par ennemi, dans l'ordre d'arrivée, avec son portrait animé.
import { ENEMY_STATS, KILL_POINTS } from '../config.js';
import { tr } from '../i18n/index.js';
import { firstWave } from '../rules/waves.js';
import { drawOn, outlined } from './canvas.js';
import { drawArmored, drawBloater, drawChar, drawRunner, drawSpitter } from './sprites.js';
import { $ } from '../util.js';

// vague d'arrivée par type d'ennemi : les coureurs entrent en meutes, clé 'p' de WAVE_UNITS
const waveOf = k => firstWave(k === 'r' ? 'p' : k);
const ORDER = ['z', 'b', 'd', 'r', 's', 'a'].sort((a, b) => waveOf(a) - waveOf(b));
const DRAW = { z: e => drawChar(e, 'z'), d: e => drawChar(e, 'd'), b: drawBloater, r: drawRunner, s: drawSpitter, a: drawArmored };
const panel = $('panelBeasts');
// un faux ennemi par portrait, tourné vers le joueur, qui marche sur place ; dessins préparés une fois
const portraits = ORDER.map(k => {
  const e = { x: 0, y: 0, fx: .35, fy: 1, walk: Math.random() * 6, flash: 0, shield: ENEMY_STATS.a.shield, shieldMax: ENEMY_STATS.a.shield };
  const draw = () => DRAW[k](e), paint = () => outlined(e, draw);
  return { k, e, paint, cv: null };
});

export function buildBestiary() {
  $('beastList').innerHTML = ORDER.map(k => {
    const b = tr.beasts[k], st = ENEMY_STATS[k];
    return `<li><canvas class="bportrait" aria-hidden="true"></canvas><div class="bname"><h3>${b.name}</h3><span class="bwave">${tr.beastWave(waveOf(k))}</span></div>`
      + `<p>${b.role()} <span class="btip">${b.tip}</span></p>`
      + `<div class="bstats"><span>${tr.beastHp(st.hp, st.hpWave)}</span><span>${b.hit()}</span><span>${tr.beastPts(KILL_POINTS[k])}</span></div></li>`;
  }).join('');
  const cvs = $('beastList').querySelectorAll('canvas');
  for (let i = 0; i < portraits.length; i++) portraits[i].cv = cvs[i];
}
export function drawBestiary(dt) {
  if (panel.hidden) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  for (let i = 0; i < portraits.length; i++) {
    const p = portraits[i], w = p.cv.clientWidth, h = p.cv.clientHeight;
    if (!w) continue;
    if (p.cv.width !== Math.round(w * dpr)) { p.cv.width = Math.round(w * dpr); p.cv.height = Math.round(h * dpr); }
    const g = p.cv.getContext('2d'), s = Math.min(w, h * 1.1) / 52 * dpr;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, p.cv.width, p.cv.height);
    g.setTransform(s, 0, 0, s, 0, 0);
    p.e.walk += dt * (6 + ENEMY_STATS[p.k].sp / 14);
    p.e.x = w * dpr / 2 / s; p.e.y = h * dpr * .86 / s;
    drawOn(g, p.paint);
  }
}
