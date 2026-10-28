---
name: cartes
description: Use when touching modifier cards, pacts, card rarity and draws, the combo, the score multiplier or kill points in Tête Carrée.
auto_invoke: true
---

# Cartes, combo et score

## Cartes de modificateurs

Les cartes sont le tableau `MODS` de `src/config.js`. Entre deux vagues, `openPick()`
(`src/game/flow.js`) en propose jusqu'à `CARDS_PER_PICK` tirées par `rollCards(S.mods, rng)`
(`src/rules/cards.js`), pondérées par la rareté `RAR`.

| Champ | Rôle |
| --- | --- |
| `id` | clé dans `S.mods` (`{ id: niveau }`) ; lue par `mod('<id>')` (`state/world.js`) ou `modLevel(mods, '<id>')` (règles) |
| `rar` | `c` Commune, `r` Rare, `l` Légendaire, `p` Pacte ; poids de tirage `RAR[rar].w` |
| `max` | niveau maximal ; une carte au max n'est plus proposée |
| `name`, `short` | titre de la carte ; libellé court du HUD (`#mods`) et de l'écran de pause |
| `desc(n)` | texte d'une carte ordinaire au niveau `n` qu'elle donnerait |
| `plus(n)`, `minus(n)` | pour un pacte (`rar: 'p'`) : avantage et contrepartie, à la place de `desc` |

| Carte (`id`) | Où l'effet s'applique |
| --- | --- |
| `perce`, `ricochet`, `calibre` | `fireWeapon` (`game/weapons.js`) |
| `cadence`, `frenesie`, `sansarmure` (cadence) | `fireMul` (`rules/modifiers.js`) ; vitesse de Frénésie : `FRENZY_SPEED_MUL` dans `update` ; pas de régénération sous Sans armure : `update` |
| `tenace` | `comboTime` (`rules/modifiers.js`, `TENACE_BONUS`) |
| `double` | `rollMax` (`rules/modifiers.js`) ; charge immédiate dans `choosePick` |
| `rollboom`, `rollammo`, `firetrail` | `tryRoll` / `updateFires` (`game/player.js`) |
| `soif` | `soifHeal` (`rules/scoring.js`) |
| `barbeles` | section « ennemis » de `update` (`BARBELES_DAMAGE`) ; aspect dans `render/scene.js` |
| `grosbaril` | `explodeBarrel` (`GROSBARIL_RADIUS_MUL`) |
| `tourelle` | `placeBlock` (`TURRET_EVERY`) |
| `constitution` | `choosePick` (`CONSTITUTION_HP`) |
| `aimant` | section « ramassage » de `update` (`AIMANT_*`) |
| `souffle` | `secondWind` (`rules/damage.js`) appelé par `hurtPlayer` ; `S.souffleUsed` ; marque dans le HUD |
| `prime` (pacte) | `killPoints` (`PRIME_POINTS_MUL`) et `waveQueue` (`PRIME_PACK_BONUS`) |
| `chair` (pacte) | `killPoints` (`CHAIR_POINTS_MUL`) et explosion du Gonflé (`CHAIR_RADIUS_MUL`, `game/combat.js`) ; rayon affiché dans `render/scene.js` |

## Combo, multiplicateur, score

| Concept | Implémentation |
| --- | --- |
| Combo | `S.combo` (+1 par kill dans `killEnemy`), `S.comboT` remis à `comboTime()` ; décroît dans `update`, retombe à 0 à expiration ; un coup encaissé retire `COMBO_HIT_DRAIN` s (`hurtPlayer`) |
| Multiplicateur | `multiplier(combo) = 1 + floor(combo / KILLS_PER_MULTIPLIER)` (`rules/modifiers.js`) |
| Frénésie | active si la carte est prise et `multiplier ≥ FRENZY_MULTIPLIER` |
| Points d'un kill | `killPoints(type, mods, multiplier)` (`rules/scoring.js`, `KILL_POINTS`) |
| Ajout au score | `addScore(n)` (`game/score.js`) : seul point d'entrée, déclenche les déblocages d'armes |
| Bonus de fin de vague | `WAVE_BONUS × vague`, dans `update` |
| Record | `world.best`, enregistré par `gameOver` sous `STORAGE_BEST` (`tete-carree-best`, clé à ne jamais changer) |
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

## Pièges

- Le tirage dépend de l'ordre de `MODS` : réordonner le tableau change les cartes proposées pour une
  même graine.
- Les textes `desc`/`plus`/`minus` sont de la documentation vivante surveillée par le hook Stop :
  plusieurs écrivent encore leurs nombres en dur (`1.4` de Combo tenace, `14 * n` de Barbelés,
  `100 + 25 * n` de Constitution, `5 * n` d'Aimant, « 40 % » de Second souffle…). Si tu changes la
  constante, change le texte.
