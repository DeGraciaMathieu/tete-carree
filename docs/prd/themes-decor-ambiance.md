# Étape 3 : thèmes des arènes, décor et ambiance

Partie du [mode Histoire](mode-histoire.md). Suppose l'[étape 2](themes-palettes.md) livrée.

> **Révision du 30 octobre.** Le niveau de détail visé est celui des maquettes animées, pas celui d'un
> habillage case par case. Chaque arène est faite à part : une maquette sur le vrai plan 44 × 30, validée au
> cadrage du jeu, puis un module `render/decor/<arène>.js`. Ce module peint le sol et prépare une fois ses
> calques hors écran. Il dessine ses objets triés avec les personnages, puis ses lumières après la teinte de
> nuit (`docs/decisions.md`, « Thèmes des arènes »). Le plan d'une arène peut changer pour suivre sa
> maquette : c'est le cas de Chinatown, devenue une rue. Le tableau `look` et les variantes de case décrits
> plus bas ne sont pas utilisés : le module de l'arène reconnaît lui-même ses objets dans `map`. L'option
> « Ambiance », la pluie, les halos pré-rendus et `npm run perf -- 20 <arène>` sont faits avec Chinatown.
> Restent à faire : Camp de Sibérie, Les égouts, Camp militaire.

## Objectif

Donner à chaque chapitre son décor et son ambiance, comme sur la maquette des ambiances :

- Chinatown : devantures aux néons, guirlandes de lanternes, pluie de nuit ;
- Sibérie : baraquements enneigés, mirador, barbelés, braseros, neige qui tombe ;
- les égouts : eau qui ondule, passerelles, pénombre percée par les grilles ;
- camp militaire : conteneurs, sacs de sable, projecteur au crépuscule.

C'est ce qui fait sentir au joueur qu'il a changé de lieu. C'est aussi l'étape la plus risquée :
elle touche le chemin chaud du rendu et la lisibilité du combat.

## Socle technique

- `src/render/scene.js`, `render()` : sol, vide, ombres, acide au sol, feux, repères, liste triée
  par profondeur (tuiles de plan, constructions, caisses, ennemis, joueur, grenades, roquettes), halo
  de bouche, boules de feu, particules, balises, crachats, traçantes, explosions, textes flottants,
  Aveugle (`drawBlindness`), indicateurs, vignette. La liste triée est un chemin chaud : `CLAUDE.md`
  y interdit toute allocation évitable.
- `haloSprite` : modèle existant d'un dégradé pré-rendu, posé en mode `lighter` sans allocation par image.
- `src/render/canvas.js` : `cv`, `dpr`, `zoom`, `resize`.
- `src/state/arena.js` : plans, aides `rect`, `rect4`, `set4` ; `mapId` (étape 2).
- `src/render/themes.js` (étape 2).
- `scripts/perf.mjs` : 20 s de partie dans Chrome sans interface, budget de 10 Mo/s. Il joue
  aujourd'hui l'arène par défaut d'un profil vierge (Entrepôt).
- Pacte Aveugle : `AVEUGLE_SIGHT`, `drawBlindness`.

## Comportement

### Variantes de case

Un mur de Sibérie peut être un baraquement, un mirador ou des barbelés : la forme dépend de l'endroit,
pas seulement du type de case. Les plans le disent eux-mêmes. `state/arena.js` gagne un second tableau,
`look` (`Uint8Array` de `MW × MH`, remis à 0 par `buildMap`). Les aides `rect`, `rect4` et `set4`
prennent un dernier paramètre facultatif, la variante. `map` et toutes les règles ne changent pas :
la variante ne sert qu'au dessin.

| Arène | Variante | Cases (plans de l'étape 1) | Dessin |
| --- | --- | --- | --- |
| Chinatown | boutique (défaut des murs) | pâtés | briques, vitrine éclairée, enseigne au néon sur la face visible |
| | portique | `set4(19, 2, 1)` | pilier rouge à petit toit recourbé |
| | étal (défaut des caisses) | caisses | caisse à fruits et légumes |
| Sibérie | baraquement (défaut) | `rect4(7, 3, …)`, `rect4(3, 8, …)` | planches, toit enneigé |
| | mirador | `rect4(2, 2, 2, 2, 1)` | tour sur pieds, plateforme, toit enneigé, dessinée haute |
| | barbelés (cases de vide) | `rect4(12, 9, 7, 1, 3)`, `rect4(12, 9, 1, 3, 3)` | poteaux et rouleaux de barbelés bas et ajourés : on doit voir qu'on peut tirer au travers |
| | brasero | `set4(15, 12, 2)` | bidon avec flammes, source de lumière |
| | caisse (défaut) | autres caisses | caisse en bois |
| Égouts | brique (défaut) | — | briques, tuyau sur une face sur cinq |
| | pilier | `rect4(15, 11, …)`, `rect4(4, 3, …)` | pilier de pierre |
| | passerelle (case de sol) | sol taillé dans les canaux | caillebotis métallique peint sur le sol |
| | grille (case de sol) | trois ou quatre cases par quart, à placer | grille au sol, source de lumière |
| Camp militaire | conteneur (défaut) | `rect4(4, 3, …)`, `rect4(4, 9, …)`, `rect4(9, 8, …)` | conteneur nervuré ; couleur (olive, rouille, bleu) selon le groupe |
| | sacs de sable | `rect4(17, 9, …)` | deux rangs de sacs, plus bas qu'un mur |
| | munitions (défaut des caisses) | caisses | caisse kaki marquée |

Une variante change la silhouette, pas l'emprise : chaque case garde sa collision. Un dessin plus
haut qu'un mur (mirador) est trié par profondeur comme les autres tuiles. Les barbelés sont des cases
de vide, donc dessinées par `drawVoid` hors de la liste triée. Pour que les personnages qui les longent
passent devant ou derrière correctement, leurs poteaux entrent dans la liste triée comme une tuile basse.

### Décor sans collision

Il est dessiné par-dessus le jeu et ne bloque rien.

- **Chinatown** : deux guirlandes de lanternes au-dessus de la grande rue est-ouest (rangées 13 et 16),
  une lanterne toutes les 4 à 5 cases, posées au-dessus des personnages. Les néons des devantures
  clignotent doucement (sinus de `S.time`, pas de `Math.random` par image). Des reflets de néon
  roses et cyan sont peints sur le sol par `paintFloor`.
- **Égouts** : rais de lumière verticaux sous les grilles.
- **Camp militaire** : un projecteur, faisceau balayant l'arène d'un bord à l'autre en une dizaine de
  secondes.

### Ambiance

| Arène | Pénombre | Lumières | Particules |
| --- | --- | --- | --- |
| Chinatown | nuit, opacité .5 | lanternes, néons, halo du joueur | pluie oblique |
| Sibérie | aucune ; voile froid bleuté léger | braseros (lueur chaude) | neige |
| Égouts | pénombre verdâtre, opacité .55 | grilles, halo du joueur | gouttes isolées |
| Camp militaire | crépuscule, opacité .35 | projecteur, halo du joueur | aucune |

- **Pénombre** : un calque hors écran à la taille de l'écran (à demi-résolution si les mesures le
  demandent), refait à chaque image. On le remplit de la teinte de nuit, puis on y découpe les
  lumières en `destination-out` avec un sprite de lumière pré-rendu une fois (modèle de `haloSprite`),
  et on le pose sur la scène. Aucun `createRadialGradient` par image. Le calque est redimensionné par
  `resize`.
- **Halo du joueur** : rayon d'environ 5 cases. Sans lui, la pénombre serait une difficulté
  supplémentaire non voulue.
- **Ce qui émet de la lumière est dessiné après la pénombre** et reste donc vif : halo de bouche, feux,
  boules de feu, explosions, traçantes, particules, crachats d'acide, flaques d'acide (leur contour
  lumineux), lanternes et néons, textes flottants, indicateurs. Le reste (sol, murs, ennemis, joueur,
  caisses) est assombri.
- **Particules d'ambiance** : réserve fixe, allouée une fois (tableaux typés), en coordonnées d'écran,
  dessinée après la pénombre et avant la vignette. Pluie environ 140 traits, neige environ 160 points,
  gouttes une dizaine. Elles suivent `S.time` et se figent donc avec la pause, le choix de cartes et
  les dialogues.
- **Eau des égouts** : rides qui glissent lentement sur le vide (`S.time`), algues fixes. Un ennemi
  qui tombe dans un canal garde l'animation de chute actuelle.
- **Pacte Aveugle** (décision : les deux s'ajoutent) : sur une arène sombre, `drawBlindness` se pose
  en plus de la pénombre, sans réglage particulier.

### Option « Effets d'ambiance »

- Nouvelle entrée des Options, à l'accueil et dans la pause, sur le modèle de Contours (`optOl`) :
  bouton `.optAmb`, libellé « Ambiance : oui / non » (`tr.optAmb`). Activée par défaut.
- Désactivée : ni pénombre ni particules d'ambiance (pluie, neige, gouttes), ni faisceau du projecteur.
  Le décor (formes, néons, lanternes) et les couleurs du thème restent. Le pacte Aveugle s'applique
  toujours.
- Choix retenu sous une nouvelle clé, `STORAGE_AMBIANCE` (`tete-carree-ambiance`, `'1'` ou `'0'`). La
  lecture et l'écriture passent sous `try/catch`.

### Performances

- Après chaque thème : `npm run perf` **sur cette arène**. `scripts/perf.mjs` accepte l'arène en
  second argument (`npm run perf -- 20 egouts`). Il écrit `STORAGE_ARENA` dans le profil vierge avant
  de lancer la partie.
- Budget inchangé : 10 Mo/s. On vise aussi aucune baisse de fps visible au compteur intégré, sur
  ordinateur et sur un téléphone moyen.

## Hors périmètre

- Sons d'ambiance (pluie, vent, gouttes).
- Particule d'éclaboussure à la chute dans l'eau.
- Interaction avec le décor : lanternes à abattre, projecteur qui suit le joueur, neige qui ralentit.
- Décor ou ambiance pour les cinq arènes actuelles.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `STORAGE_AMBIANCE` ; couleurs, particules et lumières restent hors de `config.js` |
| i18n | `src/i18n/fr.js`, `src/i18n/en.js` | `optAmb` (libellé de l'option) |
| input | `src/input/buttons.js` | boutons `.optAmb` (Options de l'accueil et pause) |
| DOM | `index.html` | bouton `.optAmb` dans les Options et la pause |
| state | `src/state/arena.js` | tableau `look`, paramètre de variante sur `rect`, `rect4`, `set4`, variantes posées dans les quatre plans, grilles des égouts |
| render | `src/render/themes.js` | variantes, décor, réglages d'ambiance par thème |
| render | `src/render/ambiance.js` (nouveau) | pénombre, sprite de lumière, réserve de particules, projecteur, redimensionnement |
| render | `src/render/scene.js` | `drawTile` par variante, ordre des couches (pénombre puis effets lumineux), décor au-dessus des personnages |
| render | `src/render/floor.js` | reflets de néon, passerelles et grilles peints sur le sol |
| render | `src/render/canvas.js` | `resize` redimensionne le calque de pénombre |
| scripts | `scripts/perf.mjs` | arène en second argument |
| documentation | `docs/decisions.md`, `CLAUDE.md`, skill `rendu` | ordre des couches, règle « ce qui émet de la lumière passe après la pénombre », `npm run perf` par arène ; chemins chauds : ajouter `render/ambiance.js` ; clé `tete-carree-ambiance` ajoutée à la liste des clés à ne pas changer |

## Critères d'acceptation

- Quand on joue sur chacune des quatre arènes, alors on retrouve le décor et l'ambiance du tableau,
  proches de la maquette.
- Quand un ennemi est à 5 cases du joueur dans la pénombre de Chinatown ou des égouts, alors on le
  voit et on reconnaît son type.
- Quand un cracheur tire, alors la trajectoire du crachat et la flaque se voient dans la pénombre.
- Quand on ouvre la pause, le choix de cartes ou un dialogue, alors la pluie, la neige et le projecteur
  se figent.
- Quand on redimensionne la fenêtre ou qu'on tourne le téléphone, alors la pénombre couvre tout l'écran,
  sans bande ni décalage.
- Quand on joue sur l'une des cinq arènes actuelles, alors rien ne change, et elles n'ont ni calque
  de pénombre ni particules d'ambiance.
- Quand on coupe « Ambiance », alors la pénombre, la pluie, la neige et le projecteur disparaissent
  aussitôt, en partie comme sur l'accueil, et le choix est retrouvé au prochain lancement.
- Quand Aveugle est pris à Chinatown, alors la pénombre et l'aveuglement s'ajoutent.
- `npm run perf` passe sur les neuf arènes. `npm test` passe.

## Tests

- `tests/arenas.test.js` : « les variantes de décor ne touchent jamais une case de sol ouverte à la
  marche, sauf passerelles et grilles ». Cela garantit que `look` ne déplace aucune collision.
- Vérifications manuelles :
  - lisibilité de chaque type d'ennemi dans la pénombre ;
  - Aveugle sur Chinatown et les égouts ;
  - téléphone en luminosité réduite ;
  - fps au compteur pendant une vague 10 sur chaque thème ;
  - redimensionnement de la fenêtre et rotation du téléphone ;
  - `prefers-reduced-motion` (aucun changement attendu, à constater).

## Risques et questions ouvertes

- **Aveugle sur une arène sombre** : le cumul est voulu, mais peut devenir illisible. À régler à l'œil
  (opacité de la pénombre), sans couper l'un des deux.
- **Ambiance coupée** : sans pénombre, Chinatown et les égouts deviennent plus faciles. C'est accepté :
  l'option sert au confort et aux machines lentes.
- **Coût de la pénombre** : remplir et composer un calque plein écran à chaque image coûte en
  remplissage (GPU), pas en allocations. `npm run perf` ne le mesure donc pas. Le contrôle passe par
  le compteur de fps sur téléphone. La demi-résolution est la parade prévue.
- **Démo de l'accueil** : la démo tourne sur l'arène choisie. Choisir Chinatown fait donc tourner la
  pénombre derrière le menu, ce qui est voulu (aperçu), mais à mesurer.
- Équilibrage et `rng` : aucun effet. Le halo du joueur et la pénombre jouent sur la visibilité :
  c'est un effet de jeu réel, réglé à l'œil, sans constante d'équilibrage.
