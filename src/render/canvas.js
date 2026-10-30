// Canvas principal : contexte, redimensionnement, passe de contour sombre autour des silhouettes.
import { STORAGE_OUTLINE, T, ZOOM_MAX, ZOOM_MIN } from '../config.js';
import { tr } from '../i18n/index.js';
import { $, clamp } from '../util.js';
export const cv = document.getElementById('cv');
export let ctx = cv.getContext('2d');

export let dpr = 1, VW = 0, VH = 0, zoom = 1;
export function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  VW = innerWidth; VH = innerHeight;
  cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr);
  cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
  zoom = clamp(Math.min(VW / (22 * T), VH / (14 * T)), ZOOM_MIN, ZOOM_MAX);
}
// Avant chaque personnage, on rejoue son dessin à travers un « faux » contexte qui peint chaque forme
// opaque en presque noir et un peu plus grosse. Le vrai dessin vient ensuite par-dessus : il ne reste
// qu'un liseré sombre tout autour. Les ombres et effets translucides sont ignorés.
export let outlineOn = true;
try { outlineOn = localStorage.getItem(STORAGE_OUTLINE) !== '0'; } catch (e) {}
const OUT = '#0f1012', OUT_W = 1.15;
const alphaCache = new Map();
function opaque(c) {
  if (typeof c !== 'string') return false;
  let v = alphaCache.get(c);
  if (v === undefined) {
    const m = /rgba\(([^)]*)\)/.exec(c);
    v = m ? parseFloat(m[1].split(',')[3]) >= .7 : true;
    alphaCache.set(c, v);
  }
  return v;
}
const OLP = (() => {
  let R = null, fs = '#000', ss = '#000', lw = 1;
  return {
    bind(real) { R = real; },
    get fillStyle() { return fs; }, set fillStyle(v) { fs = v; },
    get strokeStyle() { return ss; }, set strokeStyle(v) { ss = v; },
    get lineWidth() { return lw; }, set lineWidth(v) { lw = v; },
    get lineCap() { return R.lineCap; }, set lineCap(v) { R.lineCap = v; },
    get globalAlpha() { return R.globalAlpha; }, set globalAlpha(v) { R.globalAlpha = v; },
    get lineDashOffset() { return R.lineDashOffset; }, set lineDashOffset(v) { R.lineDashOffset = v; },
    setLineDash(v) { R.setLineDash(v); },
    save() { R.save(); }, restore() { R.restore(); },
    translate(a, b) { R.translate(a, b); }, scale(a, b) { R.scale(a, b); }, rotate(a) { R.rotate(a); },
    beginPath() { R.beginPath(); }, closePath() { R.closePath(); },
    moveTo(a, b) { R.moveTo(a, b); }, lineTo(a, b) { R.lineTo(a, b); },
    quadraticCurveTo(a, b, c, d) { R.quadraticCurveTo(a, b, c, d); },
    arc(...a) { R.arc(...a); }, ellipse(...a) { R.ellipse(...a); }, rect(...a) { R.rect(...a); },
    clip() { R.clip(); },
    createLinearGradient(...a) { return R.createLinearGradient(...a); },
    createRadialGradient(...a) { return R.createRadialGradient(...a); },
    fillRect(x, y, w, h) { if (!opaque(fs)) return; R.fillStyle = OUT; R.fillRect(x - OUT_W, y - OUT_W, w + 2 * OUT_W, h + 2 * OUT_W); },
    strokeRect(x, y, w, h) { if (!opaque(ss)) return; R.strokeStyle = OUT; R.lineWidth = lw + 2 * OUT_W; R.strokeRect(x, y, w, h); },
    fill() { if (!opaque(fs)) return; R.fillStyle = OUT; R.fill(); R.strokeStyle = OUT; R.lineWidth = 2 * OUT_W; R.stroke(); },
    stroke() { if (!opaque(ss)) return; R.strokeStyle = OUT; R.lineWidth = lw + 2 * OUT_W; R.stroke(); },
  };
})();
export function outlined(ent, draw) {
  if (outlineOn) {
    const real = ctx;
    real.save(); real.lineJoin = 'round'; OLP.bind(real); ctx = OLP;
    try { draw(); } finally { ctx = real; real.restore(); }
  }
  draw();
}
// Dessine sur un autre canvas (portraits du bestiaire) : ctx pointe sur g le temps de draw.
export function drawOn(g, draw) {
  const real = ctx; ctx = g;
  try { draw(); } finally { ctx = real; }
}
export function setOutline(v) {
  outlineOn = v;
  for (const b of document.querySelectorAll('.optOl')) b.textContent = tr.optOutline(v);
  try { localStorage.setItem(STORAGE_OUTLINE, v ? '1' : '0'); } catch (e) {}
}
