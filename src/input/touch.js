// Contrôles tactiles : deux sticks virtuels, boutons roulade et arme.
import { audio } from '../audio/sfx.js';
import { STICK_RADIUS } from '../config.js';
import { tryRoll } from '../game/player.js';
import { cycleWeapon } from '../game/weapons.js';
import { world } from '../state/world.js';
import { $ } from '../util.js';

export const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
export const aim = { id: null, ox: 0, oy: 0, x: 0, y: 0 };

// tactile
export const root = document.documentElement;
if (matchMedia('(pointer: coarse)').matches) root.classList.add('is-touch');
addEventListener('touchstart', () => root.classList.add('is-touch'), { passive: true, once: true });
function bindStick(zoneId, baseId, knobId, st) {
  const zone = $(zoneId), base = $(baseId), knob = $(knobId);
  zone.addEventListener('pointerdown', e => {
    e.preventDefault(); audio();
    if (st.id !== null) return;
    st.id = e.pointerId; st.ox = e.clientX; st.oy = e.clientY; st.x = st.y = 0;
    try { zone.setPointerCapture(e.pointerId); } catch (_) {}
    base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px'; base.style.opacity = 1; knob.style.transform = '';
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== st.id) return;
    let dx = e.clientX - st.ox, dy = e.clientY - st.oy; const l = Math.hypot(dx, dy), M = STICK_RADIUS;
    if (l > M) { dx *= M / l; dy *= M / l; }
    st.x = dx / M; st.y = dy / M;
    knob.style.transform = `translate(${dx}px,${dy}px)`;
  });
  const end = e => { if (e.pointerId !== st.id) return; st.id = null; st.x = st.y = 0; base.style.opacity = 0; };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
}
bindStick('stickZone', 'stickBase', 'stickKnob', stick);
bindStick('aimZone', 'aimBase', 'aimKnob', aim);
$('swapBtn').addEventListener('pointerdown', e => { e.preventDefault(); if (world.state === 'play') cycleWeapon(1); });
$('rollBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); tryRoll(); });
