# Refactor decisions

Written by `/refactor-game`. Records what the code cannot express: why this layout, why
this toolchain, what was deliberately not touched, what is still undecided.

Read by `/scaffold-claude` so it does not have to re-deduce any of it.

## Deployment target

**Cible itch.io, base relative, zip de dist/.**

- Le jeu est publié sur itch.io comme jeu HTML jouable dans le navigateur, servi dans une iframe
  depuis un sous-dossier du CDN d'itch : tous les chemins doivent être relatifs.
- `vite.config.js` fixe `base: './'` ; `npm run build` produit `dist/` avec `index.html` à sa racine.
- `npm run package` zippe le **contenu** de `dist/` (pas le dossier) dans `tete-carree-itch.zip`,
  le fichier à téléverser sur itch.io. Le script utilise la commande système `zip` (macOS, Linux).
- Seule ressource externe : les deux polices Google Fonts (liens absolus `https://`, conservés tels quels).
- Le compteur de FPS est masqué par défaut dans la version publiée : `SHOW_FPS_BY_DEFAULT = false`
  dans `src/config.js`. C'est le **seul changement de comportement voulu** du refactor. Un réglage
  déjà enregistré par le joueur (`tete-carree-fps`) reste prioritaire.
- Clés `localStorage` conservées à l'identique pour que les joueurs gardent record et réglages :
  `tete-carree-best`, `tete-carree-fps`, `tete-carree-outline` (constantes `STORAGE_*` de `config.js`).
- Comportements navigateur conservés tels quels : son démarré au premier geste, pause sur `blur`
  et `visibilitychange`, `navigator.getGamepads` protégé par `try/catch`, contrôles tactiles,
  meta viewport et `env(safe-area-inset-*)`, liens Google Fonts.

## Archetype

Selected: `real-time canvas`
Why: boucle `requestAnimationFrame` à `dt` variable plafonné à 1/30 s, entités en tableaux
d'objets simples, collisions, apparitions, score et combo.
Does not fit:
- Une **grille de tuiles avec champ de Dijkstra** (crevasses, constructions posées) : morceau
  d'archétype « grille », d'où `state/arena.js`, `rules/map.js` et `rules/pathfield.js`.
- Une **phase de choix de cartes** au tour par tour (`world.state === 'pick'`) au milieu du temps réel.
- Un **HUD en DOM**, pas sur le canvas : `render/hud.js` est séparé de la scène.
- Un **sol peint hors écran et mutable** (sang, brûlures tamponnés en jeu) : `render/floor.js`.
- Une **passe de contour** qui remplace temporairement `ctx` par un proxy (`OLP`) : le contexte
  et la passe vivent dans le même module, `render/canvas.js`, et les autres modules lisent `ctx`
  par liaison vivante ES.
- Beaucoup de logique de jeu est entremêlée d'effets (sons, particules, bannières). Elle vit dans
  `src/game/` (orchestration règle → état → effets), un dossier ajouté à l'arborescence de l'archétype.

## Toolchain

Branch: `vite`
Triggering signal: plus de 2 000 lignes de JavaScript (environ 2 300) et réécriture du chemin de
base pour le déploiement (itch.io, `base: './'`).
Node: 22
Test runner: `vitest` (seules dépendances de dev : `vite`, `vitest` ; aucune dépendance runtime)

Ouvrir `index.html` par double-clic ne fonctionne plus (ESM natif non servi en `file://`) :
`npm run dev`, ou `npm run build` puis servir `dist/`.

## Layout

| Module | Responsibility | Came from (sections du prototype) |
| --- | --- | --- |
| `index.html` | Structure des écrans, HUD, contrôles tactiles, meta viewport, polices | HTML d'origine |
| `src/style.css` | Styles, safe-area, mise en page mobile | `<style>` d'origine |
| `src/config.js` | Constantes : arène, armes, cartes, raretés, équilibrage, clés de stockage, `SHOW_FPS_BY_DEFAULT` | constantes et valeurs magiques |
| `src/util.js` | `$`, `rnd` (cosmétique), `clamp`, `fmt` | en-tête du script |
| `src/rules/` | Décisions pures (voir ci-dessous) | extraites une à une à l'étape 5 |
| `src/state/world.js` | Session `S`, `player`, collections, objet `world`, RNG à graine, `resetWorld` | État, Score |
| `src/state/arena.js` | Grille, construction de l'arène, collisions, champ de la horde | Carte, Collisions & grille, Champ de distances |
| `src/game/*.js` | Orchestration du gameplay : combat, armes, ennemis, joueur et roulade, score, écrans | Joueur, Tirs, Ennemis, Vagues, Roulade, Écrans |
| `src/render/*.js` | Canvas et contour, sol, effets, sprites, scène, HUD, FPS | Rendu, Sol, Effets, Bannière, HUD, Lisibilité, Compteur de FPS |
| `src/audio/sfx.js` | Sons synthétisés Web Audio | Audio synthétisé |
| `src/input/*.js` | Clavier/souris (et pause auto), tactile, boutons, manette | Entrées, Écrans (boutons), Manette |
| `src/loop/update.js` | Pas de simulation `update(dt)` | Mise à jour |
| `src/loop/frame.js` | Boucle rAF | Boucle |
| `src/main.js` | Point d'entrée : import des modules d'entrée, démarrage | fin du script |

### Écarts assumés avec le tableau de couches

- **`world`** (`state/world.js`) : un module ES ne peut pas réaffecter une liaison importée.
  Les valeurs réaffectées depuis plusieurs modules (`state` de l'écran, `best`, `shake`,
  `fieldDirty` et les 15 collections filtrées par `update`) sont donc des propriétés de l'objet
  `world`. Les autres (`S`, `player`, `blocks`, `unlocked`, `ammo`, `cam`) restent des liaisons
  exportées, réaffectées uniquement par `resetWorld`.
- **Les modules `input/` appellent directement des actions de `game/`** (rouler, changer d'arme,
  choisir une carte), comme le prototype. Les remplacer par une file d'intentions aurait changé le
  moment où l'action s'applique dans l'image.
- **`render/hud.js` câble les clics sur les emplacements d'armes** (`selectWeapon`) et joue le
  son de la bannière ; `render/effects.js` ajoute des particules à `world.parts`.
- **Les règles s'importent entre elles** (`waves`, `cards`, `scoring`, `damage` → `modifiers` ;
  `pathfield` → `map`). Elles restent pures.
- Les modules d'entrée posent leurs écouteurs à l'import ; `main.js` les importe explicitement.

## Constantes : ce qui va dans `config.js`

- **Dans `config.js`** : tout ce qui règle l'équilibrage du jeu — PV, dégâts, rayons d'explosion,
  cadences et délais de jeu, portées, vitesses de projectiles, statistiques par type d'ennemi
  (`ENEMY_STATS`, `ENEMY_MELEE_DAMAGE`…), tirs par arme (`SHOTS`), composition des vagues, effets
  des cartes, clés de stockage, `SHOW_FPS_BY_DEFAULT`.
- **Laissé en place** : ce qui ne règle que l'aspect ou la sensation — couleurs et palettes,
  traçantes, tremblement d'écran, vibrations, hauteur et rebond des trajectoires, particules, sons —
  ainsi que les constantes internes d'algorithmes (coût diagonal 1,414 et décalage 1000 des zones
  coupées dans `pathfield.js`).
- Les textes des cartes (`MODS[].desc`) gardent leurs nombres en clair : ce sont des libellés.
- Les plans des arènes (murs, caisses, crevasses dans `PLANS`, portes dans `buildMap`) et la position de départ du
  joueur restent dans `state/arena.js` et `state/world.js` : ce sont des données de niveau, pas des réglages.
  Seule la liste des identifiants (`ARENAS`) est dans `config.js`, pour que `world.js` la lise au chargement
  sans dépendre de l'ordre d'évaluation du cycle `world.js` ↔ `arena.js`.

## Vérification de non-régression

- Chaque règle extraite : test macro + équivalence avec l'original (champ de distances comparé
  tuile à tuile sur 140 positions du joueur ; sorties de toutes les règles comparées octet à octet
  avant/après le déplacement des constantes, sur un large échantillon de graines).
- Rejeu déterministe image par image (banc hors dépôt) : `Math.random` à graine, horloge virtuelle
  (rAF et `performance.now` pilotés), mêmes entrées aux mêmes images, sur l'original (`f0f7763`)
  et sur une variante jetable du refactor où `rng = Math.random` (même flux aléatoire). Une partie
  complète en vague 1 — déplacements, tirs, roulades, kills, combo, pause, mort, écran de fin — donne
  un canvas et un HUD identiques au pixel aux 9 points de contrôle. Les vagues suivantes (autres
  ennemis, cartes, déblocages) ne sont couvertes que par les tests de règles et la relecture.
- Simulation itch.io : contenu du zip servi depuis un sous-dossier, dans une iframe cross-origin —
  chargement sans erreur, toutes les ressources en 200, polices chargées, partie jouable,
  `localStorage` fonctionnel, pause quand l'iframe perd le focus.

## Performance : budget d'allocations

- Les baisses de fps ponctuelles venaient du ramasse-miettes, pas du rendu : le tas de priorité du
  champ de distances (`rules/pathfield.js`) allouait ~140 Mo/s (échanges par déstructuration, tableau
  renvoyé par `pop()`). Passé en tableaux typés sans allocation : ~2 Mo/s. Champs vérifiés identiques
  au bit près (empreinte de 480 calculs sur 12 arènes), le bug d'arrondi Float32 était donc conservé.
- Chutes de fps à partir de la vague 10, qui empirent ensuite : le champ de distances coûtait ~14 ms par calcul, toutes les
  `FIELD_PERIOD` s, à cause du bug d'arrondi Float32 (≈ 25 insertions dans le tas par tuile). Avec une centaine
  d'ennemis à dessiner, l'image qui le portait dépassait 16,7 ms. Corrigé en stockant le champ en `Float64Array`
  (≈ 10 fois plus rapide), ce qui tranche l'ancienne question ouverte : la horde trouve désormais un chemin
  depuis chaque tuile, Bunker compris. Le champ n'est plus recalculé au minuteur si le joueur reste sur la même
  tuile (résultat identique, il ne dépend que de la carte, des constructions et de cette tuile).
- `npm run perf` (`scripts/perf.mjs`) garde ce gain : 20 s de partie dans Chrome sans interface, lancée en
  vague 15 (horde de fin de partie), joueur immobile et invulnérable, profil d'allocations échantillonné, échec au-delà de 10 Mo/s. Hors de
  `npm test` et du hook Stop parce qu'il exige Chrome et dure ~20 s ; un seuil d'allocations sous
  Node serait trop instable pour bloquer.
- Passé en vague 15, la mesure a révélé ~27 Mo/s (contre ~1,3 en vague 1), proportionnels à la horde. Ramené
  à 8–9 Mo/s, le chiffre varie d'une partie à l'autre selon la composition tirée :
  - ennemis tous de la même forme d'objet (`spawnEnemy` : toutes les propriétés, dans le même ordre, dès
    l'apparition) : avec une forme par type, les accès `e.x`, `e.y`… devenaient mégamorphes et V8 créait
    un nombre à chaque lecture (séparation : ~7 000 paires par image) ;
  - mise à jour d'un ennemi et séparation sorties d'`update` (`updateEnemy`, `separate`) : la longue fonction
    n'était pas optimisée et allouait un nombre à chaque calcul ;
  - `nextStep` renvoie l'index de la tuile au lieu d'un tableau `[x, y]` ; boucles indexées au lieu de `for…of` ;
  - dessin des ennemis sans fermeture recréée à chaque appel (`C`, `R`, `E`, bras, bouclier : fonctions du
    module), `outlined(ent, draw)` appelle `draw(ent)` ; proxy du contour sans `...a` ;
  - liste d'affichage de `render` : entrées réutilisées, tri par insertion (stable, même ordre de dessin).
  Reste surtout les nombres passés aux méthodes du canvas, inévitables sans changer la façon de dessiner.

## Écran titre : partie de démo

- Derrière le titre, une vraie partie tourne (`world.demo`, `game/demo.js`) : même simulation, même
  rendu, avec un pilote automatique à la place des entrées. `world.state` reste `'title'` : les entrées,
  la pause automatique et le HUD l'ignorent ; `update` la traite comme une partie en cours.
- Choix validés : démo muette (`silence` dans `audio/sfx.js`, sans toucher au réglage Son), sans
  vibration ni bannière, cartes prises au hasard parmi celles proposées, jamais de record. Le joueur
  peut mourir : la démo repart à sa mort ou à la fin de la vague `DEMO_LAST_WAVE`.
- La démo commence à la vague `DEMO_FIRST_WAVE` (5) et joue jusqu'à la 7, avec pistolet, uzi, fusil et
  pompe déjà débloqués (`demoStart`) : en vague 1, elle ne montrait que quelques zombies, ni coureurs
  ni cracheurs.
- Le pilote n'utilise que les armes à feu (pas de construction ni d'explosif, qui le blesseraient).

## Écran titre : disposition

Maquettes comparées avant de choisir (proposition 1 retenue sur trois : carte centrale, barres haut et bas).

- Colonne sombre ancrée au bord gauche : logo, menu vertical dont **Jouer** est la première entrée
  (Arène, Commandes, Bestiaire, Arsenal, Cartes, Options), puis indications et drapeaux en pied. À droite, un
  seul panneau réunit dernière partie et meilleures parties ; il disparaît tant qu'aucune partie n'est
  enregistrée. La démo reste visible au centre. Sous 720 px, la colonne passe au-dessus des records
  (Jouer visible sans défiler).
- Menu au focus natif : flèches ↑ ↓ (ou croix et stick de la manette) d'une entrée à l'autre en boucle,
  la première pression choisit Jouer ; Entrée (A) active l'entrée. Entrée sans focus et Start lancent la
  partie comme avant. Un volet ouvert prend le focus sur Fermer, A ou B le referme, et le focus revient
  à l'entrée qui l'a ouvert.

## Arènes au choix

- Cinq arènes : Entrepôt (l'arène d'origine), La Fosse, Colonnade, Bunker, Le Pont, choisies sur huit
  maquettes. Toutes gardent la grille 44 × 30, la bordure, les huit cases de porte et la case de départ :
  apparitions, démo et caméra restent inchangées.
- Choix par une entrée à bascule du menu de l'accueil, juste sous Jouer (« Arène : … ») : clic ou Entrée
  pour la suivante, ← → au clavier, croix ← → ou stick de la manette, depuis n'importe quelle entrée. La démo
  repart aussitôt sur l'arène choisie, qui sert d'aperçu. Choix retenu sous `STORAGE_ARENA` (`tete-carree-arena`).
- Records communs à toutes les arènes ; une partie enregistrée ne retient pas son arène.

## Écran titre : volet Cartes

- Une ligne par carte sur deux colonnes (une seule sur téléphone), groupées par rareté avec un liseré à sa couleur :
  pictogramme, nom, niveau maximal, texte du premier niveau. Retenue parmi trois maquettes (petites cartes avec
  détail au survol, onglets par rareté) : tout le texte reste lisible sans interaction, pour environ 30 % de
  hauteur en moins que les cartes de l'écran de choix en petit.

## Écran titre : dernière partie et meilleures parties

- Par-dessus la démo, l'accueil montre la dernière partie (score, vague, kills, meilleur combo, cartes
  prises) et les `TOP_RUNS` meilleures ; l'écran de fin montre aussi ce classement, partie jouée
  surlignée. Les deux panneaux s'affichent vides avant la première partie.
- Stockés sous une nouvelle clé `STORAGE_RUNS` (`tete-carree-runs`, JSON `{ last, top }`) ;
  `STORAGE_BEST` reste écrit tel quel. Un joueur qui n'a que l'ancien record le voit entrer seul au
  classement, sans vague, combo ni date.
- La phrase de présentation du jeu a quitté l'accueil (absente de la maquette retenue) ; le bestiaire
  reste dans son volet.
- Le volet Bestiaire est une liste illustrée : une ligne par ennemi dans l'ordre d'arrivée (`firstWave`
  de `rules/waves.js`), portrait animé avec le vrai sprite, rôle, conseil, PV, dégâts, points. Les
  astuces générales de l'ancien paragraphe (tir et déplacement séparés, roulade, cartes, barils et
  barricades, crevasses) ont été retirées sans être déplacées ailleurs.
- Le volet Arsenal suit le même modèle : une ligne par arme, touche, dessin du jeu en gros plan,
  score de déblocage, rôle, conseil, chiffres de base (sans les cartes ; cadence arrondie au dixième).

## Pactes majeurs

Spécification : `docs/prd/pactes-majeurs.md`.

- Rareté à part, `m` (« Pacte majeur », poids 3), plutôt que douze pactes de plus au poids 12, qui
  auraient pesé près d'un tiers du tirage.
- Proposés à partir de la fin de la vague `MAJOR_FROM_WAVE` (5), **un seul par partie** : pas de cumul
  entre pactes majeurs, donc pas de liste de couples interdits entre eux ni de multiplicateurs de
  points qui se composent. Choix « pour le moment », plus simple.
- Exclusions symétriques (champ `excl`) : une carte que le pacte majeur rend inutile n'est plus
  proposée, et le pacte n'est pas proposé si on la possède déjà.
- Tant qu'aucun n'est pris, un pacte majeur est garanti (tiré en premier, comme la Légendaire du Marché du
  diable) à la fin de la vague 5 puis toutes les `MAJOR_EVERY` (2) vagues ; entre-temps, chance normale.
- La démo ne tire jamais de pacte majeur.

## Butin : pièces et boutique

Spécification : `docs/prd/butin.md`.

- L'argent (`S.money`) est séparé du score : le score débloque les armes et fait le record, les pièces ne servent qu'à
  la boutique de l'écran des cartes et sont perdues en fin de partie (rien dans `localStorage`).
- Pièces dans leur propre collection `world.coins` (durée de vie, plafond `COIN_MAX`), pas dans `world.pickups`
  (plafonné à 3, sans expiration). Dessinées à plat avant le tri en profondeur, sans objet alloué par pièce.
- Aucune pièce en démo, ni pour un ennemi tombé dans une crevasse.
- Sous Tout ou rien, les pièces ramassées pendant une vague vont dans la cagnotte `S.coinPot`, comme les points :
  versées en fin de vague, perdues au premier coup encaissé.
- Le tirage des pièces ajoute un `rng()` par ennemi tué : pour une même graine, la suite de la partie diffère
  d'avant ce changement.
- Écarts avec le PRD : la carte en plus s'achète par un bouton de la boutique (pas de dos de carte en
  4ᵉ position) ; les pièces de fin de vague s'affichent en chiffre flottant au-dessus du joueur, pas dans la bannière.

## Comptoir : étale de caisses entre les vagues

Spécification : `docs/prd/comptoir.md`.

- Écran à part (`world.state = 'shop'`, `src/game/counter.js`), ouvert à la fermeture de l'écran des cartes et, sans
  carte (vagues impaires sous Pas de pause), quand `S.pickT` s'écoule. Jamais en démo ni avec une bourse vide. La
  bannière de la carte prise attend la sortie du Comptoir (sinon elle s'affiche par-dessus).
- Rien de durable : les effets vivent dans `S.buffs` jusqu'au bloc de fin de vague suivant (`endShopEffects`), sauf
  trousse et munitions, immédiates. Les règles touchées reçoivent `buffs` en dernier paramètre ; sans lui, résultats
  inchangés. La carte louée va dans `S.mods` et dans `S.buffs.rent`, et elle est rendue en fin de vague.
- Tirage pondéré par les poids de `RAR`, sans garantie ; contre-pactes seulement avec leur pacte.
- Écarts avec le PRD : le Gilet n'absorbe que les vrais coups (pas l'acide ni la perte du Sablier, qui l'auraient
  consommé aussitôt), alors que le Contrat compte tout dégât reçu ; la Livraison rend de munitions la prochaine
  caisse larguée, avancée à `LIVRAISON_DELAY`, qui attend si `MAX_PICKUPS` caisses sont déjà au sol ; l'étale passe
  sur 2 colonnes sous 640 px (le seuil existant), pas 760.
- L'étale et le réassort tirent avec `rng()` : pour une même graine, la partie diverge dès la première visite.

## Cartes du butin

Spécifications : `docs/prd/carte-*.md` (Pillard, Poches profondes, Marchandage, Collecte, Sang d'or, Midas, Trésor de
guerre, Avarice, Cupidité, Mercenaire).

- Ajoutées à la fin des cartes ordinaires de `MODS`, avant les pactes majeurs : pour une même graine, les cartes
  proposées changent.
- Les doublons avec le Comptoir se cumulent : Pillard avec Fouille, Poches profondes avec Pièces collantes.
- Exclusions symétriques posées sur des cartes ordinaires (première fois) : Sang d'or avec Sans armure, Vampire, Plus
  de soins et Une seule vie ; Poches profondes avec Avarice.
- Pièces perdues sous Cupidité (`lost`) : elles valent 1 même sous Midas (sinon perdre 5 pièces en rapporterait 10),
  mais comptent pour Collecte et Sang d'or. Seuls les vrais coups en font tomber, pas l'acide ni le Sablier.
- Le rendu lit le clignotement des pièces et le bonus de Trésor de guerre par des raccourcis de `state/world.js`
  (`coinBlink`, `hoardMul`), pour ne pas importer `rules/` depuis `render/`.

## Pactes de la bourse

Spécifications : `docs/prd/pacte-*.md` (Péage, Vœu de pauvreté, Bouclier d'or, Crédit, Assurance, Monnaie piégée,
Casino).

- Champ `noDemo` sur les cartes de `MODS` : jamais tirées en démo (`rollCards`, `ctx.demo`). Posé sur les sept
  pactes : la démo n'a pas de pièces.
- Vœu de pauvreté est un pacte majeur ; ses exclusions (cartes du butin, Avarice, Cupidité, Mercenaire, pactes de la
  bourse) sont listées sur lui seul, la règle étant symétrique.
- Ordre dans `hurtPlayer` : protections, Gilet, Crédit (dégâts majorés), Bouclier d'or (pièces d'abord), vie, Second
  souffle, puis Assurance. Ordre en fin de vague : pièces de fin de vague, Contrat, cotisation, Casino.
- Prix payé (`discounted`) : doublé sous Bouclier d'or, puis remise de Marchandage. Achat permis (`canAfford`) jusqu'au
  plancher de Crédit.
- Écarts avec les PRD : la jauge de roulade n'affiche pas le prix de Péage (elle ne montre de pastilles qu'à partir
  de deux charges) ; seul le bouton ROULER du tactile se grise sans assez de pièces. Péage écarte aussi la Roulade de
  réserve du Comptoir. Le rayon de Monnaie piégée est écrasé de 0,55 en hauteur comme l'éparpillement des pièces.

## Harnais d'équilibrage

Spécification : `docs/prd/harnais-equilibrage.md`. Commande `npm run balance`, code dans `scripts/balance/`.

- Vraie partie (`world.demo` faux) pilotée par `world.pilot`, plutôt que la démo : la démo coupe les pièces, le
  Comptoir, la vraie pause et choisit ses cartes seule. Quand `world.pilot` est nul, le jeu ne change pas.
- La page du jeu est chargée telle quelle ; un script injecté avant le jeu fige `requestAnimationFrame` (aucun
  rendu) et rend `setTimeout` immédiat (distribution des cartes, sorties d'écran). Le harnais appelle `update(1/60)`
  en boucle : le pas reste celui du jeu, pour ne pas fausser physique et collisions.
- `Math.random` est remplacé par un tirage à graine avant chaque partie : même graine, même partie, tant que le code
  ne change pas. Le pilote a son propre tirage, dérivé de la graine.
- `hurtPlayer(dmg, soft, by)` garde la source du dernier coup dans `S.lastHurtBy` (cause de la mort du rapport).
- Le pilote s'écarte des flaques d'acide et sort de la course des boules de feu du Diable (roulade si elle arrive
  trop vite), sauf le profil Débutant : la démo ne fait ni l'un ni l'autre, et l'acide puis les boules de feu
  dominaient les causes de mort de tous les profils (boules de feu : 10 à 12 morts sur 20 avant, 3 à 5 après).
- Fin de vague : quand la file est vide et qu'aucun ennemi n'est en vue, le pilote va chercher le plus proche. Sans
  cela, un ennemi resté dans une zone sans chemin jusqu'au joueur (il attend au bord de la crevasse, voulu par
  `computeField`) bloquait la vague indéfiniment.
- La source `feu` (boule de feu) est distincte de `d` (coup du Diable au contact).
- Le pilote reprend une partie mise en pause par `blur` ou `visibilitychange` (un onglet sans interface peut être
  signalé masqué) ; une partie coincée hors du jeu trop longtemps finit en erreur au lieu de bloquer le lancement.
- Ce que le pilote ne sait pas faire : poser barricades et barils, lancer grenades et roquettes, bannir ou racheter
  un pacte autrement que par les règles simples de son profil. Ces armes ne sont pas mesurées.
- Mesuré au premier essai : environ 16 fois le temps réel par onglet, une partie jusqu'à la vague 8 en une vingtaine
  de secondes.

## Langues : français et anglais

- Tous les textes affichés au joueur vivent dans `src/i18n/fr.js` et `src/i18n/en.js`, mêmes clés
  (`tests/i18n.test.js`) ; `config.js` ne garde que les données (`W`, `MODS`, `RAR` sans nom ni texte).
  Les textes des cartes importent les constantes de `config.js`, comme avant.
- `tr` est une **liaison vivante** vers le dictionnaire courant : `tr.left(n)` dans `updateHud` coûte un accès
  de propriété, pas de recherche par clé ni de tableau d'arguments (chemin chaud).
- Langue au premier lancement : celle du navigateur (`fr…` → français, sinon anglais : public itch.io
  majoritairement anglophone) ; choix du joueur gardé sous une nouvelle clé `STORAGE_LANG` (`tete-carree-lang`).
- Choix de la langue sur l'accueil (drapeaux français et britannique en SVG à côté d'Options, la langue courante
  allumée ; pas d'emoji drapeau, affiché en lettres « FR » / « GB » sous Windows) et dans le volet Options,
  **pas dans l'écran de pause** : le HUD, les cases d'armes et les cartes se construisent dans la langue
  courante au début de la partie, rien n'est à réécrire en cours de partie.
- Le nom du jeu, « Tête Carrée », n'est pas traduit (logo, titre de l'onglet).
- Nombres au format de la langue (`fmt` : `1 000` / `1,000`) ; virgule ou point décimal et « 25 % » / « 25% »
  dans les textes des cartes.

## Rules extracted

| Rule | Module | Test | Notes |
| --- | --- | --- | --- |
| Multiplicateur, Frénésie, cadence, durée du combo, charges de roulade | `rules/modifiers.js` | `tests/modifiers.test.js` | lit `S.mods` et `S.combo` passés en paramètre |
| Déblocage des armes au score | `rules/unlock.js` | `tests/unlock.test.js` | |
| Tuiles, crevasses, ligne de vue, marche en ligne droite | `rules/map.js` | `tests/map.test.js` | lit `map` et `blocks` par référence, sans copie (chemin chaud) |
| Champ de distances de la horde, pas suivant | `rules/pathfield.js` | `tests/pathfield.test.js` | renvoie un nouveau `Float64Array` (≈ 5 fois/s au plus) |
| Tirage des trois cartes | `rules/cards.js` | `tests/cards.test.js` | `rng` injecté |
| Composition des vagues, restants, cadence d'apparition | `rules/waves.js` | `tests/waves.test.js` | `rng` injecté |
| Points d'un kill, Soif de sang, caisse lâchée | `rules/scoring.js` | `tests/scoring.test.js` | `rollDrop` reçoit `onVoid` pour garder l'ordre exact des tirages |
| Bouclier du blindé, protection du joueur, Second souffle | `rules/damage.js` | `tests/damage.test.js` | |
| Générateur à graine | `rules/rng.js` | (via les tests ci-dessus) | LCG |

## Randomness and time

| Call site | Classification | Handling |
| --- | --- | --- |
| `spawnEnemy` : porte, répartition des meutes, jitter de vitesse/cadence, position d'apparition | rule-bearing | seeded rng (`rng`, `jitter`) |
| `startWave` → `waveQueue` : ordre de la file, taille des meutes | rule-bearing | seeded rng |
| `fireWeapon` : dispersion du pistolet, de l'Uzi, des plombs et leur vitesse | rule-bearing | seeded rng (`jitter`) |
| `killEnemy` → `rollDrop` : chance et type de caisse | rule-bearing | seeded rng |
| `update` : délai, position et type des caisses de ravitaillement | rule-bearing | seeded rng |
| `update` : munitions rendues par une caisse (tirage des armes) | rule-bearing | seeded rng |
| `rollCards` | rule-bearing | seeded rng |
| Diable : délai de tir et imprécision ; cracheur : recharge et anticipation | rule-bearing | seeded rng |
| `paintFloor`, `stampBlood`, `toxicBurst` (taches) | cosmetic | `Math.random` dans `render/` |
| Particules (sang, débris, étincelles, fumée, feu, poussière), nombre de gouttes par coup | cosmetic | `Math.random` / `rnd` |
| Phases d'animation (`walk`, `ph`), flash de canon, gonflement visuel du gonflé, tremblement d'écran | cosmetic | `Math.random` / `rnd` |
| Sons : buffer de bruit, offset de lecture, hauteur des grognements, grognement et glouglou ambiants | cosmetic | `Math.random` |
| Temps de simulation | — | `dt` mesuré par `loop/frame.js`, plafonné à 1/30 s, passé à `update` |
| `performance.now` : anti-répétition des sons, vibrations, molette, animation de la bannière | cosmetic | hors règles, inchangé |

Seed: tirée de `Math.random` à chaque nouvelle partie (`resetWorld`). Les tests passent une graine fixe.

## Deliberately left alone

Behaviour that looks wrong but was preserved, because the refactor must not change the
game. Each entry: what it is, where, and why it was not fixed.

- **Double balise `<meta name="viewport">`** dans `index.html` : la première n'a pas
  `user-scalable=no`, la seconde l'a. Le navigateur retient en général la première.
- **`KeyQ` change d'arme (précédente)** mais n'est pas mentionnée dans les contrôles de l'écran titre.
- **`sfx('toss')` rejoué quand une grenade tombe dans une crevasse**, alors que `sfx('fall')` existe.
- **`tickFps` calcule la moyenne et met à jour le texte même quand le compteur est masqué** ;
  seul l'histogramme est conditionné par `fpsOn`.
- **`S.time` avance aussi sur l'écran titre et l'écran de fin**, pas seulement en partie.
- **La variable locale `best` de `unstick()`** masque le nom du record (désormais `world.best`).
- **Au premier chargement, `setFps`/`setOutline` écrivent leur valeur par défaut dans
  `localStorage`** : un joueur qui a lancé la version publiée sans toucher au réglage garde `'0'`
  même si `SHOW_FPS_BY_DEFAULT` change plus tard.

## Open questions

Decisions the code does not settle and that were not made. Never resolved by guessing.

- Records par arène, ou communs comme aujourd'hui ?
- `npm run package` s'appuie sur la commande `zip` du système : faut-il un script multiplateforme
  (Windows sans WSL) ? Cela demanderait une dépendance de dev.
- Garder la double balise viewport, ou n'en garder qu'une (laquelle : avec ou sans `user-scalable=no`) ?
- Faut-il un favicon ? Le navigateur demande `/favicon.ico`, absent depuis l'origine (404 bénin).
- Les textes des cartes (`cards[id].desc`, `plus`, `minus` de `src/i18n/`) écrivent leurs nombres en dur au lieu de les
  construire à partir des constantes d'effet (`TENACE_BONUS`, `BARBELES_DAMAGE`, `CONSTITUTION_HP`…) :
  faut-il les dériver des constantes ? Ils sont désormais écrits deux fois (français, anglais). En attendant, le hook Stop de synchronisation de la
  documentation (`.claude/settings.json`) surveille leur cohérence.
- Combo tenace annonce « le combo tient X s au lieu de Y s » sans tenir compte de Fièvre, qui divise
  cette fenêtre par deux : `desc(n)` ne reçoit que le niveau, pas les autres cartes prises. Faut-il
  passer `S.mods` aux textes des cartes, ou rester sur une formulation relative (« +1,4 s ») ?
- Poids des pactes : avec 15 pactes au poids 12 (`RAR.p.w`), un pacte pèse environ 19 % du tirage au
  lieu de 6 % avec 4 pactes. Faut-il baisser leur poids pour qu'ils restent rares ?
- Cumuls de pactes laissés libres : Vampire + Sans armure (aucune régénération et perte de vie sans
  combo), Quitte ou double + Fièvre (deux pactes sur le combo), Marché du diable + Canon de verre
  (35 PV max sans Constitution). Faut-il interdire certains couples ?
- Sans répit plafonné à +5 crans (`REPIT_MAX`), choix d'implémentation non demandé : faut-il un
  autre plafond, ou aucun ?
- Vampire et Terre brûlée ne prennent jamais le dernier PV (pas de mort hors d'un coup ennemi ou
  d'une explosion) : choix d'implémentation, annoncé sur la carte.
- Ravitaillement : le zombie entre aussi pendant la pause entre les vagues ; il ne compte pas dans
  la file de la vague et prolonge celle en cours s'il arrive avant sa fin. À garder ?
- Butin : rachat d'un pacte à 60 pièces, est-ce assez cher (Prime de risque prise, rentabilisée, puis rachetée) ?
  Bannissement sans limite par écran : à garder ?
- Comptoir : sous Pas de pause (pause de 1,5 s), il revient à chaque vague : le rythme tient-il ? Prix des deux
  boutiques sur la même bourse à régler en jeu. Liste des cartes louables à vérifier carte par carte (Second souffle…).
- Cartes du butin : Aimant enlève la prise de risque de Collecte ; Mercenaire, s'il sort à la première carte,
  retarde beaucoup les premières armes ; Trésor de guerre peut dissuader de tout achat. À observer en jeu.
- Pactes de la bourse : Péage (roulades enchaînées protégées 65 % du temps), seuil fixe de l'Assurance en fin de
  partie, rafales de pièces piégées d'un même tas, force de Vœu de pauvreté : à mesurer avec `npm run balance`.
- Harnais d'équilibrage : le profil Débutant (visée 0,4 s et 15°, sans roulade) meurt dès les vagues 1 à 2 au premier
  essai ; trop faible pour être utile, ou fidèle à un vrai débutant ?
