// Compteur de FPS (masqué par défaut dans la version publiée, cf. SHOW_FPS_BY_DEFAULT).
import { SHOW_FPS_BY_DEFAULT, STORAGE_FPS } from '../config.js';
import { $ } from '../util.js';

const fpsEl = $('fps'), fpsTxt = $('fpsTxt'), fpsCtx = $('fpsCv').getContext('2d');
const ftHist = new Float32Array(96);
export let ftI = 0, fpsAcc = 0, fpsN = 0, fpsT = 0, fpsOn = SHOW_FPS_BY_DEFAULT;
try { const saved = localStorage.getItem(STORAGE_FPS); if (saved !== null) fpsOn = saved !== '0'; } catch (e) {}
export function setFps(v) {
  fpsOn = v; fpsEl.hidden = !v;
  for (const b of document.querySelectorAll('.optFps')) b.textContent = 'FPS : ' + (v ? 'affichés' : 'masqués');
  try { localStorage.setItem(STORAGE_FPS, v ? '1' : '0'); } catch (e) {}
}
export function tickFps(ms, now) {
  ftHist[ftI] = ms; ftI = (ftI + 1) % ftHist.length;
  fpsAcc += ms; fpsN++;
  if (now - fpsT > 250) {
    const f = 1000 / (fpsAcc / fpsN);
    fpsTxt.textContent = Math.round(f) + ' fps';
    fpsEl.dataset.lvl = f >= 55 ? 'ok' : f >= 30 ? 'mid' : 'low';
    fpsAcc = fpsN = 0; fpsT = now;
  }
  if (!fpsOn) return;
  const c = fpsCtx, w = 192, h = 52, y = v => h - Math.min(v, 50) / 50 * h;
  c.clearRect(0, 0, w, h);
  for (let k = 0; k < 96; k++) {
    const v = ftHist[(ftI + k) % 96], yy = y(v);
    c.fillStyle = v <= 18 ? '#62c46e' : v <= 34 ? '#f2c230' : '#d0352c';
    c.fillRect(k * 2, yy, 2, h - yy);
  }
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(0, y(16.7), w, 1); c.fillRect(0, y(33.3), w, 1);
}
