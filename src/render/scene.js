// Composition de chaque image : décor, crevasses, constructions, caisses, entités triées, repères, vignette.
import { AVEUGLE_SIGHT, LOW_HP, MH, MW, T, W } from '../config.js';
import { ctx, cv, dpr, outlined, zoom } from './canvas.js';
import { floorC } from './floor.js';
import { aimMuzzle, drawAcidGround, drawArmored, drawBloater, drawChar, drawGlobs, drawPlayerState, drawRunner, drawSpitter } from './sprites.js';
import { doorSet, frontTile, map, passable, tileAt } from '../state/arena.js';
import { S, blocks, cam, coinBlink, mod, player, world } from '../state/world.js';
import { rnd } from '../util.js';

// Halo de bouche : un dégradé pré-rendu par teinte, posé en mode « lighter » (aucune allocation par image)
function haloSprite(rgb) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${rgb},.9)`); gr.addColorStop(.3, `rgba(${rgb},.4)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return c;
}
const HALO_WARM = haloSprite('255,214,140'), HALO_RAIL = haloSprite('140,232,255');
const HALO_R = { pistol: 26, uzi: 20, rifle: 28, shotgun: 46, rocket: 38, rail: 60 };
function drawMuzzleHalo() {
  const id = W[player.weapon].id, R = HALO_R[id];
  if (player.dead || player.muzzle <= 0 || !R) return;
  const m = aimMuzzle(), r = R * (.85 + Math.random() * .3);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, player.muzzle * 20);
  ctx.drawImage(id === 'rail' ? HALO_RAIL : HALO_WARM, m.x - r, m.y - m.h - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}

function drawMarkers() {
  const t = S.time, pulse = .5 + .5 * Math.sin(t * 6);
  // bord lumineux et animé des flaques d'acide
  for (const p of world.puddles) {
    const fade = Math.min(1, p.t / .8), r = p.r * Math.min(1, (p.max - p.t) / .15) + 1;
    ctx.save(); ctx.setLineDash([6, 4]); ctx.lineDashOffset = -t * 18;
    ctx.strokeStyle = `rgba(214,255,110,${(.6 + .35 * pulse) * fade})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * .6, 0, 0, 7); ctx.stroke(); ctx.restore();
  }
  for (const e of world.enemies) {
    if (e.dead) continue;
    if (e.type === 'b' && e.fuse !== undefined) {
      // Gonflé amorcé : anneau rouge serré + rayon réel de l'explosion en pointillés
      const R = 74 * Math.pow(1.4, mod('chair'));
      ctx.save(); ctx.setLineDash([5, 6]);
      ctx.strokeStyle = `rgba(255,70,50,${.25 + .2 * pulse})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + 1, R, R * .55, 0, 0, 7); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = `rgba(255,70,50,${.6 + .4 * pulse})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + 1, 24 + pulse * 4, (24 + pulse * 4) * .5, 0, 0, 7); ctx.stroke();
    } else if (e.type === 's' && e.wind > 0) {
      ctx.strokeStyle = `rgba(182,224,74,${.5 + .5 * pulse})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + 1, 16, 7, 0, 0, 7); ctx.stroke();
    } else if (e.type === 'a' && e.shield > 0) {
      // arc blanc du côté protégé par le bouclier
      const a = Math.atan2(e.fy * 2.2, e.fx);
      ctx.strokeStyle = 'rgba(235,242,248,.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(e.x, e.y + 1, 19, 8.5, 0, a - 1.05, a + 1.05); ctx.stroke();
    }
  }
  for (const p of world.pickups) {
    ctx.strokeStyle = p.kind === 'hp' ? 'rgba(98,196,110,.9)' : 'rgba(242,194,48,.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 13, 5.5, 0, 0, 7); ctx.stroke();
  }
}
// faisceau vertical au-dessus des caisses, visible même derrière la horde
function drawBeacons() {
  const pulse = .5 + .5 * Math.sin(S.time * 6);
  for (const p of world.pickups) {
    const col = p.kind === 'hp' ? '98,196,110' : '242,194,48';
    const g = ctx.createLinearGradient(0, p.y - 74, 0, p.y - 12);
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${.35 + .15 * pulse})`);
    ctx.fillStyle = g; ctx.fillRect(p.x - 4, p.y - 74, 8, 62);
  }
}
function drawTile(tx, ty, kind) {
  const x = tx * T, y = ty * T, h = kind === 1 ? 26 : 18;
  const below = tileAt(tx, ty + 1) === 1 && map[(ty + 1) * MW + tx] === kind;
  if (kind === 1) {
    if (!below || ty + 1 >= MH) { ctx.fillStyle = '#3c4245'; ctx.fillRect(x, y + T - h, T, h); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y + T - 4, T, 4); ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(x + T - 1, y + T - h, 1, h); }
    ctx.fillStyle = '#596166'; ctx.fillRect(x, y - h, T, T);
    ctx.fillStyle = '#737c81';
    const same = (dx, dy) => { const nx = tx + dx, ny = ty + dy; return nx < 0 || ny < 0 || nx >= MW || ny >= MH || map[ny * MW + nx] === 1; };
    if (!same(0, -1)) ctx.fillRect(x, y - h, T, 2);
    if (!same(-1, 0)) ctx.fillRect(x, y - h, 2, T);
    if (!same(1, 0)) { ctx.fillStyle = '#4c5357'; ctx.fillRect(x + T - 2, y - h, 2, T); }
  } else {
    ctx.fillStyle = '#8f6639'; ctx.fillRect(x + 1, y + T - h, T - 2, h);
    ctx.strokeStyle = '#6a4a28'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 2.5, y + T - h + 1.5, T - 5, h - 3);
    ctx.beginPath(); ctx.moveTo(x + 3, y + T - 2); ctx.lineTo(x + T - 3, y + T - h + 2); ctx.stroke();
    ctx.fillStyle = '#b98c55'; ctx.fillRect(x + 1, y - h + 1, T - 2, T - 2);
    ctx.fillStyle = '#a57a46'; for (let k = 1; k < 4; k++) ctx.fillRect(x + 1, y - h + 1 + k * 7.5, T - 2, 1.5);
    ctx.strokeStyle = '#7d5a31'; ctx.strokeRect(x + 1.5, y - h + 1.5, T - 3, T - 3);
  }
}
function drawVoid(tx0, tx1, ty0, ty1) {
  // 1er passage : le fond noir, légèrement débordant pour éviter les liserés entre tuiles
  ctx.fillStyle = '#0c0d0e';
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (map[ty * MW + tx] === 3) ctx.fillRect(tx * T - .5, ty * T - .5, T + 1, T + 1);
  }
  // 2e passage : parois et rebords
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (map[ty * MW + tx] !== 3) continue;
    const x = tx * T, y = ty * T;
    const up = ty > 0 && map[(ty - 1) * MW + tx] === 3, dn = ty < MH - 1 && map[(ty + 1) * MW + tx] === 3;
    const lf = tx > 0 && map[ty * MW + tx - 1] === 3, rt = tx < MW - 1 && map[ty * MW + tx + 1] === 3;
    if (!up) {
      // paroi du fond de la crevasse, visible en vue 3/4
      const g = ctx.createLinearGradient(0, y, 0, y + 22);
      g.addColorStop(0, '#73776f'); g.addColorStop(.3, '#43463f'); g.addColorStop(1, 'rgba(12,13,14,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, T, 22);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x, y + 5, T, 1); ctx.fillRect(x, y + 11, T, 1);
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x + ((tx * 7) % 23) + 3, y + 1, 1, 9);
    }
    if (!lf) { const g = ctx.createLinearGradient(x, 0, x + 6, 0); g.addColorStop(0, 'rgba(110,114,106,.55)'); g.addColorStop(1, 'rgba(12,13,14,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, 6, T); }
    if (!rt) { const g = ctx.createLinearGradient(x + T, 0, x + T - 6, 0); g.addColorStop(0, 'rgba(110,114,106,.35)'); g.addColorStop(1, 'rgba(12,13,14,0)'); ctx.fillStyle = g; ctx.fillRect(x + T - 6, y, 6, T); }
    if (!dn) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x, y + T - 5, T, 3); ctx.fillStyle = '#9a9e96'; ctx.fillRect(x, y + T - 2, T, 2); }
  }
}
function drawFires() {
  for (const f of world.fires) {
    const k = Math.min(1, f.t / .6), fl = .8 + Math.sin(S.time * 20 + f.x) * .2;
    const g = ctx.createRadialGradient(f.x, f.y, 1, f.x, f.y, 16);
    g.addColorStop(0, `rgba(255,190,80,${.5 * k * fl})`); g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(f.x, f.y, 16, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(255,${150 + 60 * fl | 0},60,${.9 * k})`;
    for (let j = -1; j <= 1; j++) {
      const hh = (6 + 4 * Math.sin(S.time * 14 + f.x + j * 2)) * k;
      ctx.beginPath(); ctx.moveTo(f.x + j * 5 - 3, f.y); ctx.lineTo(f.x + j * 5, f.y - hh); ctx.lineTo(f.x + j * 5 + 3, f.y); ctx.fill();
    }
  }
}
export function drawBlock(b) {
  const x = b.tx * T, y = b.ty * T, fl = b.flash > 0, dr = b.drop * 14;
  ctx.save(); ctx.translate(0, -dr);
  if (b.kind === 'wall') {
    const h = 20;
    ctx.fillStyle = fl ? '#fff' : '#858a85'; ctx.fillRect(x + 1, y + T - h, T - 2, h);
    if (!fl) {
      ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + T - h + 3, T - 2, 6); ctx.clip();
      for (let k = -2; k < 8; k++) { ctx.fillStyle = k & 1 ? '#1d1f20' : '#f2c230'; ctx.beginPath(); ctx.moveTo(x + k * 6, y + T - h + 9); ctx.lineTo(x + k * 6 + 6, y + T - h + 3); ctx.lineTo(x + k * 6 + 12, y + T - h + 3); ctx.lineTo(x + k * 6 + 6, y + T - h + 9); ctx.fill(); }
      ctx.restore();
    }
    ctx.fillStyle = fl ? '#fff' : '#aab0ab'; ctx.fillRect(x + 1, y - h + 2, T - 2, T - 2);
    ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(x + 1, y - h + T / 2, T - 2, 2);
    const dmg = 1 - b.hp / b.max;
    if (dmg > .3) { ctx.strokeStyle = 'rgba(30,30,30,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 6, y - h + 6); ctx.lineTo(x + 14, y - h + 14); ctx.lineTo(x + 11, y - h + 22); if (dmg > .6) { ctx.moveTo(x + 24, y - h + 4); ctx.lineTo(x + 19, y - h + 16); ctx.lineTo(x + 27, y - h + 24); } ctx.stroke(); }
    if (!fl && mod('barbeles')) {
      ctx.strokeStyle = '#2c3034'; ctx.lineWidth = 1;
      for (const off of [6, 18]) {
        ctx.beginPath();
        for (let k = 0; k <= 8; k++) { const px = x + 2 + k * (T - 4) / 8, py = y - h + off + (k & 1 ? 2.5 : -1.5); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
      }
    }
    if (b.turret) {
      const tu = b.turret, tx2 = x + T / 2, ty2 = y - h + T / 2 - 1;
      ctx.fillStyle = fl ? '#fff' : '#3a3f45'; ctx.beginPath(); ctx.ellipse(tx2, ty2 + 2, 9, 5.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = fl ? '#fff' : '#59616a'; ctx.beginPath(); ctx.ellipse(tx2, ty2, 7, 4.6, 0, 0, 7); ctx.fill();
      const ca = Math.cos(tu.ang), sa = Math.sin(tu.ang) * .55;
      ctx.strokeStyle = '#1c1e21'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx2, ty2 - 1); ctx.lineTo(tx2 + ca * 13, ty2 - 1 + sa * 13); ctx.stroke();
      ctx.fillStyle = '#f2c230'; ctx.fillRect(tx2 - 1.5, ty2 - 2.5, 3, 3);
      if (tu.flash > 0) { ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(tx2 + ca * 16, ty2 - 1 + sa * 16, 4, 0, 7); ctx.fill(); }
    }
  } else {
    const cx = x + T / 2, cy = y + T / 2 + 6;
    ctx.fillStyle = 'rgba(20,22,24,.3)'; ctx.beginPath(); ctx.ellipse(cx, cy + 1, 11, 4.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = fl ? '#fff' : '#b8312a'; ctx.fillRect(cx - 9, cy - 22, 18, 22);
    ctx.fillStyle = fl ? '#fff' : '#8e231e'; ctx.fillRect(cx - 9, cy - 16, 18, 2); ctx.fillRect(cx - 9, cy - 7, 18, 2); ctx.fillRect(cx + 5, cy - 22, 4, 22);
    ctx.fillStyle = fl ? '#fff' : '#d4473d'; ctx.beginPath(); ctx.ellipse(cx, cy - 22, 9, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7d1d18'; ctx.beginPath(); ctx.arc(cx + 3, cy - 22, 1.6, 0, 7); ctx.fill();
    if (!fl) { ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.moveTo(cx - 2, cy - 14); ctx.lineTo(cx + 3, cy - 14); ctx.lineTo(cx + .5, cy - 9); ctx.fill(); }
  }
  if (b.hp < b.max && b.kind === 'wall') {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x + 4, y - 28, T - 8, 3);
    ctx.fillStyle = '#f2c230'; ctx.fillRect(x + 4, y - 28, (T - 8) * Math.max(0, b.hp / b.max), 3);
  }
  ctx.restore();
}
function drawEnemy(e) {
  if (e.type === 'b') drawBloater(e); else if (e.type === 'r') drawRunner(e); else if (e.type === 's') drawSpitter(e); else if (e.type === 'a') drawArmored(e); else drawChar(e, e.type);
}
function drawPickup(p) {
  const bb = Math.sin(S.time * 4 + p.ph) * 2;
  ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y));
  const pr = (S.time * 1.2 + p.ph) % 1;
  ctx.strokeStyle = `rgba(242,194,48,${.6 * (1 - pr)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 8 + pr * 12, (8 + pr * 12) * .45, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(20,22,24,.3)'; ctx.beginPath(); ctx.ellipse(0, 1, 9, 3.5, 0, 0, 7); ctx.fill();
  const hp = p.kind === 'hp', top = -16 - bb;
  ctx.fillStyle = hp ? '#cfccc4' : '#56602f'; ctx.fillRect(-8, top + 2, 16, 11);
  ctx.fillStyle = hp ? '#f0eee8' : '#707b40'; ctx.fillRect(-8, top - 5, 16, 7);
  if (hp) { ctx.fillStyle = '#d0352c'; ctx.fillRect(-1.5, top + 3, 3, 9); ctx.fillRect(-4.5, top + 6, 9, 3); }
  else { ctx.fillStyle = '#f2c230'; for (let k = -1; k <= 1; k++) ctx.fillRect(k * 4 - 1, top + 4, 2, 7); }
  ctx.restore();
}

// Pièces au sol, dessinées avant le tri en profondeur (aucun objet alloué par pièce) : debout, elles tournent sur
// elles-mêmes pour trancher avec ce qui est à plat au sol, sur une ombre sombre ; une étoile blanche scintille de temps
// en temps. Elles clignotent pendant leurs dernières secondes (COIN_BLINK, AVARICE_BLINK sous Avarice).
// blink : dernières secondes où la pièce clignote (raccourcies sous Avarice), lues une fois par image.
const coinVisible = (c, x0, x1, y0, y1, blink) => c.x >= x0 && c.x <= x1 && c.y >= y0 && c.y <= y1 && !(c.life < blink && (c.life * 8 | 0) & 1);
function drawCoins(x0, x1, y0, y1) {
  const coins = world.coins, blink = coinBlink(), trap = mod('piegee');
  // ombres de toutes les pièces en un seul remplissage
  ctx.fillStyle = 'rgba(20,22,24,.55)'; ctx.beginPath();
  for (let i = 0; i < coins.length; i++) {
    const c = coins[i];
    if (!coinVisible(c, x0, x1, y0, y1, blink)) continue;
    ctx.moveTo(c.x + 5.5, c.y + 1); ctx.ellipse(c.x, c.y + 1, 5.5, 2.4, 0, 0, 7);
  }
  ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#17191a';
  for (let i = 0; i < coins.length; i++) {
    const c = coins[i];
    if (!coinVisible(c, x0, x1, y0, y1, blink)) continue;
    const a = Math.cos(S.time * 4.2 + c.ph), rx = Math.max(.9, Math.abs(a) * 4.6), y = c.y - 4.6 - c.z;
    const armed = trap && c.life < 1 && (c.life * 8 | 0) & 1; // Monnaie piégée : rouge par éclats la dernière seconde
    ctx.fillStyle = armed ? '#d0352c' : Math.abs(a) < .35 ? '#9a6f12' : '#e8b23a'; // de profil, on voit la tranche
    ctx.beginPath(); ctx.ellipse(c.x, y, rx, 4.6, 0, 0, 7); ctx.fill(); ctx.stroke();
    if (rx > 2.2) { ctx.fillStyle = '#fff1b8'; ctx.fillRect(c.x - rx * .45, y - 2.9, 1.6, 3); }
    // étoile : 0,3 s toutes les 1,6 s, déphasée d'une pièce à l'autre
    const k = (S.time * .8 + c.ph * .37) % 1.6;
    if (k < .3) {
      const r = Math.sin(k / .3 * Math.PI) * 4.5, sx = c.x + 3, sy = y - 5.4;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - .75, sy - r, 1.5, r * 2); ctx.fillRect(sx - r, sy - .75, r * 2, 1.5);
    }
  }
}

// Aveugle : voile sombre au-delà de AVEUGLE_SIGHT cases autour du joueur, en ellipse écrasée par la vue 3/4, fondu sur
// la dernière case. Le dégradé est créé une fois (repère centré sur le joueur) et réutilisé à chaque image.
const BLIND_DARK = 'rgba(10,11,12,.94)', BLIND_SQUASH = .55, BLIND_COVER = 4000;
let blindGrad = null, blindCtx = null;
function drawBlindness() {
  if (!blindGrad || blindCtx !== ctx) {
    blindCtx = ctx;
    blindGrad = ctx.createRadialGradient(0, 0, (AVEUGLE_SIGHT - 1) * T, 0, 0, AVEUGLE_SIGHT * T);
    blindGrad.addColorStop(0, 'rgba(10,11,12,0)'); blindGrad.addColorStop(1, BLIND_DARK);
  }
  ctx.save();
  ctx.translate(player.x, player.y - 10); ctx.scale(1, BLIND_SQUASH);
  ctx.fillStyle = blindGrad; ctx.fillRect(-BLIND_COVER, -BLIND_COVER, BLIND_COVER * 2, BLIND_COVER * 2);
  ctx.restore();
}
// Liste d'affichage triée par profondeur (k) : entrées réutilisées d'une image à l'autre et tri par insertion
// à l'ajout, stable comme Array.prototype.sort, donc même ordre de dessin, sans allocation ni comparateur.
const drawList = [];
let drawN = 0;
function addDraw(k, t, o, tx, ty, v) {
  let d = drawList[drawN];
  if (!d) d = drawList[drawN] = { k: 0, t: 0, o: null, tx: 0, ty: 0, v: 0 };
  d.k = k; d.t = t; d.o = o; d.tx = tx; d.ty = ty; d.v = v;
  let j = drawN++;
  while (j > 0 && drawList[j - 1].k > k) { drawList[j] = drawList[j - 1]; j--; }
  drawList[j] = d;
}
export function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1a1c1d'; ctx.fillRect(0, 0, cv.width, cv.height);
  const s = zoom * dpr;
  const sx = world.shake > .3 ? rnd(world.shake) : 0, sy = world.shake > .3 ? rnd(world.shake) : 0;
  const ox = cv.width / 2 - (cam.x + cam.kx + sx) * s, oy = cv.height / 2 - (cam.y + cam.ky + sy) * s;
  ctx.setTransform(s, 0, 0, s, ox, oy);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(floorC, 0, 0);

  const hw = cv.width / 2 / s, hh = cv.height / 2 / s;
  const tx0 = Math.max(0, Math.floor((cam.x - hw) / T) - 1), tx1 = Math.min(MW - 1, Math.floor((cam.x + hw) / T) + 1);
  const ty0 = Math.max(0, Math.floor((cam.y - hh) / T) - 1), ty1 = Math.min(MH - 1, Math.floor((cam.y + hh + 40) / T) + 1);

  drawVoid(tx0, tx1, ty0, ty1);
  // ombres portées des murs
  ctx.fillStyle = 'rgba(30,32,30,.16)';
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const m0 = map[ty * MW + tx];
    if ((m0 === 1 || m0 === 2) && ty + 1 < MH && !map[(ty + 1) * MW + tx]) ctx.fillRect(tx * T, (ty + 1) * T, T, 7);
  }

  drawAcidGround();
  drawFires();
  drawMarkers();
  // ennemis qui tombent dans une crevasse : ils rapetissent et s'effacent dans le noir
  for (const f of world.fallers) {
    const e = f.e, k = f.t / .7, sc = 1 - k * .8;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k * 1.2);
    ctx.translate(e.x, e.y + k * 16); ctx.rotate(k * (e.x % 2 ? 1.2 : -1.2)); ctx.scale(sc, sc); ctx.translate(-e.x, -e.y);
    e.flash = 0; e.moving = true; e.walk = (e.walk || 0) + .4;
    if (e.type === 'b') drawBloater(e); else if (e.type === 'r') drawRunner(e); else if (e.type === 's') drawSpitter(e); else if (e.type === 'a') drawArmored(e); else drawChar(e, e.type);
    ctx.restore();
  }
  drawCoins(cam.x - hw - 20, cam.x + hw + 20, cam.y - hh - 20, cam.y + hh + 40);
  drawN = 0;
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const v = map[ty * MW + tx]; if (v === 1 || v === 2) addDraw((ty + 1) * T, 0, null, tx, ty, v);
  }
  for (const b of blocks.values()) addDraw(b.ty * T + T * .75, 1, b, 0, 0, 0);
  for (let i = 0; i < world.pickups.length; i++) addDraw(world.pickups[i].y, 2, world.pickups[i], 0, 0, 0);
  for (let i = 0; i < world.enemies.length; i++) addDraw(world.enemies[i].y, 3, world.enemies[i], 0, 0, 0);
  if (!player.dead) addDraw(player.y, 4, player, 0, 0, 0);
  for (let i = 0; i < world.grenades.length; i++) addDraw(world.grenades[i].y, 5, world.grenades[i], 0, 0, 0);
  for (let i = 0; i < world.rockets.length; i++) addDraw(world.rockets[i].y, 6, world.rockets[i], 0, 0, 0);
  const vx0 = cam.x - hw - 50, vx1 = cam.x + hw + 50, vy0 = cam.y - hh - 20, vy1 = cam.y + hh + 70;
  for (let i = 0; i < drawN; i++) {
    const d = drawList[i];
    if (d.t >= 2 && d.t <= 4 && (d.o.x < vx0 || d.o.x > vx1 || d.o.y < vy0 || d.o.y > vy1)) continue;
    switch (d.t) {
      case 0: drawTile(d.tx, d.ty, d.v); break;
      case 1: drawBlock(d.o); break;
      case 2: outlined(d.o, drawPickup); break;
      case 3: outlined(d.o, drawEnemy); break;
      case 4: outlined(player, drawPlayerState); break;
      case 5: {
        const g = d.o;
        ctx.fillStyle = 'rgba(20,22,24,.3)'; ctx.beginPath(); ctx.ellipse(g.x, g.y, 4, 2, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#3f4a2c'; ctx.beginPath(); ctx.arc(g.x, g.y - 4 - g.z, 3.6, 0, 7); ctx.fill();
        if ((g.t * 8 | 0) & 1) { ctx.fillStyle = '#ff4a3a'; ctx.fillRect(g.x - 1, g.y - 9 - g.z, 2, 2); }
        break;
      }
      case 6: {
        const r = d.o, a = Math.atan2(r.vy, r.vx);
        ctx.save(); ctx.translate(r.x, r.y - 14); ctx.rotate(a);
        ctx.fillStyle = '#4a5155'; ctx.fillRect(-7, -2.5, 12, 5); ctx.fillStyle = '#d0352c'; ctx.fillRect(4, -2.5, 4, 5);
        ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(-9, 0, 2.5 + Math.random() * 2, 0, 7); ctx.fill();
        ctx.restore(); break;
      }
    }
  }

  drawMuzzleHalo();
  // boules de feu
  for (const p of world.projs) {
    const g = ctx.createRadialGradient(p.x, p.y - 14, 1, p.x, p.y - 14, 10);
    g.addColorStop(0, 'rgba(255,240,180,1)'); g.addColorStop(.4, 'rgba(255,140,40,.9)'); g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y - 14, 10, 0, 7); ctx.fill();
  }
  // particules
  for (const p of world.parts) {
    if (p.t === 'smoke') {
      const a = Math.max(0, p.life / p.max) * .45;
      ctx.fillStyle = p.color + a.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y - p.z, p.size, 0, 7); ctx.fill();
    } else if (p.t === 'fire') {
      const k = Math.max(0, p.life / p.max);
      ctx.fillStyle = `rgba(255,${120 + k * 120 | 0},${40 + k * 60 | 0},${k})`; ctx.beginPath(); ctx.arc(p.x, p.y - p.z, p.size * k + 1, 0, 7); ctx.fill();
    } else if (p.t === 'casing') {
      const hx = Math.cos(p.rot) * p.len / 2, hy = Math.sin(p.rot) * p.len / 2;
      ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(p.x - hx, p.y - p.z - hy); ctx.lineTo(p.x + hx, p.y - p.z + hy); ctx.stroke();
    } else {
      ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.z - p.size / 2, p.size, p.size);
    }
  }
  drawBeacons();
  drawGlobs();
  // traçantes
  ctx.lineCap = 'round';
  for (const t of world.tracers) {
    const k = t.t / t.max;
    ctx.strokeStyle = `rgba(${t.c},${k})`; ctx.lineWidth = t.w * (t.w > 3 ? k + .3 : 1);
    ctx.beginPath(); ctx.moveTo(t.x1, t.y1 - 16); ctx.lineTo(t.x2, t.y2 - 16); ctx.stroke();
    if (t.w > 3) { ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  // explosions
  for (const b of world.booms) {
    const k = b.t / b.max;
    if (b.ring) {
      ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * .85})`; ctx.lineWidth = 1 + 4 * (1 - k);
      ctx.beginPath(); ctx.ellipse(b.x, b.y, b.R * (.25 + .85 * k), b.R * (.25 + .85 * k) * .55, 0, 0, 7); ctx.stroke();
      continue;
    }
    if (k < .3) {
      ctx.fillStyle = `rgba(255,246,214,${1 - k / .3})`; ctx.beginPath(); ctx.arc(b.x, b.y - 8, b.R * (.45 + k * 1.6), 0, 7); ctx.fill();
    }
    const g = ctx.createRadialGradient(b.x, b.y - 8, 2, b.x, b.y - 8, b.R * (.5 + k * .6));
    g.addColorStop(0, `rgba(255,220,120,${.9 * (1 - k)})`); g.addColorStop(.6, `rgba(255,120,40,${.6 * (1 - k)})`); g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y - 8, b.R * (.5 + k * .6), 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(255,190,90,${(1 - k) * .8})`; ctx.lineWidth = 5 * (1 - k);
    ctx.beginPath(); ctx.ellipse(b.x, b.y, b.R * (.3 + k), b.R * (.3 + k) * .55, 0, 0, 7); ctx.stroke();
  }
  // textes flottants
  ctx.textAlign = 'center';
  for (const p of world.pops) {
    ctx.globalAlpha = Math.min(1, p.t * 2);
    ctx.font = '12px "Black Ops One", Impact, sans-serif';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,22,24,.85)'; ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  if (mod('aveugle')) drawBlindness();
  // indicateur de pose de bloc
  if (world.state === 'play' && !player.dead && (W[player.weapon].id === 'wall' || W[player.weapon].id === 'barrel')) {
    const [tx, ty] = frontTile(); const i = ty * MW + tx;
    const ok = passable(tx, ty) && !blocks.has(i) && !doorSet.has(i);
    ctx.strokeStyle = ok ? 'rgba(242,194,48,.8)' : 'rgba(208,53,44,.7)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.strokeRect(tx * T + 2, ty * T + 2, T - 4, T - 4); ctx.setLineDash([]);
  }

  // ligne de visée quand la direction est figée
  if (world.state === 'play' && !player.dead && player.strafe && W[player.weapon].id !== 'wall' && W[player.weapon].id !== 'barrel') {
    ctx.strokeStyle = 'rgba(242,194,48,.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(player.x + player.fx * 24, player.y - 16 + player.fy * 24); ctx.lineTo(player.x + player.fx * 96, player.y - 16 + player.fy * 96); ctx.stroke(); ctx.setLineDash([]);
  }

  // vignette
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const pulse = player.hp < LOW_HP && !player.dead ? (.25 + .15 * Math.sin(S.time * 6)) : 0;
  const hurt = Math.max(0, player.hurtT) * 1.6 + pulse;
  if (hurt > .01) {
    const g = ctx.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * .3, cv.width / 2, cv.height / 2, Math.max(cv.width, cv.height) * .7);
    g.addColorStop(0, 'rgba(160,20,16,0)'); g.addColorStop(1, `rgba(160,20,16,${Math.min(.7, hurt)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
  }
}
