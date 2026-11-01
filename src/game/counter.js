// Comptoir : étale de caisses entre les vagues, achats, réassort, effets retirés à la fin de la vague suivante.
import { sfx } from '../audio/sfx.js';
import { DIABLE_HP, MITRAILLE_PISTOL_AMMO, SHOP_CONTRACT_COINS, SHOP_RUSTINE_HP, VERRE_HP, W } from '../config.js';
import { tr } from '../i18n/index.js';
import { pad } from '../input/gamepad.js';
import { releaseFire } from '../input/keyboard.js';
import { cardIcon } from '../render/cardIcons.js';
import { pop } from '../render/effects.js';
import { shopIcon } from '../render/shopIcons.js';
import { restockCost, rollStall, weaponsFor } from '../rules/counter.js';
import { refillOf } from '../rules/modifiers.js';
import { canAfford, discounted, shopOpens } from '../rules/shop.js';
import { waveCounts } from '../rules/waves.js';
import { S, ammo, mod, player, rng, rollMax, unlocked, world } from '../state/world.js';
import { $, clamp } from '../util.js';

// Visite en cours : caisses de l'étale ({ item, target }), caisses vendues, réassorts payés.
// afterShop : à faire en repartant (bannière de la carte prise, qui sinon s'afficherait par-dessus le Comptoir).
let stall = [], sold = [], restocks = 0, afterShop = null;
export let shopFocus = 0;
// Harnais d'équilibrage : caisses de l'étale et caisses vendues, en lecture seule.
export const stallOptions = () => ({ stall, sold });

// Prix payé (Marchandage, Bouclier d'or) et achat permis (Crédit : jusqu'au plancher).
const price = n => discounted(n, S.mods), afford = n => canAfford(S.mods, S.money, n);
const ctx = () => ({ mods: S.mods, buffs: S.buffs, wave: S.wave + 1, unlocked, ammo, special: S.special, banned: S.banned });
const weaponIndex = id => W.findIndex(w => w.id === id);
// Attelle : vie max rendue selon les pactes possédés.
const attelleHp = () => (mod('verre') ? VERRE_HP : 0) + (mod('diable') ? DIABLE_HP : 0);

// Ouvre le Comptoir, sauf en démo, avec une bourse vide (sauf Crédit) ou sous Vœu de pauvreté. Vrai s'il s'est ouvert ; sinon `after` est fait tout de suite.
export function openShop(after = null) {
  if (world.demo || !shopOpens(S.mods, S.money)) { if (after) after(); return false; }
  afterShop = after;
  world.state = 'shop'; releaseFire();
  restocks = 0;
  $('shopWave').textContent = tr.shopWave(S.wave + 1);
  deal();
  $('shopScreen').hidden = false;
  shopFocus = 0; if (pad.on) focusItem(0);
  sfx('pickup');
  return true;
}
export function leaveShop() {
  if (world.state !== 'shop') return;
  $('shopScreen').hidden = true; world.state = 'play';
  if (afterShop) { afterShop(); afterShop = null; }
}
function deal() {
  stall = rollStall(ctx(), rng); sold = stall.map(() => false);
  renderShop();
}
export function restockShop() {
  const cost = price(restockCost(restocks));
  if (world.state !== 'shop' || !afford(cost)) return;
  S.money -= cost; restocks++;
  sfx('toss');
  deal();
  if (pad.on) focusItem(shopFocus);
}
export function buyItem(i) {
  const s = stall[i];
  if (world.state !== 'shop' || !s || sold[i] || !afford(price(s.item.price))) return;
  S.money -= price(s.item.price); sold[i] = true;
  applyItem(s.item, s.target);
  sfx('coin');
  renderShop();
  if (pad.on) focusItem(i);
}

// Immédiats : trousse, munitions. Les autres posent un effet dans S.buffs (valeur : arme visée, sinon 1 ; rent : carte louée).
function applyItem(item, target) {
  const id = item.id;
  if (id === 'trousse') { player.hp = player.maxHp; return; }
  if (id === 'pistolet') { ammo[0] += MITRAILLE_PISTOL_AMMO; return; }
  if (id === 'chargeur') { const i = weaponIndex(target); ammo[i] += refillOf(S.mods, i, S.buffs); return; }
  if (id === 'plein') { for (const w of weaponsFor('ammo', ctx())) { const i = weaponIndex(w); ammo[i] += refillOf(S.mods, i, S.buffs); } return; }
  S.buffsVer++;
  if (item.target === 'rent') { S.buffs.rent = target; S.mods[target] = mod(target) + 1; return; } // une seule carte louée à la fois
  S.buffs[id] = item.target ? target : 1;
  if (id === 'rustine') player.maxHp += SHOP_RUSTINE_HP;
  if (id === 'attelle') { S.buffs.attelle = attelleHp(); player.maxHp += S.buffs.attelle; }
  if (id === 'roulade') player.rollCharges = Math.min(rollMax(), player.rollCharges + 1);
}

// Fin de vague : Contrat payé sans coup encaissé, puis tous les effets retirés (carte louée rendue, vie max reprise).
export function endShopEffects() {
  const b = S.buffs;
  if (b.contrat && !S.waveHurt && !player.dead) { S.money += SHOP_CONTRACT_COINS; pop(player.x, player.y - 78, tr.contractPaid(SHOP_CONTRACT_COINS), '#e8b23a'); }
  if (b.rent) { S.mods[b.rent]--; if (!S.mods[b.rent]) delete S.mods[b.rent]; }
  const lost = (b.rustine ? SHOP_RUSTINE_HP : 0) + (b.attelle || 0);
  S.buffs = {}; S.buffsVer++;
  if (lost) { player.maxHp -= lost; player.hp = Math.min(player.hp, player.maxHp); }
  player.rollCharges = Math.min(player.rollCharges, rollMax());
}

// Libellé de la cible d'une caisse : nom de l'arme ou de la carte louée.
const targetName = s => !s.target ? '' : s.item.target === 'rent' ? tr.cards[s.target].name : tr.weapons[s.target].name;
// Famille affichée : pour un contre-pacte, les pactes possédés qui le permettent.
const famLabel = item => item.pacts ? tr.counterPact(item.pacts.filter(id => mod(id)).map(id => tr.cards[id].name).join(' · ')) : tr.shopFam[item.fam];
const coinPrice = n => `<i class="coinico" aria-hidden="true"></i>${n}`;
function itemHtml(s, i) {
  const t = tr.shop[s.item.id], arg = s.item.id === 'attelle' ? attelleHp() : targetName(s), poor = !sold[i] && !afford(price(s.item.price));
  const icon = s.item.target === 'rent' ? `<span class="rent">${cardIcon(s.target)}</span>` : shopIcon(s.item.id);
  return `<button class="item f-${s.item.fam}${sold[i] ? ' sold' : poor ? ' poor' : ''}" type="button" data-i="${i}"${sold[i] || poor ? ' aria-disabled="true"' : ''}>`
    + `<span class="ifam">${famLabel(s.item)}</span>`
    + `<span class="crate" aria-hidden="true"><span class="top"></span><span class="face">${icon}</span></span>`
    + `<span class="iname">${t.name}</span><span class="idesc">${t.desc(arg)}</span>`
    + `<span class="price">${price(s.item.price) ? coinPrice(price(s.item.price)) : tr.free}</span>`
    + (sold[i] ? `<span class="stamp">${tr.sold}</span>` : '') + `<span class="mkey only-desk">${i + 1}</span></button>`;
}
// Bourse, caisses, prix du réassort, et composition de la vague si l'Éclaireur a été acheté.
function renderShop() {
  $('shopPurse').textContent = S.money; $('shopPurse').parentElement.classList.toggle('debt', S.money < 0);
  $('stall').innerHTML = stall.length ? stall.map(itemHtml).join('') : `<p class="pickhint">${tr.shopEmpty}</p>`;
  const cost = price(restockCost(restocks));
  $('restockPrice').innerHTML = coinPrice(cost);
  $('restockBtn').disabled = !afford(cost);
  $('shopScout').hidden = !S.buffs.eclaireur;
  if (S.buffs.eclaireur) $('shopScout').textContent = tr.forecast(waveCounts(S.wave + 1, S.mods, S.buffs));
}
// Manette : caisse en focus.
export function focusItem(i) {
  const items = $('stall').querySelectorAll('.item'); if (!items.length) return;
  shopFocus = clamp(i, 0, items.length - 1);
  for (let k = 0; k < items.length; k++) items[k].classList.toggle('focus', k === shopFocus);
  try { items[shopFocus].focus({ preventScroll: false }); } catch (e) {}
}
