// État de la partie en cours (session, joueur, collections d'entités), création d'une nouvelle partie
// et accès aux modificateurs et au combo de la session.
import { ARENAS, BOX_FIRST, FIRST_BREAK, PLAYER_HP, PLAYER_RADIUS, STORAGE_ARENA, STORAGE_BEST, STORAGE_RUNS, T, W } from '../config.js';
import * as Mods from '../rules/modifiers.js';
import { createRng } from '../rules/rng.js';
import * as Waves from '../rules/waves.js';
import { buildMap } from './arena.js';

// Aléatoire qui décide du gameplay : graine tirée à chaque nouvelle partie.
export let rng = Math.random;
export const jitter = (a = 1) => (rng() * 2 - 1) * a;

export const mod = id => Mods.modLevel(S && S.mods, id);
// Crans de multiplicateur hors combo : Sans répit et Départ lancé (Comptoir).
const bonus = () => S.repit + Mods.shopBonus(S.buffs);
export function frenzy() { return Mods.frenzy(S.mods, S.combo, bonus()); }
export function fireMul() { return Mods.fireMul(S.mods, S.combo, bonus()); }
export function comboTime() { return Mods.comboTime(S.mods, S.buffs); }
export function rollMax() { return Mods.rollMax(S.mods, S.buffs); }
export function rollCooldown() { return Mods.rollCooldown(S.mods); }

// État de partie réaffecté depuis plusieurs modules : un module ES ne peut pas réaffecter
// une liaison importée, ces valeurs vivent donc comme propriétés d'un objet partagé.
export const world = {
  state: 'title',
  enemies: undefined,
  projs: undefined,
  grenades: undefined,
  rockets: undefined,
  parts: undefined,
  tracers: undefined,
  pops: undefined,
  booms: undefined,
  pickups: undefined,
  pending: undefined,
  bursts: undefined,
  fires: undefined,
  fallers: undefined,
  globs: undefined,
  puddles: undefined,
  shake: undefined,
  fieldDirty: true,
  best: 0,
  runs: { last: null, top: [] }, // dernière partie et meilleures parties { score, wave, kills, combo, mods, t }
  demo: false, // partie de démo derrière l'écran titre (game/demo.js)
  arena: ARENAS[0], // arène choisie sur l'accueil (state/arena.js)
};

export let S, player, blocks, unlocked, ammo, cam;

try { const a = localStorage.getItem(STORAGE_ARENA); if (ARENAS.includes(a)) world.arena = a; } catch (e) {}
try { world.best = +localStorage.getItem(STORAGE_BEST) || 0; } catch (e) {}
try { const r = JSON.parse(localStorage.getItem(STORAGE_RUNS)); if (r && Array.isArray(r.top)) world.runs = r; } catch (e) {}
// Joueur d'avant le classement : son record y entre seul, sans le détail de la partie.
if (!world.runs.top.length && world.best) world.runs.top = [{ score: world.best }];

// Remet la partie à zéro : graine, arène, session, joueur, entités.
export function resetWorld() {
  rng = createRng(Math.random() * 4294967296);
  buildMap(world.arena);
  S = { score: 0, wave: 0, waveActive: false, breakT: FIRST_BREAK, queue: [], spawnT: 0, combo: 0, comboT: 0, bestCombo: 0, kills: 0, time: 0, boxT: BOX_FIRST, fieldT: 0, overT: 0, mods: {}, wallCount: 0, souffleUsed: false, pickT: 0, repit: 0, legendNext: false, lastKill: -9, pot: 0, special: -1, money: 0, coinPot: 0, banned: [], buffs: {}, buffsVer: 0, waveHurt: false };
  player = { x: 22 * T, y: 15 * T + 4, r: PLAYER_RADIUS, hp: PLAYER_HP, fx: 0, fy: 1, cd: 0, weapon: 0, hurtT: 0, flash: 0, walk: 0, moving: false, muzzle: 0, recoil: 0, recoilV: 0, shellT: 0, lastHurt: -9, dead: false, roll: null, rollCd: 0, rollReady: 0, maxHp: PLAYER_HP, rollCharges: 1, invuln: 0 };
  world.enemies = []; world.projs = []; world.grenades = []; world.rockets = []; world.parts = []; world.tracers = []; world.pops = []; world.booms = []; world.pickups = []; world.pending = []; world.bursts = []; world.fires = []; world.fallers = []; world.globs = []; world.puddles = []; world.coins = [];
  blocks = new Map();
  unlocked = W.map(w => w.unlock === 0);
  ammo = W.map(w => w.unlock === 0 ? Infinity : 0);
  cam = { x: player.x, y: player.y, kx: 0, ky: 0, kvx: 0, kvy: 0 }; world.shake = 0; world.fieldDirty = true;
}
export function multiplier() { return Mods.multiplier(S.combo, S.mods, bonus()); }

export function queueCount() { return Waves.queueCount(S.queue); }
