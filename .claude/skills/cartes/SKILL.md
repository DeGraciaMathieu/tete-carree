---
name: cartes
description: Use when touching modifier cards, pacts, card rarity and draws, the combo, the score multiplier or kill points in Tête Carrée.
auto_invoke: true
---

# Cartes, combo et score

## Cartes de modificateurs

Les cartes sont le tableau `MODS` de `src/config.js`. Entre deux vagues, `openPick()`
(`src/game/flow.js`) en propose jusqu'à `CARDS_PER_PICK` tirées par `rollCards(S.mods, rng)`
(`src/rules/cards.js`), pondérées par la rareté `RAR`. Elles sont dessinées en cartes à jouer
(niveau ou ★ dans les coins, pictogramme, crans de niveau), distribuées face cachée puis retournées
une à une, la Légendaire en dernier ; une carte encore face cachée ne se choisit pas. Sous 640 px de
large, elles se couchent.

| Champ | Rôle |
| --- | --- |
| `id` | clé dans `S.mods` (`{ id: niveau }`) ; lue par `mod('<id>')` (`state/world.js`) ou `modLevel(mods, '<id>')` (règles) |
| `rar` | `c` Commune, `r` Rare, `l` Légendaire, `p` Pacte, `m` Pacte majeur ; poids de tirage `RAR[rar].w` |
| `excl` | pacte majeur : ids des cartes qu'il rend inutiles ; exclusion symétrique dans `rollCards` |
| `max` | niveau maximal ; une carte au max n'est plus proposée |
| `name`, `short` | titre de la carte ; libellé court du HUD (`#mods`) et de l'écran de pause |
| `desc(n)` | texte d'une carte ordinaire au niveau `n` qu'elle donnerait |
| `plus(n)`, `minus(n)` | pour un pacte (`isPact(m)` : `rar` `p` ou `m`) : avantage et contrepartie, à la place de `desc` |

| Carte (`id`) | Où l'effet s'applique |
| --- | --- |
| `perce`, `ricochet`, `calibre` | `fireWeapon` (`game/weapons.js`) |
| `cadence`, `frenesie`, `sansarmure` (cadence) | `fireMul` (`rules/modifiers.js`) ; vitesse de Frénésie : `FRENZY_SPEED_MUL` dans `update` ; pas de régénération sous Sans armure : `update` |
| `tenace` | `comboTime` (`rules/modifiers.js`, `TENACE_BONUS`) |
| `fievre` (pacte) | `multiplier` et `comboTime` (`FIEVRE_KILLS_PER_MULTIPLIER`, `FIEVRE_COMBO_MUL`) ; fenêtre en cours raccourcie dans `choosePick` |
| `double` | `rollMax` (`rules/modifiers.js`) ; charge immédiate dans `choosePick` |
| `rollboom`, `rollammo`, `firetrail` | `tryRoll` / `updateFires` (`game/player.js`) |
| `epaule` | `shove` dans `updateRoll` (`game/player.js`), recul `shoveKnock` (`EPAULE_*`) |
| `soif` | `soifHeal` (`rules/scoring.js`) |
| `barbeles` | section « ennemis » de `update` (`BARBELES_DAMAGE`) ; aspect dans `render/scene.js` |
| `grosbaril` | `explodeBarrel` (`GROSBARIL_RADIUS_MUL`) |
| `artificier` | `blastRadius` (`ARTIFICIER_RADIUS_MUL`), appelé pour grenades et roquettes dans `update` |
| `frag` | `fragShards` (`FRAG_SHARDS`) et `fragments` (`game/weapons.js`, `FRAG_*`), à l'explosion d'une grenade dans `update` |
| `tourelle` | `placeBlock` (`TURRET_EVERY`) |
| `constitution` | `choosePick` (`CONSTITUTION_HP`) |
| `aimant` | section « ramassage » de `update` (`AIMANT_*`) |
| `souffle` | `secondWind` (`rules/damage.js`) appelé par `hurtPlayer` ; `S.souffleUsed` ; marque dans le HUD |
| `prime` (pacte) | `killPoints` (`PRIME_POINTS_MUL`) et `waveQueue` (`PRIME_PACK_BONUS`) |
| `chair` (pacte) | `killPoints` (`CHAIR_POINTS_MUL`) et explosion du Gonflé (`CHAIR_RADIUS_MUL`, `game/combat.js`) ; rayon affiché dans `render/scene.js` |
| `quitte` (pacte) | `killPoints` via `quittePoints` (`QUITTE_POINTS_MUL`) ; `comboAfterHit` appelé par `hurtPlayer` |
| `poudre` (pacte) | `explosion(…, own)` (`game/combat.js`) : `ownBlastRadius`, `ownBlastSelfMul` ; `own` vrai pour barils, grenades, roquettes |
| `portant`, `fidele`, `racine`, `verre` (pactes, dégâts) | `shotDamageMul` (`rules/modifiers.js`) appelé par `shoot` (`game/weapons.js`) pour chaque ennemi touché ; pas pour les éclats de Fragmentation ni la tourelle |
| `fidele` (pacte, munitions) | section « ramassage » de `update` : plus d'arme à recharger, la caisse donne `AMMO_NO_WEAPON_BONUS` |
| `racine` (pacte, vitesse) | `speedMul` dans `update` |
| `ravito` (pacte) | `boxPeriod` et `spawnEnemy('z')` × `RAVITO_ZOMBIES` dans la section « caisses » de `update` |
| `repit` (pacte) | `repitBonus` en fin de vague → `S.repit`, passé à `multiplier`/`frenzy`/`fireMul` ; `waveBreak` ; pause en cours raccourcie dans `choosePick` |
| `vampire` (pacte) | `soifHeal` (`VAMPIRE_HEAL`) ; `hpRate` dans `update` (`VAMPIRE_DRAIN`, jamais le dernier PV) |
| `brulee` (pacte) | `rollCooldown` (`update`, `updateRoll`, jauge de `render/sprites.js`) ; `rollHpCost` dans `tryRoll` |
| `diable` (pacte) | `choosePick` : vie max −`DIABLE_HP`, `S.legendNext` ; `rollCards(mods, rng, legend)` tire une Légendaire en premier et retire le pacte quand il n'en reste plus |
| `verre` (pacte, vie) | `choosePick` : vie max −`VERRE_HP` |
| `sanssoin` (pacte majeur) | `hpRate` (aucune régénération) ; `boxKind` (caisses larguées dans `update`, `rollDrop`) ; `waveEndHp` en fin de vague dans `update` |
| `unevie` (pacte majeur) | `applyCard` : vie et vie max à 1 ; `killPoints` et `waveBonus` (`UNEVIE_POINTS_MUL`, `rules/scoring.js`) ; `boxKind` ; libellé « 1 coup » dans `renderHp` |
| `sablier` (pacte majeur) | `hpRate` (perte en vague après `SABLIER_HOLD` s sans kill, `S.lastKill` posé par `killEnemy` et `startWave`) ; mort par `hurtPlayer` dans `update` ; `killPoints` ; barre `.drain` dans `renderHp` |
| `elite` (pacte majeur) | `waveQueue` (`ELITE_COUNT_MUL`, `ELITE_PACK_MIN`) ; `enemyHpMul`, `enemySpeedMul` dans `spawnEnemy` ; `killPoints` |
| `entrave` (pacte majeur) | `rollMax` rend 0 (charges vidées dans `applyCard`, clic à vide dans `tryRoll`) ; `speedMul` ; `shotDamageMul` |
| `mitraille` (pacte majeur) | `weaponCdMul` et `ammoCost` dans `fireWeapon` (armes à feu seulement) ; munitions du pistolet dans `applyCard`, `refillOf` au ramassage et dans `rollPerks` ; `loadedWeapon` quand l'arme en main est vide |
| `lourde` (pacte majeur) | `shotDamageMul` ; `shotKnockMul` dans `shoot` ; `extraSpread` (un tirage `jitter` de plus) et `selfPush` dans `fireWeapon` ; recul cosmétique ×1,5 dans `recoil` |
| `toutourien` (pacte majeur) | `multiplier` (`TOUTOURIEN_KILLS_PER_MULTIPLIER`) ; `potsKill` dans `killEnemy` (cagnotte `S.pot`), `potAfterHit` dans `hurtPlayer`, versement avec le bonus de fin de vague dans `update` ; `#pot` dans `updateHud` |
| `sanspause` (pacte majeur) | `waveBreak` (`SANSPAUSE_BREAK`) ; `pickAfter` en fin de vague dans `update` ; `takeAllCards` : `openPick` tire hors pactes (`noPacts`), `takeAll` applique toutes les cartes |
| `specialiste` (pacte majeur) | `choosePick` enchaîne sur `openWeaponPick` / `chooseWeapon` (`S.special`, munitions infinies) ; `canSwitch` dans `selectWeapon` et `cycleWeapon` ; `shotDamageMul`, `specialMul` (explosions du joueur dans `explosion`, PV des barricades dans `placeBlock`) ; caisses de munitions en points ; cases `.sealed` ; proposé à partir de `SPECIALISTE_MIN_WEAPONS` armes (`ctx.weapons` de `rollCards`) |

## Pactes majeurs

Spécification : `docs/prd/pactes-majeurs.md`. `rollCards(mods, rng, legend, { wave, demo })` ne propose un
pacte majeur qu'à partir de la fin de la vague `MAJOR_FROM_WAVE`, jamais en démo, et plus aucun dès
qu'un pacte majeur est possédé (un seul par partie).

## Combo, multiplicateur, score

| Concept | Implémentation |
| --- | --- |
| Combo | `S.combo` (+1 par kill dans `killEnemy`), `S.comboT` remis à `comboTime()` ; décroît dans `update`, retombe à 0 à expiration ; un coup encaissé retire `COMBO_HIT_DRAIN` s, ou tout sous Quitte ou double (`comboAfterHit`, `hurtPlayer`) |
| Multiplicateur | `multiplier(combo, mods, bonus) = 1 + bonus + floor(combo / KILLS_PER_MULTIPLIER)` (`rules/modifiers.js`), `FIEVRE_KILLS_PER_MULTIPLIER` sous Fièvre ; `bonus` = crans de Sans répit (`S.repit`) |
| Frénésie | active si la carte est prise et `multiplier ≥ FRENZY_MULTIPLIER` |
| Points d'un kill | `killPoints(type, mods, multiplier)` (`rules/scoring.js`, `KILL_POINTS`) |
| Ajout au score | `addScore(n)` (`game/score.js`) : seul point d'entrée, déclenche les déblocages d'armes ; sous Tout ou rien, les kills d'une vague passent par la cagnotte `S.pot` |
| Bonus de fin de vague | `waveBonus(wave, mods)` (`rules/scoring.js`) : `WAVE_BONUS × vague`, ajouté dans `update` |
| Record | `world.best`, enregistré par `gameOver` sous `STORAGE_BEST` (`tete-carree-best`, clé à ne jamais changer) |
| Dernière partie et meilleures parties | `world.runs` (`{ last, top }`), classées par `rankRun` (`rules/records.js`, `TOP_RUNS`), enregistrées par `gameOver` sous `STORAGE_RUNS` (`tete-carree-runs`) ; affichées par `renderRuns` (`render/hud.js`) sur l'accueil (bloc masqué tant qu'aucune partie n'est enregistrée) et l'écran de fin |
| Affichage | `updateHud` (`render/hud.js`) : `#comboNum`, `#comboKills`, `#comboFill`, `#score`, `#next`, puces `#mods` |

## Ajouter une carte

1. Ajoute l'entrée dans `MODS` (`src/config.js`) : `id` unique, `rar`, `max`, `name`, `short`, et
   `desc(n)` — ou `plus(n)`/`minus(n)` pour un pacte. Les nombres du texte doivent correspondre aux
   constantes : de préférence, construis-les à partir de la constante plutôt que de les écrire en dur.
2. Ajoute ses constantes d'effet dans `src/config.js` (section « Cartes »).
3. Si l'effet est une formule ou une condition, mets-la dans `src/rules/modifiers.js` (ou la règle du
   domaine touché) en lisant `modLevel(mods, '<id>')`, et teste-la dans `tests/<module>.test.js`.
4. Branche l'effet au point d'appel : action de `src/game/`, ou `src/loop/update.js` pour un effet
   continu. Effet immédiat à la prise (soin, charge) : `choosePick` (`src/game/flow.js`).
5. État propre à la carte (comme `S.souffleUsed`) : initialisé dans `resetWorld` (`src/state/world.js`).
6. Vérifie `tests/cards.test.js` : le tirage reste valide, mais une graine donnée propose
   désormais d'autres cartes (le pool a changé).
7. Dessine son pictogramme dans `src/render/cardIcons.js` (SVG au trait 24 × 24, clé = `id`) :
   `tests/cards.test.js` échoue sinon.

Réserve d'idées de cartes non implémentées : `docs/idees-cartes.md`.

## Pièges

- Le tirage dépend de l'ordre de `MODS` : réordonner le tableau change les cartes proposées pour une
  même graine.
- Les textes `desc`/`plus`/`minus` sont de la documentation vivante surveillée par le hook Stop :
  plusieurs écrivent encore leurs nombres en dur (`1.4` de Combo tenace, `14 * n` de Barbelés,
  `100 + 25 * n` de Constitution, `5 * n` d'Aimant, « 40 % » de Second souffle…). Si tu changes la
  constante, change le texte.
