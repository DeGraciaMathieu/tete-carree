// Score et déblocage des armes.
import { sfx } from '../audio/sfx.js';
import { W } from '../config.js';
import { banner } from '../render/hud.js';
import { ammoOnUnlock, weaponsToUnlock } from '../rules/unlock.js';
import { S, ammo, unlocked } from '../state/world.js';
import { $ } from '../util.js';

export function addScore(n) {
  S.score += n;
  for (const i of weaponsToUnlock(S.score, unlocked)) {
    unlocked[i] = true; ammo[i] = ammoOnUnlock(i);
    banner('Nouvelle arme', `${W[i].name} · touche ${i + 1}`);
    sfx('unlock');
    const el = $('slot' + i); if (el) { el.classList.remove('new'); void el.offsetWidth; el.classList.add('new'); }
  }
}
