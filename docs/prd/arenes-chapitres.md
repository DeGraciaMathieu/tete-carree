# Étape 1 : les quatre arènes des chapitres

Partie du [mode Histoire](mode-histoire.md).

## Objectif

Ajouter les plans des quatre chapitres (Chinatown, Camp de Sibérie, Les égouts, Camp militaire) et
les rendre jouables tout de suite en mode Arène. Le joueur gagne quatre terrains de jeu différents
des cinq actuels. Le mode Histoire viendra s'appuyer sur ces plans (étape 4). Leur habillage
graphique arrive aux étapes 2 et 3 : à cette étape, ils ont l'aspect de l'Entrepôt.

## Socle technique

- `src/state/arena.js` : `PLANS` (un plan = une fonction `(cx, cy)` qui écrit dans `map`),
  aides `rect`, `rect4` (rectangle reporté dans les quatre quarts), `set4` (case reportée dans les
  quatre quarts), `buildMap(id)` qui pose la bordure, ouvre les huit cases de porte puis appelle le plan.
- Types de case de `map` : `0` sol, `1` mur, `2` caisse, `3` vide. La caisse de plan arrête les
  corps et les tirs comme un mur (`tileAt` de `rules/map.js` rend `1` pour toute case non nulle) et
  ne se détruit pas. Le vide arrête les corps mais laisse passer balles, roquettes et boules de feu ;
  la roulade le franchit, un ennemi projeté y tombe (`world.fallers`).
- `src/config.js` : `ARENAS` (ordre du sélecteur), `T = 32`, `MW = 44`, `MH = 30`.
- `src/i18n/fr.js` et `en.js` : `arenas` (nom affiché par « Arène : … »).
- `src/game/flow.js` : `chooseArena(d)` fait défiler `ARENAS` ; choix retenu sous `STORAGE_ARENA`.
- `tests/arenas.test.js` : `describe.each(ARENAS)`, qui couvre d'office toute arène ajoutée à la liste
  (départ libre, huit portes atteignables, aucune case de sol enfermée).
- `docs/decisions.md`, « Arènes au choix » et « Open questions » : part du sol sans chemin à cause
  du bug d'arrondi du champ de distances (Entrepôt 11 %, Bunker 66 %…).

## Comportement

### Les plans

Ils ont été validés sur la maquette. Ils sont symétriques et respectent les invariants des arènes
actuelles : bordure, deux cases de porte au milieu de chaque côté, case de départ libre au centre
(22, 15). À reporter tels quels dans `PLANS` :

```js
  // quatre pâtés de boutiques séparés par des ruelles, une grande rue est-ouest et une nord-sud,
  // un portique à chaque entrée nord et sud, des étals dans les rues
  chinatown() {
    rect4(3, 3, 7, 6, 1); rect4(12, 3, 6, 6, 1);
    rect4(3, 11, 7, 2, 1); rect4(12, 11, 4, 2, 1);
    set4(19, 2, 1);
    set4(7, 14, 2); set4(14, 14, 2); set4(20, 7, 2);
  },
  // baraquements en long, un mirador dans chaque coin, enceinte de barbelés autour de la place
  // d'appel, ouverte face aux portes ; braseros sur la place. Les barbelés sont du vide : ils arrêtent
  // les corps et laissent passer les tirs
  siberie() {
    rect4(2, 2, 2, 2, 1);
    rect4(7, 3, 11, 3, 1); rect4(3, 8, 3, 5, 1);
    rect4(12, 9, 7, 1, 3); rect4(12, 9, 1, 3, 3);
    set4(15, 12, 2); set4(9, 7, 2); set4(10, 7, 2);
  },
  // deux canaux est-ouest et deux nord-sud découpent l'arène en salles ; une passerelle devant chaque
  // porte, une par rive, une à chaque croisement nord-sud ; piliers dans les salles
  egouts(cx, cy) {
    rect(1, 7, MW - 2, 2, 3); rect(1, MH - 9, MW - 2, 2, 3);
    rect(10, 1, 2, MH - 2, 3); rect(MW - 12, 1, 2, MH - 2, 3);
    rect(cx - 1, 7, 2, 2, 0); rect(cx - 1, MH - 9, 2, 2, 0);
    rect(10, cy - 1, 2, 2, 0); rect(MW - 12, cy - 1, 2, 2, 0);
    rect4(5, 7, 1, 2, 0); rect4(10, 4, 2, 1, 0);
    rect4(15, 11, 2, 2, 1); rect4(4, 3, 2, 2, 1);
    set4(7, 12, 2); set4(17, 4, 2);
  },
  // conteneurs le long des bords, deux postes de sacs de sable en U qui couvrent le centre,
  // ouverts face aux portes ; caisses de munitions entre les deux
  militaire() {
    rect4(4, 3, 6, 2, 1); rect4(4, 9, 2, 5, 1); rect4(9, 8, 5, 2, 1);
    rect4(17, 9, 4, 1, 1); rect4(17, 9, 1, 2, 1);
    set4(8, 6, 2); set4(15, 13, 2);
  },
```

Mesures relevées sur la maquette (marche case par case depuis le centre), avec les barbelés de
Sibérie passés en vide :

| Arène | Murs hors bordure | Caisses | Vide | Sol relié au centre |
| --- | --- | --- | --- | --- |
| Chinatown | 404 | 12 | 0 | 100 % |
| Camp de Sibérie | 208 | 12 | 36 (barbelés) | 100 % |
| Les égouts | 32 | 8 | 232 | 100 % |
| Camp militaire | 148 | 8 | 0 | 100 % |

### Identifiants et noms

| Id | Français | Anglais |
| --- | --- | --- |
| `chinatown` | Chinatown | Chinatown |
| `siberie` | Camp de Sibérie | Siberian Camp |
| `egouts` | Les égouts | The Sewers |
| `militaire` | Camp militaire | Army Camp |

`ARENAS` devient `['entrepot', 'fosse', 'colonnade', 'bunker', 'pont', 'chinatown', 'siberie', 'egouts', 'militaire']` :
les nouvelles arènes s'ajoutent à la fin, l'arène par défaut reste l'Entrepôt et un choix déjà
enregistré sous `STORAGE_ARENA` reste valable.

### En mode Arène

- Le sélecteur « Arène : … » de l'accueil passe par les neuf arènes, dans l'ordre de `ARENAS`, avec
  les mêmes commandes qu'aujourd'hui (clic, Entrée, ← →, croix et stick de la manette).
- La démo de l'accueil repart sur l'arène choisie, comme pour les cinq autres, et le mini-plan la montre.
- Partie, apparitions aux portes, caisses de ravitaillement, caméra : rien ne change. Dans les égouts,
  les canaux se comportent exactement comme les crevasses de La Fosse et du Pont.
- **Barbelés de Sibérie** (décision : les balles les traversent). Ce sont des cases de vide, avec
  toutes les règles du vide, sans en créer de nouvelle :
  - ils arrêtent le joueur et les ennemis qui marchent ;
  - balles, roquettes, boules de feu et crachats passent au-dessus ;
  - la roulade les franchit, comme une crevasse ;
  - un ennemi projeté dedans par une explosion ou un recul y reste pris : il sort du jeu avec
    l'animation de chute actuelle, comme dans une crevasse.

  Jusqu'à l'étape 3, ils s'affichent comme des crevasses. Leur dessin de barbelés arrive avec le décor.
- Records communs à toutes les arènes, comme aujourd'hui.

## Hors périmètre

- Thème graphique (étapes 2 et 3) : les quatre arènes ont l'aspect de l'Entrepôt.
- Mode Histoire (étapes 4 à 6).
- Correction du bug d'arrondi du champ de distances.
- Records par arène.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | quatre ids ajoutés à la fin de `ARENAS` |
| i18n | `src/i18n/fr.js`, `src/i18n/en.js` | quatre noms dans `arenas` |
| state | `src/state/arena.js` | quatre plans dans `PLANS`, avec leur commentaire d'une ligne |
| rules, game, loop, render, input | — | aucun |
| tests | `tests/arenas.test.js` | rien à écrire : `describe.each(ARENAS)` couvre les nouvelles arènes ; une mesure de plus (voir Tests) |
| documentation | `docs/decisions.md` | « Arènes au choix » : neuf arènes ; « Open questions » : part du sol sans chemin des quatre nouvelles |

## Critères d'acceptation

- Quand on fait défiler « Arène : … », alors on voit, après Le Pont, Chinatown, Camp de Sibérie,
  Les égouts et Camp militaire, puis on revient à l'Entrepôt.
- Quand on lance une partie sur l'une d'elles, alors le joueur démarre au centre, les ennemis entrent
  par les huit portes et rejoignent le joueur.
- Quand on rouvre le jeu, alors l'arène choisie est retrouvée (`tete-carree-arena`).
- Quand un ennemi est projeté dans un canal des égouts, alors il y tombe comme dans une crevasse.
- Quand on tire à travers les barbelés de Sibérie, alors les balles passent. Quand on y marche, on
  est arrêté. Quand on les franchit en roulade, on passe.
- `npm test` passe, avec les trois tests d'arène sur les neuf arènes et le `test.fails` du champ de
  distances toujours en échec attendu.

## Tests

- `tests/arenas.test.js` : les tests existants tournent sur les neuf arènes.
- Mesure de la part du sol sans chemin (`computeField` puis `UNREACHABLE`) pour les quatre arènes,
  avec la méthode qui a donné les chiffres de l'Entrepôt et du Bunker, reportée dans la question
  ouverte du bug d'arrondi. Ce n'est pas une assertion : le bug est conservé volontairement.
- Vérifications manuelles : une partie de deux vagues par arène, au clavier ; la démo de l'accueil sur
  chaque arène pendant une minute (le pilote automatique ne doit pas rester coincé contre un canal ou
  un baraquement) ; le mini-plan.

## Risques et questions ouvertes

- **Bug d'arrondi du champ de distances** : un plan découpé (égouts, Chinatown) peut laisser plus de
  sol sans chemin que l'Entrepôt (11 %). Dans ces zones, les ennemis marchent droit sur le joueur et
  butent sur les murs. Si la mesure dépasse nettement celle de l'Entrepôt, retoucher le plan plutôt
  que corriger le bug, qui est une décision à part.
- **Pilote de la démo** dans les égouts : il ne connaît pas les canaux. Un pilote qui tourne en rond
  sur une rive se verra sur l'accueil.
- **Barbelés en vide** : un ennemi projeté dans les barbelés quitte le jeu comme s'il tombait dans
  une crevasse. C'est un peu étrange pour une clôture, mais c'est le prix d'une règle de case
  existante. Si cela choque en jeu, il faudra un cinquième type de case (arrête les corps sans les
  faire tomber), qui touche `rules/map.js`.
- **Chinatown, 404 cases de mur** : la vue est très fermée et les tirs à longue portée (fusil, rail)
  servent moins. C'est assumé pour un décor de ruelles, à surveiller en jeu.
- Équilibrage : aucune constante touchée, aucun tirage `rng` ajouté ni réordonné.
