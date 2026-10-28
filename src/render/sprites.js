// Dessin des personnages : joueur, armes, zombies, diables, gonflés, coureurs, cracheurs, blindés, acide.
import { ROLL, W } from '../config.js';
import { ctx } from './canvas.js';
import { isVoid } from '../state/arena.js';
import { S, frenzy, player, rollCooldown, rollMax, world } from '../state/world.js';
import { rnd } from '../util.js';

const PAL = {
  p: { shirt: '#2f5d8a', top: '#4177ab', pants: '#262a31', skin: '#e2b48a', hairTop: '#4f3322', hair: '#5a3b26', arm: '#2a527a', eye: '#1a1a1a', stain: null },
  z: { shirt: '#7b8a6c', top: '#8f9e7f', pants: '#454a40', skin: '#b7c49c', hairTop: '#9fac86', hair: '#8a976f', arm: '#b7c49c', eye: '#c3271e', stain: '#7a1d17' },
  d: { shirt: '#9e1f1a', top: '#c0302a', pants: '#3e0f0d', skin: '#c4362d', hairTop: '#a52a22', hair: '#a52a22', arm: '#c4362d', eye: '#ffd23a', stain: null },
};
export function drawChar(e, kind) {
  const P = PAL[kind], fl = e.flash > 0, c = k => fl ? '#ffffff' : P[k];
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y));
  if (kind === 'd') ctx.scale(1.15, 1.15);
  ctx.fillStyle = 'rgba(20,22,24,.28)'; ctx.beginPath(); ctx.ellipse(0, 1, 11, 4.5, 0, 0, 7); ctx.fill();
  const mv = e.moving !== false, ph = e.walk || 0;
  const bob = mv ? Math.abs(Math.sin(ph)) * 1.4 : 0, st = mv ? Math.sin(ph) * 3 : 0;
  let fx = e.fx, fy = e.fy; const fl2 = Math.hypot(fx, fy) || 1; fx /= fl2; fy /= fl2;
  const back = fy < -.35;
  // jambes
  ctx.fillStyle = c('pants');
  ctx.fillRect(-6, -9 - Math.max(0, st), 5, 9); ctx.fillRect(1, -9 - Math.max(0, -st), 5, 9);
  const arms = () => {
    ctx.lineCap = 'round';
    if (kind === 'p') {
      const sx = fx * 4, sy = -17 - bob, hx = fx * 11, hy = -16 - bob + fy * 5;
      ctx.strokeStyle = c('arm'); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = fl ? '#fff' : '#1c1e21'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(fx * 19, -16 - bob + fy * 9); ctx.stroke();
      if (player.muzzle > 0 && e === player) {
        ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(fx * 22, -16 - bob + fy * 11, 4 + Math.random() * 3, 0, 7); ctx.fill();
      }
    } else {
      const px = -fy * 5, py = fx * 3, sw = Math.sin(ph * .7) * 2;
      ctx.strokeStyle = c('arm'); ctx.lineWidth = 3.5;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(px * s, -18 - bob + py * s); ctx.lineTo(px * s + fx * 13, -18 - bob + py * s + fy * 7 + sw * s); ctx.stroke();
      }
    }
  };
  if (back) arms();
  // torse
  ctx.fillStyle = c('shirt'); ctx.fillRect(-8, -22 - bob, 16, 14);
  ctx.fillStyle = c('top'); ctx.fillRect(-8, -24 - bob, 16, 2);
  if (P.stain && !fl) { ctx.fillStyle = P.stain; ctx.fillRect(-3, -17 - bob, 6, 4); ctx.fillRect(2, -21 - bob, 3, 2); }
  // tête
  ctx.fillStyle = back ? c('hair') : c('skin'); ctx.fillRect(-7, -35 - bob, 14, 12);
  ctx.fillStyle = c('hairTop'); ctx.fillRect(-7, -39 - bob, 14, 4);
  if (kind === 'p' && !back) { ctx.fillStyle = c('hair'); ctx.fillRect(-7, -35 - bob, 14, 3); }
  if (!back) {
    const ex = Math.round(fx * 3);
    ctx.fillStyle = fl ? '#fff' : P.eye;
    if (Math.abs(fx) > .9) ctx.fillRect(ex > 0 ? 2 : -4, -30 - bob, 2, 3);
    else { ctx.fillRect(-4 + ex, -30 - bob, 2, 3); ctx.fillRect(2 + ex, -30 - bob, 2, 3); }
    if (kind === 'z' && !fl) { ctx.fillStyle = '#5b2420'; ctx.fillRect(-2 + ex, -26 - bob, 4, 1); }
  }
  if (kind === 'd') {
    ctx.fillStyle = fl ? '#fff' : '#efe2c4';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 7, -39 - bob); ctx.lineTo(s * 4, -39 - bob); ctx.lineTo(s * 7, -46 - bob); ctx.fill(); }
  }
  if (!back) arms();
  ctx.restore();
}
export function drawAcidGround() {
  for (const p of world.puddles) {
    const grow = Math.min(1, (p.max - p.t) / .15), fade = Math.min(1, p.t / .8), r = p.r * grow;
    ctx.fillStyle = `rgba(110,160,40,${.5 * fade})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * .6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(182,224,74,${.55 * fade})`; ctx.beginPath(); ctx.ellipse(p.x - 3, p.y - 1, r * .62, r * .36, 0, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(232,250,170,${.6 * fade})`; ctx.beginPath(); ctx.ellipse(p.x - 7, p.y - 3, r * .18, r * .1, 0, 0, 7); ctx.fill();
    ctx.lineWidth = 1;
    for (let j = 0; j < 3; j++) {
      const ph = (S.time * 1.7 + j * .37 + p.x * .01) % 1;
      const bx = p.x + Math.sin(j * 2.1 + p.y) * r * .5, by = p.y + Math.cos(j * 1.3 + p.x) * r * .25;
      ctx.strokeStyle = `rgba(232,250,170,${(1 - ph) * .8 * fade})`;
      ctx.beginPath(); ctx.arc(bx, by, 1 + ph * 3, 0, 7); ctx.stroke();
    }
  }
  for (const g of world.globs) {
    const k = Math.min(1, g.t / g.T), rr = 24 - 12 * k;
    ctx.strokeStyle = `rgba(182,224,74,${.35 + .5 * k})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(g.x1, g.y1, rr, rr * .55, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(20,22,24,.25)'; ctx.beginPath(); ctx.ellipse(g.x, g.y, 5, 2.2, 0, 0, 7); ctx.fill();
  }
}
export function drawGlobs() {
  for (const g of world.globs) {
    const y = g.y - g.z;
    ctx.fillStyle = '#7fae3a'; ctx.beginPath(); ctx.arc(g.x, y + .8, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#9ed14a'; ctx.beginPath(); ctx.arc(g.x, y, 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#e6f7a8'; ctx.beginPath(); ctx.arc(g.x - 1.5, y - 1.5, 1.6, 0, 7); ctx.fill();
  }
}
/* Blindé : zombie en tenue anti-émeute, casque à visière et bouclier en polycarbonate */
export function drawArmored(e) {
  const fl = e.flash > 0, C = c => fl ? '#ffffff' : c;
  const R = (c, x, y, w, h) => { ctx.fillStyle = C(c); ctx.fillRect(x, y, w, h); };
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y)); ctx.scale(1.08, 1.08);
  ctx.fillStyle = 'rgba(20,22,24,.32)'; ctx.beginPath(); ctx.ellipse(0, 1, 13, 5, 0, 0, 7); ctx.fill();
  const ph = e.walk || 0, st = Math.sin(ph) * 2.2, bob = Math.abs(Math.sin(ph)) * .8;
  let fx = e.fx, fy = e.fy; const fn = Math.hypot(fx, fy) || 1; fx /= fn; fy /= fn;
  const back = fy < -.4, front = fy > .4, side = !back && !front, sx = fx >= 0 ? 1 : -1, U = -bob;
  const hasShield = e.shield > 0, wear = e.shieldMax ? 1 - e.shield / e.shieldMax : 0;
  const shield = () => {
    if (!hasShield) return;
    const sf = e.shieldFlash > 0;
    const glass = sf ? 'rgba(255,255,255,.9)' : 'rgba(150,172,192,.62)', rim = '#3a4556';
    let x, y = -32 + U, w, h = 28;
    if (side) { x = sx > 0 ? 7 : -11; w = 4; }
    else { x = -11 + fx * 4; w = 22; }
    ctx.fillStyle = glass; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = fl ? '#fff' : rim; ctx.lineWidth = 1.6; ctx.strokeRect(x - .3, y - .3, w + .6, h + .6);
    if (!side) {
      ctx.fillStyle = 'rgba(20,24,30,.55)'; ctx.fillRect(x, y + 4, w, 3);
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x + 2, y + 1, 2, h - 2);
      ctx.fillStyle = '#d9b23a'; ctx.fillRect(x, y + h - 5, w, 2);
      if (wear > .33) {
        ctx.strokeStyle = 'rgba(30,36,44,.8)'; ctx.lineWidth = 1; ctx.beginPath();
        ctx.moveTo(x + 6, y + 9); ctx.lineTo(x + 10, y + 15); ctx.lineTo(x + 8, y + 21);
        if (wear > .66) { ctx.moveTo(x + 15, y + 8); ctx.lineTo(x + 12, y + 14); ctx.lineTo(x + 17, y + 19); ctx.moveTo(x + 10, y + 15); ctx.lineTo(x + 15, y + 15); }
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + (sx > 0 ? 2.5 : 0), y + 1, 1.5, h - 2);
    }
  };
  if (back) shield();
  for (const [x, lift] of [[-6.5, Math.max(0, st)], [1.5, Math.max(0, -st)]]) {
    R('#232a35', x, -11 - lift, 5, 10);
    R('#14171c', x - .5, -3.5 - lift, 6, 3.5);
  }
  if (side && hasShield) shield();
  R('#2b3442', -8.5, -25 + U, 17, 15);
  R('#1f2530', -7, -23 + U, 14, 10);
  R('#3a4556', -10, -26 + U, 5, 5); R('#3a4556', 5, -26 + U, 5, 5);
  R('#14171c', -8.5, -11.5 + U, 17, 2);
  if (!hasShield || back) {
    ctx.lineCap = 'round'; ctx.strokeStyle = C('#2b3442'); ctx.lineWidth = 4;
    for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s2 * 8, -22 + U); ctx.lineTo(s2 * 9 + fx * 5, -12 + U + fy * 2); ctx.stroke(); }
    ctx.fillStyle = C('#a9b49a'); for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.arc(s2 * 9 + fx * 5, -12 + U + fy * 2, 2.2, 0, 7); ctx.fill(); }
  }
  // casque et visière
  R('#a9b49a', -6, -31 + U, 12, 6);
  R('#1c2028', -7.5, -40 + U, 15, 10);
  R('#2c323c', -7.5, -40 + U, 15, 2.5);
  if (!back) {
    const ex = Math.round(fx * 2.5);
    ctx.fillStyle = 'rgba(110,140,165,.8)'; ctx.fillRect(-6.5 + ex * .5, -34 + U, 13, 4.5);
    R('#c3271e', -4 + ex, -33 + U, 2, 2); R('#c3271e', 2 + ex, -33 + U, 2, 2);
    R('#3a1a14', -2 + ex, -27.5 + U, 4, 1.5);
  } else R('#2c323c', -7.5, -32 + U, 15, 2);
  if (front && hasShield) shield();
  ctx.restore();
}
export function drawSpitter(e) {
  const fl = e.flash > 0, C = c => fl ? '#ffffff' : c;
  const R = (c, x, y, w, h) => { ctx.fillStyle = C(c); ctx.fillRect(x, y, w, h); };
  const E = (c, x, y, rx, ry) => { ctx.fillStyle = C(c); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); };
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y));
  ctx.fillStyle = 'rgba(20,22,24,.28)'; ctx.beginPath(); ctx.ellipse(0, 1, 10, 4.2, 0, 0, 7); ctx.fill();
  const ph = e.walk || 0, st = Math.sin(ph) * 2.5, bob = Math.abs(Math.sin(ph));
  let fx = e.fx, fy = e.fy; const fn = Math.hypot(fx, fy) || 1; fx /= fn; fy /= fn;
  const back = fy < -.4, U = -bob;
  const w = e.wind > 0 ? 1 - e.wind / .6 : 0;
  const lean = -w * 3, ox = fx * (2 + lean), oy = fy * (1 + lean * .5);
  const skin = '#9d8fa6', skinD = '#857890';
  R(skin, -5, -9 - Math.max(0, st), 3.5, 9); R(skin, 1.5, -9 - Math.max(0, -st), 3.5, 9);
  R(skinD, -5.5, -2 - Math.max(0, st), 4.5, 2); R(skinD, 1, -2 - Math.max(0, -st), 4.5, 2);
  const arms = () => {
    ctx.lineCap = 'round'; ctx.strokeStyle = C(skin); ctx.lineWidth = 2.6;
    for (const sd of [-1, 1]) {
      const sw = Math.sin(ph + (sd > 0 ? 0 : 3)) * 2;
      ctx.beginPath(); ctx.moveTo(sd * 6 + ox * .5, -21 + U); ctx.lineTo(sd * 7.5 + ox * .5 + fx * sw, -11 + U - w * 3); ctx.stroke();
    }
  };
  if (back) arms();
  R('#d9d4c6', -7 + ox * .4, -23 + U, 14, 13);
  R('#cfc9b9', -8 + ox * .4, -12 + U, 16, 3.5);
  R('#bdb6a5', -7 + ox * .4, -23 + U, 14, 2);
  if (back) { R(skin, -2 + ox * .4, -23 + U, 4, 6); R('#8f897b', -.5 + ox * .4, -17 + U, 1, 7); }
  else { R('#8aa63a', -3 + ox * .4, -18 + U, 3, 2.5); R('#7a1d17', 2 + ox * .4, -15 + U, 2, 3); }
  const hx = ox, hy = -32 + U + oy;
  R(skin, -6 + hx, hy, 12, 10); R(skinD, -6 + hx, hy, 12, 2.5);
  R('#4a4250', -4 + hx, hy - 1.5, 2, 2); R('#4a4250', 1 + hx, hy - 1, 3, 1.5);
  if (!back) {
    const sr = 3.5 + w * 3.5 + Math.sin(S.time * 6 + e.x) * .4;
    E('#7fae3a', hx + fx * 1.5, hy + 11, sr + .8, sr * .8 + .6);
    E(w > 0 ? '#c8f26a' : '#9ed14a', hx + fx * 1.5, hy + 10.5, sr, sr * .8);
    E('#e6f7a8', hx + fx * 1.5 - sr * .35, hy + 9.5, sr * .3, sr * .22);
    const ex = Math.round(fx * 2.5) + hx;
    R('#e6f25a', -4 + ex, hy + 3, 2, 2); R('#e6f25a', 2 + ex, hy + 3, 2, 2);
    R('#2a1a22', -2.5 + ex, hy + 6, 5, 2 + w * 1.5);
    R('#9ed14a', ex + 1, hy + 8 + w, 1.2, 2 + Math.sin(S.time * 4 + e.x));
  } else R('#4a4250', -5 + hx, hy + 2, 10, 2);
  if (!back) arms();
  if (w > 0 && !fl) { ctx.fillStyle = `rgba(182,224,74,${.22 * w})`; ctx.beginPath(); ctx.arc(hx, hy + 9, 10 + w * 5, 0, 7); ctx.fill(); }
  ctx.restore();
}
export function drawRunner(e) {
  const fl = e.flash > 0, C = c => fl ? '#ffffff' : c;
  const R = (c, x, y, w, h) => { ctx.fillStyle = C(c); ctx.fillRect(x, y, w, h); };
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y));
  ctx.fillStyle = 'rgba(20,22,24,.26)'; ctx.beginPath(); ctx.ellipse(0, 1, 9, 3.8, 0, 0, 7); ctx.fill();
  const ph = e.walk || 0, st = Math.sin(ph) * 4, bob = Math.abs(Math.sin(ph)) * 2;
  let fx = e.fx, fy = e.fy; const fn = Math.hypot(fx, fy) || 1; fx /= fn; fy /= fn;
  const back = fy < -.4, U = -bob, lean = fx * 3, tl = lean * .6, hl = lean * 1.3;
  // jambes, grande foulée
  for (const [x, lift] of [[-5, Math.max(0, st)], [1, Math.max(0, -st)]]) {
    R('#c86a2a', x, -11 - lift, 4, 9);
    R('#f0ead8', x + (x < 0 ? 0 : 3), -11 - lift, 1, 9);
    R('#e2ddd0', x - .5, -2.5 - lift, 5, 2.5);
  }
  const arms = () => {
    ctx.lineCap = 'round'; ctx.strokeStyle = C('#c9c6bb'); ctx.lineWidth = 3;
    for (const s of [-1, 1]) {
      const sw = Math.sin(ph + (s > 0 ? 0 : Math.PI)) * 6;
      const ax = s * 6 + tl, ay = -19 + U;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + fx * sw, ay + 6 + fy * sw * .5); ctx.stroke();
    }
  };
  if (back) arms();
  // torse : veste de survêtement déchirée
  R('#c86a2a', -6 + tl, -22 + U, 12, 12);
  R('#a8561f', -6 + tl, -22 + U, 12, 2.5);
  R('#f0ead8', -6 + tl, -22 + U, 1.5, 12); R('#f0ead8', 4.5 + tl, -22 + U, 1.5, 12);
  if (!back) { R('#c9c6bb', 1 + tl, -15 + U, 3, 2.5); R('#7a1d17', -3 + tl, -18 + U, 3, 2); }
  // tête projetée vers l'avant
  R('#c9c6bb', -6 + hl, -33 + U, 12, 10);
  R('#6f6a60', -6 + hl, -35 + U, 12, 3); R('#c9c6bb', -1 + hl, -35 + U, 3, 1.5);
  if (back) { R('#6f6a60', -6 + hl, -32 + U, 12, 5); }
  else {
    const ex = Math.round(fx * 2.5) + hl;
    R(fl ? '#fff' : '#ff4a2a', -4 + ex, -30 + U, 2, 2); R(fl ? '#fff' : '#ff4a2a', 2 + ex, -30 + U, 2, 2);
    R('#3a1a14', -2 + ex, -27 + U, 4, 3); R('#e2ddd0', -2 + ex, -27 + U, 4, 1);
  }
  if (!back) arms();
  ctx.restore();
}
export function drawBloater(e) {
  const fl = e.flash > 0, fuse = e.fuse !== undefined, blink = fuse && ((e.fuse * 14) | 0) % 2 === 0;
  const C = c => fl ? '#ffffff' : c;
  const R = (c, x, y, w, h) => { ctx.fillStyle = C(c); ctx.fillRect(x, y, w, h); };
  const E = (c, x, y, rx, ry) => { ctx.fillStyle = C(c); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); };
  const skin = blink ? '#e0784a' : '#c9b86a', skinDark = blink ? '#b85a34' : '#a99a52';
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y));
  ctx.fillStyle = 'rgba(20,22,24,.3)'; ctx.beginPath(); ctx.ellipse(0, 1, 15, 6, 0, 0, 7); ctx.fill();
  const ph = e.walk || 0, st = Math.sin(ph) * 2.5, bob = Math.abs(Math.sin(ph)) * 1.2;
  const swell = fuse ? (1 - Math.max(0, e.fuse) / .7) * .35 : 0;
  const p = 1 + Math.sin(S.time * 4 + e.x * .1) * .04 + swell + (fuse ? rnd(.03) : 0);
  let fx = e.fx, fy = e.fy; const fn = Math.hypot(fx, fy) || 1; fx /= fn; fy /= fn;
  const back = fy < -.4;
  // jambes courtes
  R('#5a4a3a', -8, -8 - Math.max(0, st), 6, 8); R('#5a4a3a', 2, -8 - Math.max(0, -st), 6, 8);
  R('#463a2d', -8, -2 - Math.max(0, st), 6, 2); R('#463a2d', 2, -2 - Math.max(0, -st), 6, 2);
  // bras ballants
  ctx.lineCap = 'round'; ctx.strokeStyle = C(skinDark); ctx.lineWidth = 4.5;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 11 * p, -25 - bob); ctx.lineTo(s * 14 * p + fx * 4, -13 - bob + fy * 2 + Math.sin(ph + s) * 1.5); ctx.stroke();
  }
  // ventre
  const cy = -20 - bob;
  E(skin, 0, cy, 12.5 * p, 12 * p);
  if (!fl) { ctx.fillStyle = 'rgba(90,70,30,.22)'; ctx.beginPath(); ctx.ellipse(0, cy + 6 * p, 10 * p, 5 * p, 0, 0, 7); ctx.fill(); }
  R('#6b6f4a', -8 * p, cy - 10 * p, 16 * p, 3.5);
  R('#585c3c', -8 * p, cy - 10 * p + 2.5, 5 * p, 3);
  ctx.strokeStyle = C('#7a4a6a'); ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-9 * p, cy + 1 * p); ctx.lineTo(-5 * p, cy + 3 * p); ctx.lineTo(-2 * p, cy + 1 * p);
  ctx.moveTo(8 * p, cy - 4 * p); ctx.lineTo(5 * p, cy); ctx.lineTo(7 * p, cy + 4 * p);
  ctx.stroke();
  for (const [x, y, r] of back ? [[-4, -3, 2.4], [5, 2, 3], [0, 7, 2]] : [[-5, -2, 2.6], [4, 3, 3.2], [6, -6, 2], [-3, 6, 2.2]]) {
    E('#8fd14f', x * p, cy + y * p, r * p, r * p);
    E('#d4f59a', x * p - r * .35, cy + y * p - r * .35, r * .35, r * .35);
  }
  // petite tête
  const hy = cy - 12 * p - 7;
  R('#bfc28a', -5, hy, 10, 9); R('#9fa36e', -5, hy, 10, 2.5);
  if (!back) {
    const ex = Math.round(fx * 2);
    R(fl ? '#fff' : '#c3271e', -3.5 + ex, hy + 3, 2, 2); R(fl ? '#fff' : '#c3271e', 1.5 + ex, hy + 3, 2, 2);
    R('#3a1a14', -2 + ex, hy + 6, 4, 2.2);
    R('#8fd14f', ex, hy + 8, 1.2, 2.5 + Math.sin(S.time * 3 + e.x) * .8);
  }
  ctx.restore();
}
function drawRollBall(cx, cy, spin, sgn, ghost) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sgn, 1); ctx.rotate(spin);
  if (ghost) {
    ctx.fillStyle = '#6f9fd0'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill();
    ctx.fillStyle = '#c23a2e'; ctx.fillRect(3, -10, 8, 2.5);
    ctx.restore(); return;
  }
  const fl = player.flash > 0, C = c => fl ? '#ffffff' : c;
  const R = (c, x, y, w, h) => { ctx.fillStyle = C(c); ctx.fillRect(x, y, w, h); };
  R('#6b4a2e', -12, -6, 5, 12); R('#7d5a38', -12, -6, 5, 2.5); R('#4d5636', -12.5, 4, 6, 3);
  ctx.fillStyle = C('#34679c'); ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, 7); ctx.fill();
  ctx.fillStyle = C('#4a82ba'); ctx.beginPath(); ctx.arc(0, 0, 9.5, -2.6, -1.2); ctx.lineTo(0, 0); ctx.fill();
  ctx.fillStyle = C('#2a2e33'); ctx.beginPath(); ctx.arc(1, 1, 6.5, -.5, 2.1); ctx.lineTo(1, 1); ctx.fill();
  R('#4d5636', 1, 2.5, 8, 5); R('#5d6842', 1, 2.5, 8, 1.3); R('#2b221b', 8, 1, 4, 7);
  R('#e2b48a', 2.5, -12, 8.5, 8.5); R('#cf9f7b', 2.5, -5.5, 8.5, 2);
  R('#4f3322', 2.5, -13, 8.5, 3); R('#c23a2e', 2.5, -10, 8.5, 2.2);
  if (!fl) { R('#1a1a1a', 8, -8, 1.5, 2); }
  ctx.strokeStyle = C('#c23a2e'); ctx.lineWidth = 1.6; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(2.5, -9); ctx.lineTo(-2.5, -12.5); ctx.moveTo(2.5, -8.5); ctx.lineTo(-1.5, -9.5); ctx.stroke();
  ctx.strokeStyle = C('#34679c'); ctx.lineWidth = 4.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-3, -4); ctx.quadraticCurveTo(3, -3, 6.5, 4.5); ctx.stroke();
  ctx.fillStyle = C('#2a2522'); ctx.beginPath(); ctx.arc(6.5, 4.5, 2.2, 0, 7); ctx.fill();
  ctx.restore();
  // lumière fixe : haut éclairé, bas dans l'ombre, quelle que soit la rotation
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 7); ctx.clip();
  ctx.fillStyle = 'rgba(10,14,30,.22)'; ctx.fillRect(cx - 13, cy + 3, 26, 11);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(cx - 13, cy - 13, 26, 5);
  ctx.restore();
}
function squashed(sx, sy) {
  ctx.save(); ctx.translate(player.x, player.y); ctx.scale(sx, sy); ctx.translate(-player.x, -player.y);
  drawPlayer(player); ctx.restore();
}
export function drawPlayerState() {
  const x = player.x, y = player.y;
  if (frenzy() && !player.dead) {
    const p = .5 + .5 * Math.sin(S.time * 10);
    ctx.strokeStyle = `rgba(242,194,48,${.35 + .35 * p})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y + 1, 16 + p * 2, 7 + p, 0, 0, 7); ctx.stroke();
  }
  const blink = player.invuln > 0 && ((player.invuln * 16) | 0) % 2 === 0;
  if (blink) ctx.globalAlpha = .4;
  drawPlayerBody();
  ctx.globalAlpha = 1;
}
function drawPlayerBody() {
  const x = player.x, y = player.y;
  // jauge de recharge de la roulade, au pied du perso
  if (player.rollCd > 0 && !player.roll) {
    const k = 1 - player.rollCd / rollCooldown();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(x, y + 1, 14, 6, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
  } else if (player.rollReady > 0) {
    const k = player.rollReady / .3;
    ctx.strokeStyle = `rgba(242,194,48,${k})`; ctx.lineWidth = 2 + k * 2;
    ctx.beginPath(); ctx.ellipse(x, y + 1, 14 + (1 - k) * 6, 6 + (1 - k) * 2.5, 0, 0, 7); ctx.stroke();
  }
  if (rollMax() > 1 && !player.roll) {
    for (let i = 0; i < rollMax(); i++) {
      ctx.fillStyle = i < player.rollCharges ? '#f2c230' : 'rgba(255,255,255,.3)';
      ctx.beginPath(); ctx.arc(x - 4 + i * 8, y + 10, 2.2, 0, 7); ctx.fill();
    }
  }
  const r = player.roll;
  if (!r) { drawPlayer(player); return; }
  if (r.t < ROLL.A) {
    // anticipation : il se ramasse avant de plonger
    const k = r.t / ROLL.A;
    squashed(1 + .2 * k, 1 - .28 * k);
  } else if (r.t < ROLL.B) {
    const q = (r.t - ROLL.A) / (ROLL.B - ROLL.A), hop = Math.sin(q * Math.PI) * (r.fly ? 13 : 5);
    r.trail.forEach((g, i) => {
      ctx.globalAlpha = .08 + .22 * (i + 1) / r.trail.length;
      drawRollBall(g.x, g.y - 11 - g.h, 0, r.sgn, true);
    });
    ctx.globalAlpha = 1;
    // traits de vitesse
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (const o of [-6, 0, 6]) {
      const px = -r.dy, py = r.dx, bx = x + px * o - r.dx * 14, by = y - 11 - hop + py * o * .6 - r.dy * 7;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - r.dx * (10 + Math.abs(o)), by - r.dy * (6 + Math.abs(o) * .5)); ctx.stroke();
    }
    if (!isVoid(x, y)) { ctx.fillStyle = 'rgba(20,22,24,.28)'; ctx.beginPath(); ctx.ellipse(x, y + 1, 11 - hop * .6, 4.5 - hop * .25, 0, 0, 7); ctx.fill(); }
    drawRollBall(x, y - 11 - hop, r.dist / ROLL.R, r.sgn, false);
  } else {
    // réception : écrasé puis il se redresse avec un léger rebond
    const k = (r.t - ROLL.B) / (ROLL.D - ROLL.B);
    const sy = .78 + .22 * k + Math.sin(k * Math.PI) * .07;
    squashed(1 + (1 - sy) * .7, sy);
  }
}

/* Joueur : survivant en veste bleue, gilet tactique, sac à dos et bandana rouge */
export const GUNS = { pistol: 8, uzi: 12, rifle: 17, shotgun: 18, wall: 0, barrel: 0, grenade: 4, rocket: 16, rail: 18 };
function drawGun(id, C) {
  const R = (c, x, y, w, h) => { ctx.fillStyle = C(c); ctx.fillRect(x, y, w, h); };
  switch (id) {
    case 'pistol': R('#1c1e21', -1, -2, 9, 3.5); R('#3a3f45', 0, -2, 7, 1); R('#1c1e21', 0, 1, 3, 3.5); break;
    case 'uzi': R('#23262a', -2, -2, 11, 4); R('#3a3f45', -2, -2, 11, 1); R('#17191b', 2, 1.5, 3, 5); R('#23262a', 9, -1, 3, 2); break;
    case 'rifle': R('#5a4632', -6, -1.5, 6, 3.5); R('#23262a', 0, -2, 11, 4); R('#3a3f45', 0, -2, 11, 1); R('#17191b', 3, 1.5, 2.5, 5); R('#23262a', 11, -1, 6, 2); break;
    case 'shotgun': R('#6b4a2e', -7, -1.5, 7, 3.5); R('#23262a', 0, -2, 8, 3.5); R('#3a3e43', 8, -1.5, 10, 2); R('#7d5734', 9, .5, 5, 2); break;
    case 'rocket': R('#4f5a3a', -7, -3, 23, 6); R('#64714a', -7, -3, 23, 1.5); R('#2f3524', -8, -3.5, 2, 7); R('#2f3524', 14, -3.5, 2, 7); R('#1c1e21', 2, -5.5, 3, 2.5); R('#1c1e21', 1, 3, 2, 3); break;
    case 'rail': R('#2b3038', -4, -2.5, 19, 5); R('#3d444f', -4, -2.5, 19, 1.2); for (const x of [3, 7, 11]) R('#59d4ff', x, -3, 2, 6); R('#9be8ff', 15, -1.5, 3, 3); break;
    case 'grenade': ctx.fillStyle = C('#3f4a2c'); ctx.beginPath(); ctx.arc(2, 0, 3.2, 0, 7); ctx.fill(); R('#8a8f86', 1, -4.5, 2, 2); break;
  }
}
function drawPlayer(e) {
  const fl = e.flash > 0, C = c => fl ? '#ffffff' : c;
  const R = (c, x, y, w, h) => { ctx.fillStyle = C(c); ctx.fillRect(x, y, w, h); };
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y));
  ctx.fillStyle = 'rgba(20,22,24,.28)'; ctx.beginPath(); ctx.ellipse(0, 1, 11, 4.5, 0, 0, 7); ctx.fill();
  const mv = e.moving, ph = e.walk || 0;
  const bob = mv ? Math.abs(Math.sin(ph)) * 1.4 : 0, st = mv ? Math.sin(ph) * 3 : 0;
  let fx = e.fx, fy = e.fy; const fn = Math.hypot(fx, fy) || 1; fx /= fn; fy /= fn;
  const back = fy < -.4, front = fy > .4, side = !back && !front, sx = fx >= 0 ? 1 : -1;
  const U = -bob;
  const sway = mv ? Math.sin(ph * 1.3) * 1.5 : Math.sin(S.time * 2) * .6;

  // jambes en treillis + bottes
  for (const [x, lift] of [[-6, Math.max(0, st)], [1, Math.max(0, -st)]]) {
    R('#4d5636', x, -10 - lift, 5, 7);
    R('#5d6842', x, -10 - lift, 5, 1.5);
    R('#2b221b', x - .5, -3.5 - lift, 6, 3.5);
  }

  const weapon = W[e.weapon].id, tip = GUNS[weapon];
  const arms = () => {
    const hx = fx * 10, hy = -16 + U + fy * 5;
    const px = -fy, py = fx * .5;
    const k = Math.hypot(fx, fy * .5), a = Math.atan2(fy * .5, fx);
    if (tip) {
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); ctx.scale(k, 1);
      drawGun(weapon, C);
      if (e.muzzle > 0 && tip >= 8) {
        ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(tip + 3, 0, 3 + Math.random() * 3, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(tip + 2, 0, 2, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
    const shoulders = [[px * 6, -20 + U + py * 2], [-px * 6, -20 + U - py * 2]];
    const hands = tip ? [[hx, hy], [hx + fx * 5, hy + fy * 2.5]] : [[hx + px * 3, hy], [hx - px * 3, hy]];
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const [ax, ay] = shoulders[i], [bx, by] = hands[i];
      ctx.strokeStyle = C('#34679c'); ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.fillStyle = C('#2a2522'); ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, 7); ctx.fill();
    }
  };
  const pack = () => {
    if (back) {
      R('#6b4a2e', -6, -23 + U, 12, 12); R('#7d5a38', -6, -23 + U, 12, 3);
      R('#4f3520', -5, -16 + U, 10, 1.5); R('#d9b23a', -1, -19 + U, 2, 2);
      R('#4d5636', -7, -11.5 + U, 14, 3.5); R('#5d6842', -7, -11.5 + U, 14, 1);
    } else if (side) {
      const bx = sx > 0 ? -11 : 7;
      R('#6b4a2e', bx, -23 + U, 4, 12); R('#7d5a38', bx, -23 + U, 4, 3);
    }
  };
  const torso = () => {
    R('#34679c', -8, -24 + U, 16, 15);
    R('#4a82ba', -8, -24 + U, 16, 2.5);
    if (front) {
      R('#2a2e33', -6, -22 + U, 12, 11);
      R('#3b4148', -5, -17 + U, 4, 3.5); R('#3b4148', 1, -17 + U, 4, 3.5);
      R('#4a515a', -5, -17 + U, 4, 1); R('#4a515a', 1, -17 + U, 4, 1);
      R('#6b4a2e', -6, -23.5 + U, 2, 6); R('#6b4a2e', 4, -23.5 + U, 2, 6);
    } else if (side) {
      R('#2a2e33', -5 + sx, -22 + U, 10, 11);
      R('#3b4148', sx > 0 ? 2 : -6, -17 + U, 4, 3.5);
      R('#6b4a2e', -sx * 3 - 1, -24 + U, 2, 7);
    }
    R('#1c1e21', -8, -11 + U, 16, 2);
    if (front) R('#d9b23a', -1, -11 + U, 2, 2);
  };
  const head = () => {
    const y0 = -37 + U;
    ctx.lineCap = 'butt';
    if (back) {
      R('#4f3322', -7, y0, 14, 13); R('#5c3d28', -7, y0, 14, 3);
      R('#c99a74', -8, y0 + 7, 1, 3); R('#c99a74', 7, y0 + 7, 1, 3);
      R('#c23a2e', -7, y0 + 4, 14, 2.5); R('#9e2b22', -1.5, y0 + 4, 3, 3);
      ctx.strokeStyle = C('#c23a2e'); ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-.5, y0 + 6.5); ctx.lineTo(-2.5 + sway, y0 + 12); ctx.moveTo(.8, y0 + 6.5); ctx.lineTo(2.5 + sway, y0 + 11); ctx.stroke();
      return;
    }
    R('#e2b48a', -7, y0, 14, 13);
    R('#cf9f7b', -7, y0 + 10, 14, 3);
    R('#4f3322', -7, y0 - 1, 14, 4); R('#5c3d28', -7, y0 - 1, 14, 1.5);
    R('#c23a2e', -7, y0 + 3, 14, 2.5);
    if (front) {
      R('#4f3322', -7, y0 + 5.5, 1.5, 3.5); R('#4f3322', 5.5, y0 + 5.5, 1.5, 3.5);
      const ex = Math.round(fx * 2), po = fx > .25 ? 1.5 : fx < -.25 ? 0 : .75;
      R('#3a2a1e', -5 + ex, y0 + 5.8, 3, 1); R('#3a2a1e', 2 + ex, y0 + 5.8, 3, 1);
      R('#f4f1ea', -5 + ex, y0 + 7, 3, 2.5); R('#f4f1ea', 2 + ex, y0 + 7, 3, 2.5);
      R('#1a1a1a', -5 + ex + po, y0 + 7, 1.5, 2.5); R('#1a1a1a', 2 + ex + po, y0 + 7, 1.5, 2.5);
      R('#9a6a50', -1.5 + ex, y0 + 10.6, 3, 1);
    } else {
      const rear = sx > 0 ? -7 : 2;
      R('#4f3322', rear, y0 + 2, 5, 8);
      R('#c23a2e', rear, y0 + 3, 5, 2.5);
      R('#c99a74', sx > 0 ? -2 : .5, y0 + 6, 1.5, 3);
      const ex = sx > 0 ? 3 : -5.5;
      R('#3a2a1e', ex, y0 + 5.8, 2.5, 1);
      R('#f4f1ea', ex, y0 + 7, 2.5, 2.5); R('#1a1a1a', ex + (sx > 0 ? 1.2 : 0), y0 + 7, 1.3, 2.5);
      R('#9a6a50', sx > 0 ? 3.5 : -5.5, y0 + 10.6, 2, 1);
      R('#d4a47e', sx > 0 ? 7 : -8, y0 + 7.5, 1, 2);
      const bx = sx > 0 ? -7 : 7, trail = mv ? 2 : 0;
      ctx.strokeStyle = C('#c23a2e'); ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(bx, y0 + 4); ctx.lineTo(bx - sx * (5 + trail), y0 + 6 + sway);
      ctx.moveTo(bx, y0 + 5); ctx.lineTo(bx - sx * (4 + trail), y0 + 9 + sway);
      ctx.stroke();
    }
  };
  if (back) { arms(); torso(); pack(); head(); }
  else { pack(); torso(); head(); arms(); }
  ctx.restore();
}
