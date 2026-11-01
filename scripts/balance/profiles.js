// Profils de joueurs du harnais d'équilibrage : réglages du pilote, préférences de cartes et d'achats.
// Déplacement (px) : flee (fuite), centerPull, cratePull, coinPull, lootDanger (pas de ramassage si un ennemi est
// plus près), avoidAcid (s'écarter des flaques d'acide), fireDodge (force pour sortir de la course des boules de feu,
// 0 : jamais) ; visée : reaction (s), aimError (degrés) ; dodge : contact qui déclenche la roulade (0 : jamais).
// cards : poids par carte (défaut 1), pactes et pacte majeur acceptés ; reroll : relance si la meilleure carte pèse
// moins que `below`, en gardant `reserve` pièces ; ban : bannit une carte de poids négatif ; shop : poids des
// familles du Comptoir (0 : jamais), réserve, réassort.

const DEFENSE = ['constitution', 'soif', 'souffle', 'double', 'sangdor', 'epaule', 'barbeles'];
const COMBO = ['frenesie', 'tenace', 'collecte', 'cadence', 'ricochet', 'perce'];
const LOOT = ['pillard', 'poches', 'marchandage', 'collecte', 'midas', 'tresor', 'aimant', 'avarice', 'cupidite', 'mercenaire'];
const weights = (ids, w) => Object.fromEntries(ids.map(id => [id, w]));

// Pilote de la démo de l'accueil (src/game/demo.js) : FLEE 170, CENTER_PULL .45, CRATE_PULL .6, DODGE 30.
// avoidAcid en plus : sans lui, l'acide domine les causes de mort de tous les profils.
// fireDodge en plus : la démo ne les esquive pas, et elles tuaient plus de la moitié des parties.
const DEMO_MOVE = { flee: 170, centerPull: .45, cratePull: .6, coinPull: 0, lootDanger: 90, avoidAcid: true, fireDodge: 2, reaction: 0, aimError: 0, dodge: 30 };

export const PROFILES = [
  {
    id: 'demo', name: 'Démo',
    ...DEMO_MOVE,
    cards: { weights: {}, pacts: true, majors: true, jitter: 10 },
    reroll: null, ban: false, shop: null,
  },
  {
    id: 'debutant', name: 'Débutant',
    ...DEMO_MOVE, flee: 120, coinPull: .4, lootDanger: 160, avoidAcid: false, fireDodge: 0, reaction: .4, aimError: 15, dodge: 0,
    cards: { weights: {}, pacts: true, majors: true, jitter: 10 },
    reroll: null, ban: false, shop: null,
  },
  {
    id: 'prudent', name: 'Prudent',
    ...DEMO_MOVE, flee: 230, coinPull: .5, lootDanger: 200, reaction: .15, aimError: 4,
    cards: { weights: { ...weights(DEFENSE, 6) }, pacts: false, majors: false, jitter: 1 },
    reroll: { below: 3, reserve: 20 }, ban: false,
    shop: { fams: { pact: 6, heal: 5, ammo: 3, arms: 1, horde: 2 }, reserve: 10, restock: false },
  },
  {
    id: 'pilleur', name: 'Pilleur',
    ...DEMO_MOVE, flee: 150, coinPull: 1.2, cratePull: .9, lootDanger: 45, reaction: .15, aimError: 4,
    cards: { weights: { ...weights(LOOT, 6) }, pacts: true, majors: true, jitter: 1 },
    reroll: { below: 3, reserve: 0 }, ban: false,
    shop: { fams: { loot: 6, pact: 5, ammo: 4, arms: 4, combo: 3, heal: 3, horde: 2, rent: 2 }, reserve: 0, restock: true },
  },
  {
    id: 'scoreur', name: 'Scoreur',
    ...DEMO_MOVE, flee: 160, coinPull: .6, lootDanger: 90, reaction: .1, aimError: 3,
    cards: { weights: { ...weights(COMBO, 6), prime: 4, chair: 4, quitte: 4, mercenaire: -5 }, pacts: true, majors: true, jitter: 1 },
    reroll: { below: 4, reserve: 0 }, ban: true,
    shop: { fams: { combo: 6, arms: 3, pact: 3 }, reserve: 30, restock: false },
  },
];
export const profileById = id => PROFILES.find(p => p.id === id);
