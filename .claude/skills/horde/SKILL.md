---
name: horde
description: Use when touching enemies, waves, spawning, the arena grid, crevasses or how the horde finds its way to the player in Tête Carrée.
auto_invoke: true
---

# La horde : ennemis, vagues, arène

## Types d'ennemis

Chaque ennemi est un objet simple de `world.enemies`, créé par `spawnEnemy(type, door)`
(`src/game/enemies.js`). Son type est une lettre.

| Type | Nom (jeu) | Particularité | Où dans le code |
| --- | --- | --- | --- |
| `z` | zombie | corps à corps | comportement commun de `update` |
| `r` | coureur | rapide, fragile, arrive en meute `p<n>` | meute éclatée par `spawnEnemy('p<n>')` sur plusieurs côtés ; `drawRunner` |
| `b` | Gonflé | mèche allumée au contact (`e.fuse`, `BLOATER_FUSE`), explose à sa mort comme à ton contact | `update` (`e.type === 'b'`) et `killEnemy` poussent dans `world.bursts`, que `update` transforme en `toxicBurst` (`game/combat.js`) ; `drawBloater` |
| `s` | cracheur | garde ses distances, crache de l'acide (flaques) | `update` (`SPITTER_*`), `spit`/`updateGlobs` dans `game/enemies.js` ; `drawSpitter` |
| `a` | blindé | bouclier de face (`e.shield`), repousse le joueur | `resolveEnemyHit` dans `rules/damage.js` ; `ARMOR_SHOVE` dans `update` ; `drawArmored` |
| `d` | diable | lance des boules de feu à distance (`e.fire`) | `update` (`DEVIL_*`, `FIREBALL_*`) ; `drawChar` |

Champs d'un ennemi : `type`, `r`, `hp`, `sp` (vitesse), `x`, `y`, `vx`, `vy`, `fx`/`fy` (orientation),
`atk` (délai avant le prochain coup), `flash`, `walk` (phase d'animation), `dead`, `bump` (bloc heurté),
`knockT` (projeté), plus `shield`/`shieldMax`, `spitCd`/`wind`, `fire`, `fuse` selon le type.

## Statistiques et équilibrage (`src/config.js`, section « Ennemis »)

| Concept | Constante |
| --- | --- |
| Rayon, PV et vitesse par type, progression par vague | `ENEMY_STATS` (`hp + vague × hpWave`, `sp + min(spCap, vague × spWave) + tirage × spRand`) |
| Points par kill | `KILL_POINTS` |
| Chance de lâcher une caisse | `DROP_CHANCE`, `DROP_HP_CHANCE` |
| Dégâts au corps à corps, cadence | `ENEMY_MELEE_DAMAGE`, `ENEMY_ATTACK_CD`, `ENEMY_FIRST_ATTACK`, `MELEE_REACH` |
| Coups portés aux constructions | `ENEMY_BLOCK_DAMAGE`, `BLOCK_ATTACK_CD` |
| Gonflé | `BLOATER_RADIUS`, `BLOATER_DAMAGE`, `BLOATER_FUSE`, `BLOATER_FUSE_SPEED`, `BLOATER_TRIGGER_REACH` |
| Cracheur et acide | `SPIT_*`, `SPITTER_*`, `ACID_*`, `PUDDLE_*` |
| Blindé | `SHIELD_*`, `ARMOR_*` |
| Diable | `DEVIL_*`, `FIREBALL_*` |
| Plafond d'ennemis simultanés | `MAX_ENEMIES` |

## Vagues

| Concept | Implémentation |
| --- | --- |
| Lancement d'une vague | `startWave()` (`game/enemies.js`) : `S.wave++`, `S.queue = waveQueue(…)` |
| Composition | `waveQueue(n, mods, rng)` (`rules/waves.js`) : `WAVE_ZOMBIES_BASE + n × WAVE_ZOMBIES_PER_WAVE` zombies, puis chaque type de `WAVE_UNITS` à partir de sa vague `from`, au nombre de `floor((n − offset) × scale)` |
| Ordre de sortie | clé tirée dans la fenêtre `key` de chaque type, file triée, sortie par la fin (`pop`) |
| Meute de coureurs | entrée `'p' + taille` (`PACK_*`, `PRIME_PACK_BONUS` de Prime de risque) |
| Restants affichés | `queueCount(S.queue)` + ennemis vivants (une meute compte pour chaque coureur) |
| Cadence d'apparition | `spawnBurst(wave)`, `spawnGap(wave)` (`SPAWN_*`), consommées dans `update` via `S.spawnT` |
| Pause entre vagues | `FIRST_BREAK`, `WAVE_BREAK`, `S.breakT` ; bonus `WAVE_BONUS × vague` ; choix de carte (`openPick`) après `PICK_DELAY` |

## Arène et déplacement de la horde

| Concept | Implémentation |
| --- | --- |
| Grille | `map` (`Uint8Array(MW × MH)`, `state/arena.js`) : `0` sol, `1` mur, `2` caisse, `3` crevasse ; plan choisi sur l'accueil (`world.arena`, liste `ARENAS` de `config.js`), construit par `buildMap(id)` à partir de `PLANS` ; toutes les arènes gardent la bordure, les huit portes et la case de départ (22, 15) |
| Portes d'apparition | `doors`, `doorSet` (milieu de chaque bord) |
| Constructions posées | `blocks` (`Map` indexée par tuile, `state/world.js`) |
| Requêtes de tuiles | `rules/map.js` (pur, `map`/`blocks` en paramètres) ; wrappers liés à l'état dans `state/arena.js` |
| Collisions | `moveCircle(e, dx, dy, fly)`, `unstick(e)` (`state/arena.js`) ; `fly` : en l'air, le vide ne bloque pas |
| Chute dans une crevasse | ennemi projeté (`knockT > 0`) au-dessus d'un `isVoid` ⇒ `killEnemy(e, 0, 0, true)` |
| Chemin vers le joueur | `computeField` (Dijkstra, `rules/pathfield.js`) recalculé quand `world.fieldDirty` ou toutes les `FIELD_PERIOD` s ; `nextStep(e)` donne la tuile suivante ; une construction coûte `PATH_BLOCK_COST` (la horde la défonce) |
| Approche directe | à moins de `T × 1,3` avec `walkLine` libre, l'ennemi vise le joueur sans le champ |

**Bug connu, ne pas corriger en passant** : `relax()` dans `rules/pathfield.js` saute des tuiles
à cause de l'arrondi `Float32Array` ; certaines tuiles n'ont pas de `nextStep`. Documenté par le
`test.fails` de `tests/pathfield.test.js` et dans `docs/decisions.md`.

## Ajouter un type d'ennemi

1. Choisis une lettre libre et ajoute ses statistiques dans `ENEMY_STATS`, ses entrées dans
   `KILL_POINTS`, `DROP_CHANCE`, `ENEMY_MELEE_DAMAGE`, `ENEMY_ATTACK_CD`, `ENEMY_BLOCK_DAMAGE`
   (`src/config.js`). Attention : un type absent d'`ENEMY_STATS` retombe sur les stats du diable.
2. Pour qu'il apparaisse dans les vagues : une entrée dans `WAVE_UNITS`, et une boucle dans
   `waveQueue` (`src/rules/waves.js`) — l'ordre des tirages `rng()` change pour les vagues concernées.
3. Champs propres au type : dans `spawnEnemy` (`src/game/enemies.js`), comme `shield` ou `spitCd`.
4. Comportement par image : une branche `e.type === '<lettre>'` dans la section « ennemis » de
   `src/loop/update.js` ; la cadence d'animation `e.walk` y est aussi choisie par type.
5. Règle de dégâts spécifique : `src/rules/damage.js`, appelée depuis `hurtEnemy` (`src/game/combat.js`).
6. Dessin : une fonction `draw<Nom>` dans `src/render/sprites.js` et sa branche dans les deux
   aiguillages par type de `src/render/scene.js` (chutes et liste triée).
7. Tests : composition dans `tests/waves.test.js`, règle propre dans le test du module concerné.
8. Documentation vivante : le paragraphe « Bestiaire et astuces » de `index.html`, et la bannière
   d'annonce de sa première vague dans `startWave` (`src/game/enemies.js`).

## Modifier une vague ou l'équilibrage

Change les constantes de `src/config.js`, puis vérifie `tests/waves.test.js` : plusieurs tests
annoncent des nombres vus par le joueur (« 13 zombies en vague 1 », « deux par deux à partir de la
vague 7 »). Si la règle annoncée change, le test et le texte de l'écran titre changent avec elle.
