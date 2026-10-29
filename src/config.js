/* Constantes du jeu : grille, armes, cartes, équilibrage, réglages. Aucune logique ici. */

/* ---------- Arène ---------- */
export const T = 32, MW = 44, MH = 30;
// Arènes choisies sur l'accueil, dans l'ordre du menu ; leurs plans sont dans state/arena.js.
export const ARENAS = ['entrepot', 'fosse', 'colonnade', 'bunker', 'pont'];
export const ZOOM_MIN = 0.72, ZOOM_MAX = 1.7;

/* ---------- Armes ---------- */
export const W = [
  { id: 'pistol',  unlock: 0,     cd: .26, refill: 0 },
  { id: 'uzi',     unlock: 1000,  cd: .07, refill: 120 },
  { id: 'rifle',   unlock: 2000,  cd: .14, refill: 60 },
  { id: 'shotgun', unlock: 3500,  cd: .62, refill: 22 },
  { id: 'wall',    unlock: 7000,  cd: .22, refill: 6 },
  { id: 'barrel',  unlock: 11000, cd: .22, refill: 5 },
  { id: 'grenade', unlock: 17000, cd: .55, refill: 8 },
  { id: 'rocket',  unlock: 26000, cd: .85, refill: 6 },
  { id: 'rail',    unlock: 38000, cd: 1.1, refill: 5 },
];

/* ---------- Combo ---------- */
export const COMBO_T = 2.6;
export const TENACE_BONUS = 1.4; // secondes de combo en plus par niveau de Combo tenace
export const KILLS_PER_MULTIPLIER = 5;
export const COMBO_HIT_DRAIN = .6; // secondes de combo perdues à chaque coup encaissé
export const FRENZY_MULTIPLIER = 5; // Frénésie s'active à partir de ×5
export const SOIF_MULTIPLIER = 3;   // Soif de sang soigne à partir de ×3

/* ---------- Cartes de modificateurs ---------- */
export const RAR = { c: { w: 55 }, r: { w: 28 }, l: { w: 9 }, p: { w: 12 }, m: { w: 3 } };
// Noms et textes des armes, raretés et cartes : src/i18n/ (fr.js, en.js), repérés par `id`.
export const MODS = [
  { id: 'perce', rar: 'c', max: 3 },
  { id: 'ricochet', rar: 'r', max: 2 },
  { id: 'cadence', rar: 'c', max: 3 },
  { id: 'calibre', rar: 'c', max: 2 },
  { id: 'double', rar: 'r', max: 1 },
  { id: 'rollboom', rar: 'r', max: 2 },
  { id: 'rollammo', rar: 'c', max: 3 },
  { id: 'firetrail', rar: 'r', max: 2 },
  { id: 'tenace', rar: 'c', max: 2 },
  { id: 'soif', rar: 'r', max: 3 },
  { id: 'frenesie', rar: 'l', max: 1 },
  { id: 'barbeles', rar: 'c', max: 3 },
  { id: 'grosbaril', rar: 'c', max: 2 },
  { id: 'tourelle', rar: 'l', max: 1 },
  { id: 'constitution', rar: 'c', max: 4 },
  { id: 'aimant', rar: 'c', max: 2 },
  { id: 'souffle', rar: 'l', max: 1 },
  { id: 'prime', rar: 'p', max: 2 },
  { id: 'chair', rar: 'p', max: 2 },
  { id: 'sansarmure', rar: 'p', max: 1 },
  { id: 'epaule', rar: 'r', max: 2 },
  { id: 'frag', rar: 'r', max: 2 },
  { id: 'artificier', rar: 'c', max: 2 },
  { id: 'fievre', rar: 'p', max: 1 },
  { id: 'quitte', rar: 'p', max: 1 },
  { id: 'poudre', rar: 'p', max: 1 },
  { id: 'portant', rar: 'p', max: 1 },
  { id: 'ravito', rar: 'p', max: 1 },
  { id: 'repit', rar: 'p', max: 1 },
  { id: 'fidele', rar: 'p', max: 1 },
  { id: 'vampire', rar: 'p', max: 1 },
  { id: 'brulee', rar: 'p', max: 1 },
  { id: 'racine', rar: 'p', max: 1 },
  { id: 'diable', rar: 'p', max: 1 },
  { id: 'verre', rar: 'p', max: 1 },
  // Pactes majeurs : un seul par partie, `excl` liste les cartes qu'ils rendent inutiles (docs/prd/pactes-majeurs.md).
  { id: 'sanssoin', rar: 'm', max: 1, excl: ['vampire', 'soif', 'sansarmure'] },
  { id: 'unevie', rar: 'm', max: 1, excl: ['constitution', 'souffle', 'vampire', 'soif', 'verre', 'diable', 'brulee', 'sansarmure'] },
  { id: 'sablier', rar: 'm', max: 1, excl: ['vampire', 'sansarmure'] },
  { id: 'elite', rar: 'm', max: 1 },
  { id: 'entrave', rar: 'm', max: 1, excl: ['double', 'rollboom', 'rollammo', 'firetrail', 'epaule', 'brulee'] },
  { id: 'mitraille', rar: 'm', max: 1, excl: ['fidele'] },
  { id: 'lourde', rar: 'm', max: 1 },
  { id: 'toutourien', rar: 'm', max: 1, excl: ['fievre', 'quitte'] },
  { id: 'sanspause', rar: 'm', max: 1, excl: ['repit'] },
  { id: 'specialiste', rar: 'm', max: 1, excl: ['fidele', 'rollammo'] },
  { id: 'silence', rar: 'm', max: 1 },
  { id: 'aveugle', rar: 'm', max: 1 },
];

/* ---------- Effets des cartes ---------- */
export const CADENCE_CD_MUL = .8;     // Gâchette nerveuse : délai de tir × 0,8 par niveau
export const SANSARMURE_CD_MUL = .5;  // Sans armure : cadence doublée
export const FRENZY_CD_MUL = .75;     // Frénésie : cadence +33 %
export const PRIME_POINTS_MUL = 1.5;  // Prime de risque : +50 % de points par niveau
export const CHAIR_POINTS_MUL = 2;    // Chair à canon : points des Gonflés × 2 par niveau
export const PRIME_PACK_BONUS = 2;    // Prime de risque : coureurs en plus par meute et par niveau
export const SECOND_WIND_HP = .4;     // Second souffle : fraction de la vie max rendue
export const SECOND_WIND_INVULN = 1.6;
export const ARTIFICIER_RADIUS_MUL = 1.25; // Artificier : rayon des grenades et roquettes × 1,25 par niveau
// Fragmentation : éclats par niveau, projetés en étoile depuis l'explosion d'une grenade
export const FRAG_SHARDS = 4, FRAG_DAMAGE = 30, FRAG_RANGE = 150, FRAG_KNOCK = 60;
export const FIEVRE_KILLS_PER_MULTIPLIER = 3; // Fièvre : kills par cran de multiplicateur
export const FIEVRE_COMBO_MUL = .5;           // Fièvre : fenêtre de combo × 0,5
// Coup d'épaule : dégâts et recul infligés aux ennemis traversés par la roulade (recul + par niveau au-delà du premier)
export const EPAULE_DAMAGE = 10, EPAULE_KNOCK = 200, EPAULE_KNOCK_LVL = 80, EPAULE_REACH = 4;
// Pactes : Quitte ou double, Poudre noire, Bout portant, Ravitaillement, Sans répit, Fidélité, Vampire,
// Terre brûlée, Enraciné, Marché du diable, Canon de verre. « Tes tirs » : balles, plombs et railgun du joueur.
export const QUITTE_POINTS_MUL = 2;
export const POUDRE_RADIUS_MUL = 1.5, POUDRE_SELF_MUL = 2;
export const PORTANT_RANGE = 3, PORTANT_NEAR_MUL = 2, PORTANT_FAR_MUL = .5; // portée en cases
export const RAVITO_PERIOD_MUL = .5, RAVITO_ZOMBIES = 1;
export const REPIT_MAX = 5, REPIT_BREAK_MUL = .5;
export const FIDELE_PISTOL_MUL = 3;
export const VAMPIRE_HEAL = 1, VAMPIRE_DRAIN = 1; // PV par kill ; PV perdus par seconde sans combo
export const BRULEE_ROLL_CD_MUL = .5, BRULEE_ROLL_HP = 5;
export const RACINE_DAMAGE_MUL = 2, RACINE_SPEED_MUL = .7;
export const DIABLE_HP = 25;
export const VERRE_DAMAGE_MUL = 1.5, VERRE_HP = 40;
export const UNEVIE_POINTS_MUL = 3; // Une seule vie : points des kills et du bonus de vague
// Sablier : points des kills ; PV perdus par seconde en vague ; secondes de répit après chaque kill
export const SABLIER_POINTS_MUL = 2, SABLIER_DRAIN = 4, SABLIER_HOLD = 1.5;
// Élite : points des kills ; part des ennemis de chaque type (arrondi au supérieur) et taille des meutes (au moins
// ELITE_PACK_MIN coureurs) ; PV (bouclier compris) et vitesse des ennemis
// Mitraille : délai entre deux tirs des armes à feu, munitions par tir, munitions du pistolet à la prise et par caisse
export const MITRAILLE_CD_MUL = .5, MITRAILLE_AMMO_COST = 2, MITRAILLE_PISTOL_AMMO = 120, MITRAILLE_PISTOL_REFILL = 60;
// Main lourde : dégâts et recul infligés par tes tirs ; recul subi par tir (px) ; dispersion ajoutée (rad)
export const LOURDE_DAMAGE_MUL = 1.8, LOURDE_KNOCK_MUL = 2, LOURDE_SELF_PUSH = 8, LOURDE_SPREAD = .14;
// Spécialiste : dégâts de l'arme choisie (tirs, explosions, PV des barricades) ; armes débloquées pour être proposé
export const SPECIALISTE_DAMAGE_MUL = 2, SPECIALISTE_MIN_WEAPONS = 2;
export const AVEUGLE_DAMAGE_MUL = 2, AVEUGLE_SIGHT = 5; // Aveugle : dégâts des tirs ; portée de vue (cases)
export const SILENCE_POINTS_MUL = 2; // Silence : points des kills
export const SANSPAUSE_BREAK = 1.5; // Pas de pause : secondes entre deux vagues
export const TOUTOURIEN_KILLS_PER_MULTIPLIER = 2; // Tout ou rien : kills par cran de multiplicateur
export const ENTRAVE_SPEED_MUL = 1.3, ENTRAVE_DAMAGE_MUL = 1.5; // Sans échappatoire : déplacement, dégâts des tirs
export const ELITE_POINTS_MUL = 3, ELITE_COUNT_MUL = .5, ELITE_PACK_MIN = 2, ELITE_HP_MUL = 2.5, ELITE_SPEED_MUL = 1.2;
export const CARDS_PER_PICK = 3;
// Pactes majeurs (rareté `m`) : proposés à partir de la fin de cette vague, un seul par partie ; tant qu'aucun n'est pris,
// l'un d'eux est garanti à la fin de cette vague puis toutes les MAJOR_EVERY vagues.
export const MAJOR_FROM_WAVE = 5, MAJOR_EVERY = 2;

/* ---------- Joueur ---------- */
export const PLAYER_HP = 100, PLAYER_RADIUS = 9;
export const CONSTITUTION_HP = 25; // Constitution : vie max et soin par niveau
export const EMPTY_SWAP_CD = .2;   // délai après un tir à vide (retour au pistolet)
export const PLACE_FAIL_CD = .15;  // délai après une pose de construction impossible
export const PLAYER_SPEED = 140;
export const FRENZY_SPEED_MUL = 1.25;
export const ACID_SPEED_MUL = 0.55;
export const REGEN_DELAY = 4; // secondes sans dégât avant de régénérer
export const REGEN_RATE = 3;  // points de vie par seconde
export const LOW_HP = 30;
export const MEDKIT_HP = 35;
export const ROLL = { A: .06, B: .36, D: .46, CD: .7, V: 430, R: 10.5 };
// Roulade explosive : rayon et dégâts de l'onde de choc = base + niveau × par niveau
export const ROLLBOOM_RADIUS = 50, ROLLBOOM_RADIUS_LVL = 22, ROLLBOOM_DAMAGE = 20, ROLLBOOM_DAMAGE_LVL = 20;
export const ROLLAMMO_SHARE = .25; // Roulade tactique : part d'une recharge rendue par niveau
export const ROLLAMMO_CAP = 1;     // Roulade tactique : ne remplit pas au-delà de ce nombre de recharges
export const SECOND_WIND_SHOCK_RADIUS = 110, SECOND_WIND_SHOCK_DAMAGE = 80, SECOND_WIND_SHOCK_KNOCK = 340;
// Traînée de feu : durée d'une flamme au sol, dégâts par niveau (au moins 1), cadence et rayon de brûlure
export const FIRETRAIL_LIFE = 2.4, FIRETRAIL_DAMAGE = 8, FIRETRAIL_TICK = .2, FIRETRAIL_RADIUS = 20;

/* ---------- Constructions ---------- */
export const WALL_HP = 170, TURRET_WALL_HP = 240, BARREL_HP = 45;
export const TURRET_EVERY = 3; // une barricade sur trois porte une tourelle
export const TURRET_RANGE = 290, TURRET_CD = .45, TURRET_IDLE_CD = .15, TURRET_DAMAGE = 22, TURRET_KNOCK = 40;
export const BARREL_RADIUS = 80, BARREL_DAMAGE = 120;
export const BARREL_CHAIN_DELAY = .13; // un baril touché par une explosion saute après ce délai (s)
export const TURRET_FIRST_CD = .3;
// Explosions : dégâts et recul baissent jusqu'à -60 % au bord du rayon ; le joueur prend 26 % des dégâts
// (moitié moins au bord) s'il est à moins de 90 % du rayon ; les constructions prennent 55 % des dégâts.
export const BLAST_FALLOFF = .6, BLAST_KNOCK = 280;
export const BLAST_SELF_RANGE = .9, BLAST_SELF_DAMAGE = .26, BLAST_SELF_FALLOFF = .5;
export const BLAST_BLOCK_REACH = 12, BLAST_BLOCK_DAMAGE = .55;
export const GROSBARIL_RADIUS_MUL = 1.4; // Gros barils : rayon × 1,4 par niveau

/* ---------- Armes : tirs et explosifs ---------- */
// spread : dispersion (rad), speed : vitesse (px/s), damage, knock : recul infligé
export const SHOTS = {
  pistol: { spread: .03, speed: 420, damage: 34, knock: 70 },
  uzi: { spread: .09, speed: 380, damage: 20, knock: 34 },
  rifle: { spread: .035, speed: 540, damage: 34, knock: 55 },
  shotgun: { pellets: 8, spread: .3, speed: 220, speedRand: 30, damage: 24, knock: 95 },
  rail: { speed: 760, damage: 260, knock: 140 },
};
export const GRENADE_RADIUS = 88, GRENADE_DAMAGE = 150, GRENADE_SPEED = 250, GRENADE_FUSE = 1.15;
export const ROCKET_RADIUS = 72, ROCKET_DAMAGE = 160, ROCKET_SPEED = 540, ROCKET_LIFE = 1.4;
export const UNLOCK_REFILLS = 2; // une arme débloquée arrive avec deux recharges de munitions

/* ---------- Ennemis ---------- */
export const KILL_POINTS = { z: 50, b: 100, r: 75, s: 120, a: 200, d: 150 };
export const DROP_CHANCE = { z: .05, b: .15, r: .04, s: .1, a: .25, d: .2 };
export const BLOATER_RADIUS = 74, BLOATER_DAMAGE = 120;
export const CHAIR_RADIUS_MUL = 1.4; // Chair à canon : rayon d'explosion des Gonflés × 1,4 par niveau
export const BLOATER_FUSE = .7;      // délai entre l'amorçage et l'explosion du Gonflé (s)
// Statistiques par type : rayon, PV = hp + vague × hpWave,
// vitesse = sp + min(spCap, vague × spWave) + tirage × spRand.
export const ENEMY_STATS = {
  z: { r: 9, hp: 55, hpWave: 6, sp: 44, spCap: 32, spWave: 2.6, spRand: 10 },
  b: { r: 12, hp: 110, hpWave: 9, sp: 34, spCap: 14, spWave: 1, spRand: 6 },
  a: { r: 11, hp: 200, hpWave: 14, sp: 34, spCap: 10, spWave: 1, spRand: 4, shield: 320, shieldWave: 22 },
  s: { r: 9, hp: 70, hpWave: 6, sp: 46, spCap: 12, spWave: 1, spRand: 6, spitCd: 1.2, spitCdRand: 1.5 },
  r: { r: 8, hp: 24, hpWave: 1.5, sp: 112, spCap: 22, spWave: 1.5, spRand: 8 },
  d: { r: 10, hp: 140, hpWave: 12, sp: 62, spCap: 22, spWave: 1.6, spRand: 6, fire: 1.6, fireRand: 2 },
};
// Marges de contact ajoutées aux rayons (px)
export const MELEE_REACH = 6, BLOATER_TRIGGER_REACH = 14, FIREBALL_HIT_REACH = 6, ROCKET_HIT_REACH = 6;
export const ENEMY_FIRST_ATTACK = .6;                          // délai avant le premier coup (s)
export const ENEMY_MELEE_DAMAGE = { z: 10, r: 6, s: 8, a: 15, d: 17 };
export const ENEMY_ATTACK_CD = { z: .9, r: .55, s: .9, a: 1.1, d: .9 };
export const ENEMY_BLOCK_DAMAGE = { z: 12, b: 16, r: 6, s: 10, a: 30, d: 22 }; // coups portés aux constructions
export const BLOCK_ATTACK_CD = .85;
export const BARBELES_DAMAGE = 14; // par niveau de Barbelés, à chaque coup porté à une barricade
// Diable : tir de boule de feu
export const DEVIL_FIRE_CD = 2.1, DEVIL_FIRE_RAND = 1.6, DEVIL_RANGE = 340, DEVIL_SPREAD = .06;
export const FIREBALL_SPEED = 230, FIREBALL_LIFE = 3, FIREBALL_DAMAGE = 18, FIREBALL_BLOCK_DAMAGE = 25;
// Cracheur et acide
export const SPIT_CD = 2.8, SPIT_CD_RAND = .9;
export const ACID_SPLASH_DAMAGE = 10, ACID_SPLASH_RADIUS = 24;
export const PUDDLE_LIFE = 4, PUDDLE_RADIUS = 26;          // flaque laissée par un crachat
export const SPIT_LEAD = 140, SPIT_LEAD_MIN = .4, SPIT_LEAD_RAND = .4; // anticipation du déplacement du joueur
// Comportement du cracheur : il voit à SPITTER_SIGHT, recule de SPITTER_BACKOFF s'il est plus près que
// SPITTER_TOO_CLOSE, se poste à moins de SPITTER_HOLD, ne crache pas à moins de SPITTER_MIN_RANGE.
export const SPITTER_SIGHT = 270, SPITTER_TOO_CLOSE = 115, SPITTER_BACKOFF = 40, SPITTER_HOLD = 240, SPITTER_MIN_RANGE = 70;
export const SPITTER_WINDUP = .6;     // anticipation avant le crachat (s)
export const SPITTER_HOLD_SPEED = .35; // fraction de vitesse quand il se poste
export const BLOATER_FUSE_SPEED = .3;  // fraction de vitesse du Gonflé mèche allumée
export const ARMOR_SHOVE = 12;         // le blindé repousse le joueur à chaque coup (px)
export const ACID_TICK_RESET = .12;    // hors de l'acide, prochain dégât au plus tard après ce délai
export const ACID_TICK = .45, ACID_DAMAGE = 4;
export const MAX_ENEMIES = 120;
export const DROP_HP_CHANCE = .5; // caisse lâchée : santé ou munitions
// Blindé : recul encaissé, bouclier qui arrête les coups venus de face.
export const ARMOR_KNOCK_MUL = .2, ARMOR_BLAST_KNOCK_MUL = .45;
export const SHIELD_FRONT_DOT = -.45;              // cosinus en dessous duquel le coup vient de face
export const SHIELD_ABSORB = .85, SHIELD_LEAK = .15; // part pour le bouclier, part pour la chair

/* ---------- Vagues ---------- */
export const FIRST_BREAK = 1.6;
export const WAVE_BREAK = 10;
export const PICK_DELAY = 1.1;
export const WAVE_BONUS = 250; // multiplié par le numéro de vague
// Composition : 8 + 5n zombies ; chaque autre type entre à la vague `from`,
// au nombre de floor((n - offset) × scale). `key` : fenêtre [min, min + span) de sa place dans la file.
export const WAVE_ZOMBIES_BASE = 8, WAVE_ZOMBIES_PER_WAVE = 5;
export const WAVE_UNITS = {
  z: { key: [0, 1] },
  d: { from: 3, offset: 1, scale: 1.4, key: [0, .7] },
  b: { from: 2, offset: 0, scale: .7, key: [.2, .8] },
  s: { from: 5, offset: 3, scale: .7, key: [.1, .8] },
  a: { from: 6, offset: 4, scale: .5, key: [.3, .7] },
  p: { from: 4, offset: 2, scale: .6, key: [.1, .9] },
};
// Meute de coureurs : 3 + tirage dans [0, 3) + 1 par tranche de 4 vagues (3 au plus).
export const PACK_BASE = 3, PACK_RAND = 3, PACK_WAVES_PER_RUNNER = 4, PACK_WAVE_MAX = 3;
// Apparitions : deux par deux après la vague 6, délai qui raccourcit à chaque vague.
export const SPAWN_DOUBLE_AFTER = 6, SPAWN_BURST = 2;
export const WAVE_FIRST_SPAWN = .4; // délai avant le premier ennemi d'une vague (s)
export const SPAWN_GAP_START = .85, SPAWN_GAP_STEP = .05, SPAWN_GAP_MIN = .16;

/* ---------- Caisses de ravitaillement ---------- */
export const BOX_FIRST = 7;
export const BOX_PERIOD_MIN = 9, BOX_PERIOD_RAND = 5;
export const MAX_PICKUPS = 3;
export const BOX_HP_CHANCE = .35;
export const BOX_MIN_DIST = 140;         // une caisse n'apparaît pas trop près du joueur
export const PICKUP_RADIUS = 20;
export const AMMO_REFILL_WEAPONS = 2;    // armes rechargées par une caisse de munitions
export const AMMO_NO_WEAPON_BONUS = 150; // points si aucune arme à recharger
export const AIMANT_RANGE = 160, AIMANT_SPEED = 300; // Aimant : portée par niveau (px), vitesse d'attraction (px/s)

/* ---------- Moteur ---------- */
export const MAX_PARTS = 1600;
export const FIELD_PERIOD = .22; // recalcul du champ de distances (s)
export const PATH_BLOCK_COST = 9; // surcoût d'une construction pour la horde : elle préfère contourner
export const MAX_DT = 1 / 30;     // pas de simulation maximal (s)

/* ---------- Entrées ---------- */
export const STICK_RADIUS = 48;
export const PAD_MOVE_DEADZONE = .22, PAD_AIM_DEADZONE = .25;

/* ---------- Réglages joueur ---------- */
// Clés historiques : ne pas les renommer, les joueurs perdraient record et réglages.
export const STORAGE_BEST = 'tete-carree-best';
export const STORAGE_FPS = 'tete-carree-fps';
export const STORAGE_OUTLINE = 'tete-carree-outline';
// Dernière partie et meilleures parties, affichées sur l'accueil et l'écran de fin.
export const STORAGE_RUNS = 'tete-carree-runs';
export const STORAGE_LANG = 'tete-carree-lang'; // fr ou en, choisie sur l'accueil
export const STORAGE_ARENA = 'tete-carree-arena'; // arène choisie sur l'accueil
export const TOP_RUNS = 5;
// Version publiée : compteur masqué tant que le joueur ne l'a pas activé lui-même.
export const SHOW_FPS_BY_DEFAULT = false;
