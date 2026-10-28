---
name: armes
description: Use when touching the arsenal in Tête Carrée — firing, ammo, weapon switching and unlocking, barricades, barrels, turrets, grenades, rockets or explosions.
auto_invoke: true
---

# L'arsenal

## Armes

L'arsenal est le tableau `W` de `src/config.js`. **L'index d'une arme est sa touche** (1 à 9) et
son ordre d'affichage dans le HUD : ne réordonne pas `W` sans le vouloir.

| `id` | Nom | Type | Implémentation (`fireWeapon`, `src/game/weapons.js`) |
| --- | --- | --- | --- |
| `pistol` | Pistolet | tir instantané, munitions infinies | `shoot(…)` avec `SHOTS.pistol`, perforation `1 + mod('perce')`, ricochets `mod('ricochet')` |
| `uzi` | Uzi | tir instantané rapide | `shoot(…)` avec `SHOTS.uzi` |
| `rifle` | Fusil d'assaut | tir instantané précis, longue portée | `shoot(…)` avec `SHOTS.rifle`, Perforantes et Ricochet comme l'Uzi |
| `shotgun` | Fusil à pompe | `pellets` plombs | boucle de `shoot(…)` avec `SHOTS.shotgun`, recul du joueur, Gros calibre sur le recul infligé |
| `wall` | Barricade | construction | `placeBlock('wall')` ; une sur `TURRET_EVERY` porte une tourelle avec la carte Tourelle |
| `barrel` | Baril | construction explosive | `placeBlock('barrel')` ; explose par `explodeBarrel` |
| `grenade` | Grenade | projectile en cloche | `world.grenades` ; explosion à `GRENADE_FUSE`, dans `update` (section « grenades ») |
| `rocket` | Lance-roquettes | projectile | `world.rockets` ; explose au contact (`ROCKET_HIT_REACH`), au mur ou en fin de course (`ROCKET_LIFE`), dans `update` (section « roquettes ») |
| `rail` | Railgun | tir perforant infini | `shoot(…)` avec `pierce = Infinity` ⇒ dégâts de type `'ap'` qui ignorent le bouclier du blindé |

Champs d'une arme dans `W` : `id`, `name` (bannières, HUD « Prochaine »), `short` (case d'arme),
`unlock` (score de déblocage), `cd` (délai entre deux tirs, s), `refill` (munitions d'une caisse).

## Concepts → implémentation

| Concept | Implémentation |
| --- | --- |
| Arme en main | `player.weapon` (index dans `W`) |
| Munitions | `ammo[i]` (`state/world.js`) ; `Infinity` pour le pistolet ; un tir à vide renvoie au pistolet (`EMPTY_SWAP_CD`) |
| Cadence | `player.cd = w.cd * fireMul()` ; `fireMul` (`rules/modifiers.js`) applique Gâchette nerveuse, Sans armure, Frénésie |
| Dispersion, vitesse, dégâts, recul | `SHOTS` (`src/config.js`) ; dispersion tirée par `jitter` (aléa de gameplay à graine) |
| Tir instantané | `shoot(ang, range, dmg, pierce, knock, look, bounce, from)` : lancer de rayon par pas de 4 px, `shotTile` (passe au-dessus des crevasses), tri des ennemis touchés, traçante dans `world.tracers` |
| Dégâts infligés | `hurtEnemy(e, dmg, dx, dy, knock, kind)` (`game/combat.js`) ; `kind` : `'bullet'`, `'ap'`, `'blast'` |
| Explosion | `explosion(x, y, R, dmg)` (`game/combat.js`) : chute des dégâts `BLAST_FALLOFF`, dégâts au joueur `BLAST_SELF_*`, constructions `BLAST_BLOCK_*`, barils en chaîne via `world.pending` (`BARREL_CHAIN_DELAY`) |
| Constructions | `blocks` (`Map` tuile → `{ kind, hp, max, turret? }`) ; pose impossible ⇒ `PLACE_FAIL_CD` ; toute pose/destruction met `world.fieldDirty = true` |
| Tourelle | `updateTurret(b, dt)` (`TURRET_*`), appelée depuis `update` (section « blocs ») |
| Déblocage au score | `addScore` (`game/score.js`) → `weaponsToUnlock`, `ammoOnUnlock` (`rules/unlock.js`, `UNLOCK_REFILLS`) |
| Caisse de munitions | section « ramassage » de `update` : `AMMO_REFILL_WEAPONS` armes tirées au sort, `+W[i].refill` |
| Changement d'arme | `selectWeapon(i)`, `cycleWeapon(dir)` ; clavier `Digit1`–`Digit9`, molette, `E`/`Q` ; manette LB/RB ; tactile ARME ; clic sur une case (`render/hud.js`) |
| Aspect | `GUNS` (longueur du canon) et `drawGun(id)` dans `render/sprites.js` ; sons `SFX` de `audio/sfx.js` |

## Ajouter une arme

1. Ajoute l'entrée dans `W` (`src/config.js`) à la place voulue — son index devient sa touche ; si
   tu dépasses 9 armes, la regex `Digit[1-9]` de `src/input/keyboard.js` et l'aide de l'écran titre
   doivent suivre. Ses réglages de tir vont dans `SHOTS` ou dans des constantes dédiées.
2. Ajoute son `case` dans `fireWeapon` (`src/game/weapons.js`) : tir via `shoot`, projectile dans une
   collection de `world`, ou pose via `placeBlock`. Garde la décrémentation des munitions commune.
3. Nouvelle collection de projectiles ⇒ déclare-la dans `world` et initialise-la dans `resetWorld`
   (`src/state/world.js`), fais-la avancer dans `src/loop/update.js` et filtre-la par
   `world.<collection> = world.<collection>.filter(…)`.
4. Dessin : longueur de canon dans `GUNS` et `case` dans `drawGun` (`src/render/sprites.js`) ;
   projectile dans `render()` (`src/render/scene.js`) en n'utilisant que les méthodes connues du
   proxy de contour (voir skill `rendu`).
5. Son : une entrée dans `SFX` (`src/audio/sfx.js`).
6. Tests : seuil de déblocage dans `tests/unlock.test.js` ; toute règle de dégâts nouvelle dans
   `src/rules/damage.js` + `tests/damage.test.js`.
7. Si une carte cite l'arme (Balles perforantes : « pistolet, Uzi et fusil d'assaut »), mets son texte à jour.

## Modifier l'équilibrage

Toutes les valeurs sont dans `src/config.js` (sections « Armes : tirs et explosifs »,
« Constructions », `W`). Les textes de cartes qui citent un effet chiffré écrivent le nombre en dur
(`Gros barils`, `Barbelés`…) : ils doivent rester vrais, le hook de synchronisation le vérifie.
