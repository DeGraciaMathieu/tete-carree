# Étape 2 : thèmes des arènes, les palettes

Partie du [mode Histoire](mode-histoire.md). Suppose l'[étape 1](arenes-chapitres.md) livrée.

## Objectif

Chaque arène des chapitres reçoit ses couleurs : bitume de nuit à Chinatown, neige en Sibérie, béton
humide et eau sale dans les égouts, terre battue au camp militaire. Le joueur reconnaît le chapitre au
premier coup d'œil. Cette étape ne change que des couleurs, tirées des maquettes. Les formes propres à
chaque décor (boutiques, mirador, conteneurs) et l'ambiance viennent à l'[étape 3](themes-decor-ambiance.md).
Les cinq arènes actuelles ne changent pas d'aspect.

## Socle technique

- `src/render/floor.js`, `paintFloor()` : sol peint une fois hors écran (`floorC`) à chaque nouvelle
  partie. Couleur de base `#b3b6af`, damier `rgba(0,0,0,.035)`, joints `rgba(0,0,0,.07)`, 3 000 grains
  sombres et clairs, 14 fissures `rgba(40,40,36,.18)`, gravats au bord des crevasses, rectangle
  pointillé jaune « façon entrepôt » `rgba(214,170,40,.55)`, ombre radiale devant chaque porte. Aléa
  cosmétique (`Math.random`, `rnd`) : autorisé ici.
- `src/render/scene.js`, chemin chaud :
  - `drawTile(tx, ty, kind)` : mur (dessus `#596166`, arête claire `#737c81`, flanc `#4c5357`, face
    `#3c4245`, hauteur 26 px) et caisse de plan (face `#8f6639`, traits `#6a4a28`, dessus `#b98c55`,
    lattes `#a57a46`, bord `#7d5a31`, hauteur 18 px) ;
  - `drawVoid(...)` : fond `#0c0d0e`, paroi du fond en dégradé `#73776f` → `#43463f`, rebord `#9a9e96` ;
  - ombres portées des murs `rgba(30,32,30,.16)`.
- `src/render/minimap.js` : `TILE_COLOR = ['#8d918a', '#596166', '#b98c55', '#0c0d0e']`, plan repeint
  quand `world.arena` change (`planArena`).
- `src/state/arena.js`, `buildMap(id)` : ne retient pas l'id construit. Le mode Histoire construira
  d'autres arènes que `world.arena` : le rendu doit lire l'arène **construite**, pas l'arène choisie
  sur l'accueil.
- `CLAUDE.md` : les couleurs restent hors de `config.js`, par choix.

## Comportement

### Un thème par arène

Un nouveau module `src/render/themes.js` décrit les thèmes et donne celui de l'arène construite :

- `beton` : les valeurs actuelles, à l'identique. Thème de l'Entrepôt, La Fosse, Colonnade, Bunker et
  Le Pont.
- `chinatown`, `siberie`, `egouts`, `militaire` : thème de l'arène du même nom.

Un thème regroupe des couleurs et quelques réglages, sans logique de dessin :

| Groupe | Clés | Utilisé par |
| --- | --- | --- |
| sol | base, damier, joints, grains sombres et clairs, fissures, gravats de bord de vide, marquage pointillé (ou aucun), ombre des portes | `paintFloor` |
| mur | dessus, arête claire, flanc, face, ombre portée | `drawTile`, ombres de `render()` |
| caisse | face, traits, dessus, lattes, bord | `drawTile` |
| vide | fond, haut de la paroi, bas de la paroi, rebord | `drawVoid` |
| mini-plan | sol, mur, caisse, vide | `minimap.js` |

### Palettes

Valeurs de départ, tirées des maquettes et à régler à l'œil en jeu :

| | sol | mur (dessus / face) | caisse (dessus / face) | vide | marquage |
| --- | --- | --- | --- | --- | --- |
| `beton` | `#b3b6af` | `#596166` / `#3c4245` | `#b98c55` / `#8f6639` | `#0c0d0e` | pointillé jaune |
| `chinatown` | `#2c2b31` (bitume) | `#7c3029` / `#5e2723` (brique) | `#8a6a42` / `#6a4f30` (étal) | — | aucun |
| `siberie` | `#dfe5ea` (neige) | `#eef3f6` / `#5b4634` (toit enneigé, planches) | `#4a4f55` / `#3a3f45` (brasero, caisse) | barbelés : neige `#dfe5ea` sous des fils `#3a3f45` | aucun |
| `egouts` | `#4f5a52` (béton humide) | `#5f5045` / `#4b3d33` (brique) | `#7a6a4a` / `#5c4f36` | `#2f4a3c` (eau), rebord `#1d2420` | aucun |
| `militaire` | `#a8946c` (terre) | `#6a7a44` / `#5d6b3a` (conteneur olive) | `#7a5a34` / `#5e4527` (munitions) | — | aucun |

Notes de rendu par thème :

- **Chinatown** : grains clairs rares, aucune fissure, flaques plus sombres à la place. Les reflets
  de néon colorés viennent à l'étape 3.
- **Sibérie** : grains gris-bleu, quelques traînées de pas tassées `#c3cbd2` à la place des fissures.
  Le vide de Sibérie, ce sont les barbelés, au ras de la neige : `drawVoid` n'y creuse pas de trou
  noir. Il peint la neige et quelques fils sombres croisés en aplats, sans paroi ni rebord. Les
  rouleaux en relief arrivent à l'étape 3.
- **Égouts** : le vide est de l'eau. Le fond est la couleur de l'eau au lieu du noir, la paroi du
  fond devient un rebord de pierre sombre, sans gravats. L'eau ne bouge pas encore (étape 3).
- **Camp militaire** : traces de pneus à la place des fissures.

### Arène construite

`state/arena.js` retient l'id de l'arène construite par `buildMap` (liaison exportée `mapId`,
réaffectée seulement dans `arena.js`). Le sol, les tuiles et le mini-plan lisent le thème de
`mapId`. Le cache du mini-plan se recale sur `mapId` au lieu de `world.arena`.

### Chemin chaud

Le thème courant se lit une fois par image, au début de `render()`. `drawTile` et `drawVoid` lisent
des propriétés de cet objet, sans créer d'objet ni de fonction par tuile. Pour l'eau, `drawVoid`
remplace le dégradé de paroi, aujourd'hui créé à chaque tuile et à chaque image, par des aplats.
Ailleurs, aucune allocation nouvelle.

## Hors périmètre

- Formes propres au décor (néons, toits, mirador, conteneurs, sacs de sable, passerelles, étals) et
  ambiance (pluie, neige, pénombre, projecteur, eau animée) : étape 3.
- Couleurs des ennemis, du joueur, des effets, du HUD.
- Autre thème pour les cinq arènes actuelles.
- Taches de sang adaptées au sol : `stampBlood` reste identique sur tous les thèmes.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | — | aucun (couleurs hors de `config.js`) |
| state | `src/state/arena.js` | `export let mapId`, posé par `buildMap(id)` |
| render | `src/render/themes.js` (nouveau) | thèmes et `themeOf(id)` |
| render | `src/render/floor.js` | `paintFloor` lit le thème de `mapId` |
| render | `src/render/scene.js` | `drawTile`, `drawVoid` et ombres portées lisent le thème courant |
| render | `src/render/minimap.js` | couleurs du thème, cache sur `mapId` |
| rules, game, loop, input, i18n | — | aucun |
| documentation | `docs/decisions.md`, `.claude/skills/rendu` | section « Thèmes des arènes » ; carte des modules (`render/themes.js`) dans le skill `architecture` |

## Critères d'acceptation

- Quand on choisit l'Entrepôt, La Fosse, Colonnade, Bunker ou Le Pont, alors l'arène est identique à
  avant l'étape, à l'œil sur une capture comparée.
- Quand on choisit Chinatown, Sibérie, les égouts ou le camp militaire, alors le sol, les murs, les
  caisses, le vide et le mini-plan prennent les couleurs du tableau.
- Quand on regarde les barbelés de Sibérie, alors on voit une clôture au ras du sol, pas un trou noir.
- Quand on change d'arène sur l'accueil, alors la démo et le mini-plan prennent aussitôt le nouveau thème.
- Quand un zombie, un cracheur ou une flaque d'acide est à l'écran, alors on le distingue du sol sur
  les quatre thèmes. Le cas le plus difficile est le bitume sombre de Chinatown avec le contour sombre.
- `npm test` passe. `npm run perf` reste sous le budget (10 Mo/s) sur l'Entrepôt et sur les égouts.

## Tests

- Pas de règle nouvelle, donc pas de test macro. Le test de `mapId` (« construire une arène retient
  son id ») s'écrit dans `tests/arenas.test.js`, car le mode Histoire en dépend.
- Vérifications manuelles :
  - captures avant et après sur les cinq arènes actuelles ;
  - lisibilité sur les quatre thèmes : zombie, diable, cracheur, blindé, flaque, sang, caisse de
    ravitaillement, barricade, tourelle, baril ;
  - mini-plan sur les neuf arènes ;
  - téléphone (contraste en plein jour) ;
  - `npm run perf`.

## Risques et questions ouvertes

- **Contraste sur le bitume de Chinatown** : le contour presque noir (`#0f1012`) se détache mal d'un
  sol `#2c2b31`, et le sang s'y voit à peine. Si le contrôle de lisibilité échoue, éclaircir le sol
  avant de toucher au contour.
- **Neige de Sibérie** : un sol très clair fait ressortir le sang et les brûlures, ce qui est voulu,
  mais il peut éblouir sur téléphone. À régler à l'œil.
- **Constructions du joueur** : barricades, tourelles et barils (`drawBlock`) gardent leur aspect
  actuel sur tous les thèmes. À revoir s'ils jurent avec un décor.
- Équilibrage et `rng` : aucun effet.
