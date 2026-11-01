// Harnais d'équilibrage, côté page : pilote paramétré, écrans de choix, boucle de simulation et mesures d'une partie.
// Chargé par scripts/balance.mjs dans la page du jeu servie par Vite : il agit sur les vrais modules de src/.
import { FIREBALL_HIT_REACH, MH, MW, SHOTS, T, W } from '/src/config.js';
import { silence } from '/src/audio/sfx.js';
import { buyItem, leaveShop, restockShop, stallOptions } from '/src/game/counter.js';
import { ctl } from '/src/game/demo.js';
import { choosePick, pickOptions, rerollPick, resume, startGame, toggleBan } from '/src/game/flow.js';
import { tryRoll } from '/src/game/player.js';
import { selectWeapon } from '/src/game/weapons.js';
import { update } from '/src/loop/update.js';
import { discounted } from '/src/rules/shop.js';
import { dist, los } from '/src/state/arena.js';
import { S, ammo, player, unlocked, world } from '/src/state/world.js';
import { banIndex, bestIndex, cardScore, shopPicks, wantsReroll } from './decide.js';
import { profileById } from './profiles.js';

const DT = 1 / 60, STEPS_PER_SLICE = 240;
// Tours de boucle de suite hors de la partie (écran de choix qui ne se ferme pas) avant d'abandonner en erreur.
const MAX_IDLE = 2000;
// Boules de feu du Diable : horizon de prévision (s) et marge autour du joueur (px) en dessous de laquelle on s'écarte.
const FIRE_HORIZON = 1.2, FIRE_MARGIN = 14, FIRE_ROLL_T = .25;
// Armes que le pilote sait manier, de la préférée à la dernière (comme la démo : pas de construction ni d'explosif).
const GUNS = ['shotgun', 'rifle', 'uzi', 'pistol'].map(id => W.findIndex(w => w.id === id));

// Tirage à graine (mulberry32) : remplace Math.random pendant la partie, et sert aux décisions du pilote.
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Laisse passer les minuteurs de la page (rendus immédiats par scripts/balance.mjs).
const nextTask = () => new Promise(r => (window.__realSetTimeout || setTimeout)(r, 0));
const priceIn = id => parseInt(document.getElementById(id).textContent, 10) || 0;

let P, prng, aimTarget = null, aimSince = 0, aimErr = 0;

// Une image de pilotage : arme, déplacement (fuite, acide, boules de feu, centre, butin, dernier ennemi), visée avec délai et erreur, roulade.
function control() {
  for (const i of GUNS) if (unlocked[i] && ammo[i] > 0) { selectWeapon(i); break; }
  const shot = SHOTS[W[player.weapon].id], range = shot ? shot.speed : 400;
  let fx = 0, fy = 0, aim = null, ad = range, near = Infinity, prey = null, pd = Infinity;
  for (const e of world.enemies) {
    if (e.dead) continue;
    const dx = player.x - e.x, dy = player.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (d < pd) { pd = d; prey = e; }
    if (d < P.flee) { fx += dx / d * (1 - d / P.flee); fy += dy / d * (1 - d / P.flee); }
    if (d - e.r < near) near = d - e.r;
    if (d < ad && los(player.x, player.y, e.x, e.y)) { ad = d; aim = e; }
  }
  // flaques d'acide : s'en écarter (sauf profil qui ne les voit pas), avec l'écrasement 3/4 du test de update
  if (P.avoidAcid) for (const p of world.puddles) {
    const dx = player.x - p.x, dy = (player.y - p.y) * 1.6, d = Math.hypot(dx, dy) || 1, reach = p.r + 40;
    if (d < reach) { fx += dx / d * 1.5 * (1 - d / reach); fy += dy / d * 1.5 * (1 - d / reach); }
  }
  // boules de feu : chacune dont la trajectoire passe trop près dans les FIRE_HORIZON prochaines secondes pousse le
  // joueur perpendiculairement à sa course, du côté où il se trouve déjà ; trop proche, il roule pour s'en sortir
  let sx = 0, sy = 0, soon = false;
  if (P.fireDodge) for (const p of world.projs) {
    const rx = player.x - p.x, ry = player.y - p.y, v2 = p.vx * p.vx + p.vy * p.vy || 1;
    const t = Math.max(0, Math.min(FIRE_HORIZON, (rx * p.vx + ry * p.vy) / v2));
    const mx0 = rx - p.vx * t, my0 = ry - p.vy * t, miss = Math.hypot(mx0, my0), danger = player.r + FIREBALL_HIT_REACH + FIRE_MARGIN;
    if (t <= 0 || miss > danger) continue;
    const vl = Math.sqrt(v2), side = (p.vx * ry - p.vy * rx) >= 0 ? 1 : -1; // côté de la course où est le joueur
    const w = P.fireDodge * (1 - miss / danger + .3) * (1 - t / FIRE_HORIZON + .3);
    sx += -p.vy / vl * side * w; sy += p.vx / vl * side * w;
    if (t < FIRE_ROLL_T) soon = true;
  }
  fx += sx; fy += sy;
  const cx = MW * T / 2 - player.x, cy = MH * T / 2 - player.y, cd = Math.hypot(cx, cy) || 1, pull = P.centerPull * Math.min(1, cd / 300);
  let mx = fx + cx / cd * pull, my = fy + cy / cd * pull;
  // fin de vague : plus rien à sortir et personne en vue, on va chercher le dernier ennemi (il peut attendre au bord
  // d'une crevasse, dans une zone sans chemin jusqu'au joueur : computeField l'y fait converger)
  if (!aim && prey && S.waveActive && !S.queue.length) { mx = (prey.x - player.x) / pd; my = (prey.y - player.y) / pd; }
  // butin : la caisse ou la pièce la plus attirante, si aucun ennemi n'est trop près
  if (near > P.lootDanger) {
    let best = null, bw = 0;
    for (const p of world.pickups) { const d = Math.hypot(p.x - player.x, p.y - player.y); if (d < 260 && P.cratePull / d > bw) { bw = P.cratePull / d; best = p; } }
    if (P.coinPull) for (const c of world.coins) { const d = Math.hypot(c.x - player.x, c.y - player.y); if (d < 220 && P.coinPull / d > bw) { bw = P.coinPull / d; best = c; } }
    if (best) { const d = Math.hypot(best.x - player.x, best.y - player.y) || 1, w = bw * d; mx += (best.x - player.x) / d * w; my += (best.y - player.y) / d * w; }
  }
  const ml = Math.hypot(mx, my);
  ctl.mx = ml > .15 ? mx / ml : 0; ctl.my = ml > .15 ? my / ml : 0;
  // visée : une nouvelle cible attend `reaction` secondes, puis est visée avec une erreur d'angle tirée une fois
  if (aim !== aimTarget) { aimTarget = aim; aimSince = S.time; aimErr = (prng() * 2 - 1) * P.aimError * Math.PI / 180; }
  if (aim && S.time - aimSince >= P.reaction) {
    const a = Math.atan2(aim.y - player.y, aim.x - player.x) + aimErr;
    ctl.ax = Math.cos(a); ctl.ay = Math.sin(a);
  } else { ctl.ax = 0; ctl.ay = 0; }
  if (P.dodge && near < P.dodge && fx * fx + fy * fy > .01) tryRoll(fx, fy);
  else if (P.dodge && soon && sx * sx + sy * sy > .01) tryRoll(sx, sy);
}

// Écran des cartes : arme gardée (Spécialiste), bannissement, relances, puis la carte du profil.
async function pickScreen(run) {
  await nextTask(); // cartes retournées
  if (document.getElementById('cards').classList.contains('weapons')) {
    const offered = W.map((w, i) => i).filter(i => unlocked[i]), keep = GUNS.find(i => offered.includes(i));
    choosePick(Math.max(0, offered.indexOf(keep)));
    return;
  }
  let banned = false;
  for (let rerolls = 0; ; rerolls++) {
    const cards = pickOptions();
    const ban = banned ? -1 : banIndex(cards, P);
    if (ban >= 0 && S.money >= priceIn('banPrice')) { await pay(run, () => { toggleBan(); choosePick(ban); }); banned = true; continue; }
    const scores = cards.map(m => cardScore(m, P, prng())), best = bestIndex(scores);
    if (rerolls < 3 && wantsReroll(scores[best], P, S.money, priceIn('rerollPrice'))) { await pay(run, rerollPick); continue; }
    const taken = S.mods.sanspause ? cards : [cards[best]]; // Pas de pause : toutes les cartes sont gagnées
    for (const m of taken) run.cards.push({ id: m.id, wave: S.wave });
    choosePick(best);
    return;
  }
}
// Action payante : la dépense est comptée sur la vague en cours.
async function pay(run, act) {
  const before = S.money;
  act();
  run.spent += Math.max(0, before - S.money);
  await nextTask();
}
// Comptoir : achats du profil, un réassort s'il n'a rien trouvé, puis départ.
function shopScreen(run) {
  const price = item => discounted(item.price, S.mods);
  for (let round = 0; round < 2 && P.shop; round++) {
    const { stall, sold } = stallOptions(), picks = shopPicks(stall, sold, P, S.money, price);
    for (const i of picks) { const before = S.money; buyItem(i); if (S.money < before || !stall[i].item.price) { run.spent += before - S.money; run.buys.push({ id: stall[i].item.id, wave: S.wave + 1 }); } }
    const cost = priceIn('restockPrice');
    if (picks.length || !P.shop.restock || S.money - cost < P.shop.reserve) break;
    const before = S.money; restockShop(); run.spent += before - S.money;
  }
  leaveShop();
}

// Une partie complète : jusqu'à la mort, au plafond de vagues, ou à une vague bloquée.
export async function runGame({ seed, profile, cap, waveLimit, arena }) {
  P = profileById(profile); prng = seeded(seed * 7919 + 17); aimTarget = null;
  Math.random = seeded(seed);
  if (arena) world.arena = arena;
  startGame(); silence(true);
  world.pilot = control;
  const run = { seed, profile, wave: 0, outcome: '', cause: '', score: 0, kills: 0, time: 0, waves: [], cards: [], buys: [], unlocks: {}, spent: 0, stuck: null };
  let active = false, start = 0, kills0 = 0, money0 = 0, idle = 0;
  // fenêtre d'une vague : de son début au début de la suivante (pause comprise), pour les pièces
  const closeCoins = () => { const w = run.waves[run.waves.length - 1]; if (w) { w.earned = S.money - money0 + run.spent; w.spent = run.spent; } };
  const unlocksNow = () => { for (let i = 0; i < W.length; i++) if (unlocked[i] && W[i].unlock > 0 && !(W[i].id in run.unlocks)) run.unlocks[W[i].id] = S.wave; };
  for (;;) {
    for (let k = 0; k < STEPS_PER_SLICE && world.state === 'play'; k++) {
      update(DT);
      if (!active && S.waveActive) { closeCoins(); active = true; start = S.time; kills0 = S.kills; money0 = S.money; run.spent = 0; run.waves.push({ wave: S.wave }); }
      else if (active && !S.waveActive) {
        active = false;
        Object.assign(run.waves[run.waves.length - 1], { time: S.time - start, hp: Math.round(player.hp / player.maxHp * 100), kills: S.kills - kills0 });
        unlocksNow();
      }
      if (active && S.time - start > waveLimit) {
        const left = {}, where = [];
        for (const e of world.enemies) if (!e.dead) {
          left[e.type] = (left[e.type] || 0) + 1;
          const tx = e.x / T | 0, ty = e.y / T | 0;
          where.push({ type: e.type, tx, ty, field: Math.round(dist[ty * MW + tx]), player: [player.x / T | 0, player.y / T | 0] });
        }
        run.stuck = { left, queue: S.queue.length, where };
        run.outcome = 'bloquée'; break;
      }
      if (!active && S.wave >= cap && !player.dead) { run.outcome = 'plafond'; break; }
    }
    if (run.outcome) break;
    if (world.state === 'over') { run.outcome = 'mort'; run.cause = S.lastHurtBy; break; }
    // pause automatique : l'onglet a pu être signalé masqué (blur, visibilitychange) ; on reprend
    if (world.state === 'pause') resume();
    else if (world.state === 'pick') await pickScreen(run);
    else if (world.state === 'shop') shopScreen(run);
    if (world.state === 'play') idle = 0;
    else if (++idle > MAX_IDLE) { run.outcome = 'erreur'; run.error = `partie coincée hors du jeu (écran « ${world.state} »)`; break; }
    await nextTask();
  }
  closeCoins(); unlocksNow();
  world.pilot = null;
  Object.assign(run, { wave: S.wave, score: S.score, kills: S.kills, time: Math.round(S.time), mods: { ...S.mods } });
  delete run.spent;
  return run;
}
