// Ambiance des arènes thématiques : halos pré-rendus, nuit, pluie, vignette, et l'option « Ambiance ».
// Chemin chaud : aucune allocation par image (halos et vignette préparés une fois, pluie en tableaux typés).
import { STORAGE_AMBIANCE } from '../config.js';
import { tr } from '../i18n/index.js';
import { ctx, cv } from './canvas.js';

export let ambianceOn = true;
try { ambianceOn = localStorage.getItem(STORAGE_AMBIANCE) !== '0'; } catch (e) {}
export function setAmbiance(v) {
  ambianceOn = v;
  for (const b of document.querySelectorAll('.optAmb')) b.textContent = tr.optAmbiance(v);
  try { localStorage.setItem(STORAGE_AMBIANCE, v ? '1' : '0'); } catch (e) {}
}

// Halo d'une teinte : dégradé radial dessiné une fois, posé ensuite en mode « lighter ».
const GLOW = 64, glows = new Map();
function glowSprite(rgb) {
  let c = glows.get(rgb);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = GLOW * 2;
    const g = c.getContext('2d'), gr = g.createRadialGradient(GLOW, GLOW, 1, GLOW, GLOW, GLOW);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, GLOW * 2, GLOW * 2);
    glows.set(rgb, c);
  }
  return c;
}
// rgb : « r,g,b » ; r : rayon en pixels du monde ; a : intensité au centre
export function glow(x, y, r, rgb, a) {
  const op = ctx.globalCompositeOperation, ga = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
  ctx.drawImage(glowSprite(rgb), x - r, y - r, 2 * r, 2 * r);
  ctx.globalCompositeOperation = op; ctx.globalAlpha = ga;
}
// Nuit : la partie visible (x, y, w, h en pixels du monde) est teinte par multiplication.
export function nightTint(color, x, y, w, h) {
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

// Pluie : gouttes en coordonnées de la vue (pixels du monde depuis son coin haut gauche), qui tombent
// en biais et éclaboussent à une hauteur tirée au hasard. Elle suit S.time : figée en pause.
const DROPS = 200, SPLASHES = 48, FALL = 600, DRIFT = -70;
const dx = new Float32Array(DROPS), dy = new Float32Array(DROPS), dg = new Float32Array(DROPS);
const sx = new Float32Array(SPLASHES), sy = new Float32Array(SPLASHES), st = new Float32Array(SPLASHES);
let rainT = -1, rainW = 0, rainH = 0, nextSplash = 0;
function dropAt(i, w, h, anywhere) {
  dg[i] = Math.random() * h; dx[i] = Math.random() * (w + 80);
  dy[i] = anywhere ? Math.random() * dg[i] : -20 - Math.random() * 60;
}
export function drawRain(time, x0, y0, w, h) {
  if (w !== rainW || h !== rainH || rainT < 0) { rainW = w; rainH = h; for (let i = 0; i < DROPS; i++) dropAt(i, w, h, true); }
  const dt = rainT < 0 ? 0 : Math.max(0, Math.min(.05, time - rainT)); rainT = time;
  ctx.strokeStyle = 'rgba(170,190,235,.35)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 0; i < DROPS; i++) {
    dx[i] += DRIFT * dt; dy[i] += FALL * dt;
    if (dy[i] > dg[i]) {
      sx[nextSplash] = dx[i]; sy[nextSplash] = dg[i]; st[nextSplash] = .18; nextSplash = (nextSplash + 1) % SPLASHES;
      dropAt(i, w, h, false);
    }
    const px = x0 + dx[i], py = y0 + dy[i];
    ctx.moveTo(px, py); ctx.lineTo(px + DRIFT * .018, py + FALL * .018);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(190,210,245,.4)';
  for (let i = 0; i < SPLASHES; i++) {
    if (st[i] <= 0) continue;
    st[i] -= dt; const q = 1 - st[i] / .18;
    ctx.beginPath(); ctx.ellipse(x0 + sx[i], y0 + sy[i], 2 + q * 4, 1 + q * 1.6, 0, 0, 7); ctx.stroke();
  }
}

// Vignette sombre sur les bords de l'écran, recalculée seulement quand la taille du canvas change.
let vig = null;
export function drawVignette() {
  if (!vig || vig.width !== cv.width || vig.height !== cv.height) {
    vig = document.createElement('canvas'); vig.width = cv.width; vig.height = cv.height;
    const g = vig.getContext('2d'), w = cv.width, h = cv.height;
    const gr = g.createRadialGradient(w / 2, h / 2, h * .45, w / 2, h / 2, w * .7);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.5)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
  ctx.drawImage(vig, 0, 0);
}
