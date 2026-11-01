// Comptoir : articles permis, tirage de l'étale pondéré par rareté, prix du réassort, cartes louables.
import { MODS, RAR, RENT_EXCLUDED, RESTOCK_COST, RESTOCK_STEP, SHOP_ITEMS, SHOP_SLOTS, W } from '../config.js';
import { excluded } from './cards.js';
import { isGun, modLevel } from './modifiers.js';
import { firstWave } from './waves.js';

// Réassort : RESTOCK_COST, puis RESTOCK_STEP de plus à chaque réassort de la même visite.
export function restockCost(restocks) { return RESTOCK_COST + RESTOCK_STEP * restocks; }

// Cartes louables d'une rareté : niveau max pas atteint, ni exclue par les cartes possédées, ni bannie, sans effet immédiat.
export function rentable(mods, banned, rar) {
  return MODS.filter(m => m.rar === rar && modLevel(mods, m.id) < m.max && !excluded(m, mods) && !banned.includes(m.id) && !RENT_EXCLUDED.includes(m.id));
}

// Armes (ids) qu'un article peut viser. ctx : unlocked, ammo, special (arme de Spécialiste, -1 sans le pacte), mods.
export function weaponsFor(target, ctx) {
  const out = [];
  for (let i = 0; i < W.length; i++) {
    const id = W[i].id;
    if (!ctx.unlocked[i] || (ctx.special >= 0 && ctx.special !== i)) continue;
    if (target === 'gun' && isGun(id)) out.push(id);
    if (target === 'spread' && (id === 'uzi' || id === 'shotgun')) out.push(id);
    if (target === 'ammo' && ctx.ammo[i] !== Infinity && (W[i].refill > 0 || (i === 0 && modLevel(ctx.mods, 'mitraille')))) out.push(id);
  }
  return out;
}
// Cibles possibles d'un article (armes ou cartes louées), null s'il ne vise rien.
function targetsOf(item, ctx) {
  if (!item.target) return null;
  return item.target === 'rent' ? rentable(ctx.mods, ctx.banned, item.card).map(m => m.id) : weaponsFor(item.target, ctx);
}

// Article proposable. ctx : mods, buffs (effets actifs), wave (vague qui vient), unlocked, ammo, special, banned.
// Un effet encore actif ne se propose pas une seconde fois ; une seule carte louée à la fois.
export function itemAllowed(item, ctx) {
  const mods = ctx.mods, special = ctx.special >= 0;
  if (item.pacts && !item.pacts.some(id => modLevel(mods, id))) return false;
  if (ctx.buffs[item.id] || (item.target === 'rent' && ctx.buffs.rent)) return false;
  if (item.id === 'roulade' && modLevel(mods, 'entrave')) return false;
  if (item.fam === 'ammo' && special) return false; // l'arme gardée est infinie
  if (item.id === 'plein' && !weaponsFor('ammo', ctx).length) return false;
  if (item.id === 'appat' && ctx.wave < firstWave('a')) return false;
  if (item.id === 'tete' && ctx.wave < firstWave('a') && !ctx.buffs.appat) return false;
  const t = targetsOf(item, ctx);
  return !t || t.length > 0;
}

// Étale : SHOP_SLOTS articles distincts, pondérés par rareté (poids de RAR), chacun avec sa cible tirée au hasard.
export function rollStall(ctx, rng) {
  const pool = SHOP_ITEMS.filter(it => itemAllowed(it, ctx)), out = [];
  while (out.length < SHOP_SLOTS && pool.length) {
    const tot = pool.reduce((a, it) => a + RAR[it.rar].w, 0);
    let x = rng() * tot, k = 0;
    for (; k < pool.length - 1; k++) { x -= RAR[pool[k].rar].w; if (x <= 0) break; }
    const item = pool.splice(k, 1)[0], t = targetsOf(item, ctx);
    out.push({ item, target: t ? t[rng() * t.length | 0] : null });
  }
  return out;
}
