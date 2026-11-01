# Harnais d'équilibrage

## Objectif

Une commande qui joue des parties entières, sans personne au clavier, avec plusieurs profils de joueurs, et en sort
un rapport HTML : jusqu'où chaque profil va, ce qui le tue, à quel rythme, avec quelles pièces et quelles cartes.
Le but est d'avoir des chiffres avant et après un réglage, pour moins équilibrer à l'aveugle.

Ce n'est pas un outil pour le joueur : rien ne change dans le jeu publié.

Maquette du rapport (données d'exemple) : https://claude.ai/artifact/GSqxcLBawrgGHACEebQjRF.

## Socle technique

- **Chrome sans interface** : `scripts/perf.mjs` lance Vite et Chrome, pilote la page par le protocole de
  débogage (`Runtime.evaluate`, `Input.*`), et agit sur le vrai état en important les modules servis par Vite
  (`import('/src/state/world.js')`).
- **Pilote automatique** : `demoControl` (`src/game/demo.js`) écrit à chaque image les commandes `ctl`
  (`mx`, `my`, `ax`, `ay`) : fuir la horde (`FLEE`), revenir au centre (`CENTER_PULL`), aller vers une caisse proche
  (`CRATE_PULL`), viser l'ennemi le plus proche en ligne de vue, rouler au contact (`DODGE`). Il ne manie que les armes
  à feu (`GUNS`).
- **Lecture des commandes** : `update` (`src/loop/update.js`) lit `ctl` seulement quand `world.demo` est vrai. Or la
  démo coupe les pièces, le Comptoir, la vraie pause (`DEMO_BREAK`) et choisit ses cartes seule (`demoPick`) : le
  harnais doit jouer une **vraie partie** (`world.demo` faux) avec un pilote.
- **Boucle** : `frame` (`src/loop/frame.js`) appelle `update(dt)` par `requestAnimationFrame` avec `dt` plafonné à
  `MAX_DT` ; `render()` à chaque image.
- **Écrans de choix** : `openPick` / `choosePick` (`src/game/flow.js`) avec cartes distribuées par `setTimeout`
  (`DEAL_*_MS`), immédiates sous `prefers-reduced-motion` ; boutique de l'écran (`rerollPick`, `toggleBan`,
  `buybackPact`) ; Comptoir `openShop` / `buyItem` / `restockShop` / `leaveShop` (`src/game/counter.js`).
- **Aléatoire** : `resetWorld` tire la graine de `rng` avec `Math.random` ; le reste du gameplay passe par `rng`.
- **Coups encaissés** : `hurtPlayer(dmg, soft)` (`src/game/combat.js`) ne sait pas qui frappe.

## Comportement

### Commande

```sh
npm run balance                                   # 5 profils × 20 parties, plafond 25 vagues
npm run balance -- --profils prudent,pilleur --parties 50 --vagues 15 --arene <id> --onglets 4
```

- Lance Vite et Chrome sans interface (`CHROME=<chemin>` comme `npm run perf`), joue les parties, écrit
  `reports/balance-<date>-<heure>.html` et le `.json` des mesures brutes, affiche un résumé dans le terminal (vague
  médiane par profil) et le chemin du rapport.
- `reports/` est ignoré par git. Ne fait pas partie de `npm test` ni du hook Stop.
- Plusieurs onglets jouent en parallèle (`--onglets`, 4 par défaut).
- Un lancement dure longtemps (une partie dépasse la minute) : le terminal affiche l'avancement (parties finies sur
  le total, temps écoulé, temps restant estimé, dernière partie : profil, graine, vague atteinte).
- Le `.json` est réécrit après chaque partie. Un lancement interrompu (Ctrl+C) écrit quand même le rapport des
  parties déjà jouées, en le signalant dans l'en-tête.

### Une partie

- Une partie par graine et par profil : graines 1 à N, les mêmes pour tous les profils, pour comparer à donne égale.
- Avant chaque partie, `Math.random` est remplacé par un tirage à graine (cosmétique compris), puis `startGame()` :
  même graine, même partie, d'un lancement à l'autre (tant que le code ne change pas).
- La boucle `requestAnimationFrame` du jeu est figée ; le harnais appelle `update(1/60)` en boucle, **sans rendu**,
  aussi vite que possible, et `setTimeout` devient immédiat dans la page (distribution des cartes, sorties d'écran).
- La partie s'arrête :
  - à la mort du joueur (après la chute, quand `gameOver` passe l'état à `over`) ;
  - au **plafond** de vagues (`--vagues`, 25 par défaut) : partie notée « plafond atteint » ;
  - si une vague dure plus de `BALANCE_WAVE_LIMIT` (5 min de jeu) : partie notée « bloquée », avec la vague et ce
    qui reste en jeu (types d'ennemis vivants, file vide ou non).
- La pause entre les vagues est jouée en entier : régénération et ramassage des pièces comptent.
- Les écrans de cartes et le Comptoir se décident instantanément selon le profil (aucun temps de jeu ne passe, comme
  dans le vrai jeu).

### Le pilote

Le pilote de la démo, généralisé. Réglages d'un profil :

| Réglage | Effet |
| --- | --- |
| `flee`, `centerPull` | distance de fuite, attirance vers le centre (ceux de la démo par défaut) |
| `cratePull`, `coinPull`, `lootDanger` | attirance vers les caisses et les pièces, et distance du premier ennemi en dessous de laquelle il n'y va pas |
| `reaction`, `aimError` | délai avant de viser une nouvelle cible (s), erreur d'angle aléatoire (degrés) |
| `dodge` | distance de contact qui déclenche la roulade (0 : jamais) |
| `cards` | poids par carte ou par famille (défense, combo, butin, arme…), pactes acceptés ou non, pacte majeur accepté ou non |
| `reroll`, `ban` | relance si aucune carte ne dépasse un poids, au-delà d'une réserve de pièces ; bannit les cartes de poids négatif |
| `shop` | priorité des familles du Comptoir, réserve de pièces à garder, réassort ou non |

Cinq profils livrés :

| Profil | Jeu |
| --- | --- |
| **Démo** | le pilote actuel tel quel, cartes au hasard, n'achète rien : la référence |
| **Débutant** | visée lente (0,4 s) et imprécise (15°), pas de roulade, jamais de pièces sous la menace, cartes au hasard, n'achète rien |
| **Prudent** | fuit loin, ne va chercher pièces et caisses que sans ennemi à moins de 200 px, cartes défensives (Constitution, Soif de sang, Second souffle…), pas de pacte, achète des soins |
| **Pilleur** | plonge vers les pièces, cartes du butin et Aimant, dépense tout au Comptoir |
| **Scoreur** | cartes de combo (Frénésie, Combo tenace, Collecte…), accepte les pactes, garde ses pièces pour relancer |

Limites connues : le pilote ne pose ni barricade ni baril et ne lance ni grenade ni roquette (comme la démo) ; il ne
choisit pas d'arme sous Spécialiste autrement que la première de sa liste. Ces armes ne sont pas mesurées.

### Mesures

Par partie : graine, profil, vague atteinte, issue (mort, plafond, bloquée), cause de la mort, score, kills, temps de
jeu ; par vague : durée, vie en fin de vague (% de la vie max), pièces gagnées et dépensées, kills ; cartes prises
(avec leur vague) ; achats du Comptoir ; vague de déblocage de chaque arme.

- **Cause de la mort** : le dernier coup encaissé. `hurtPlayer` reçoit sa source (`by` : type d'ennemi, `acid`,
  `blast` pour les explosions du joueur, `sablier`), gardée dans `S.lastHurtBy`.
- **Pièces gagnées** : variation de la bourse pendant la vague et la pause, hors achats (le pilote connaît ce qu'il
  paie).

### Rapport

Un fichier HTML autonome (données incluses, aucun chargement extérieur sauf les polices), dans le style du jeu, comme
la maquette :

- en-tête : commit, profils, parties, plafond, arène, durée du lancement ;
- par profil : vague médiane, plus basse et plus haute, parties au plafond, première cause de mort ;
- survie vague par vague (part des parties encore en vie), une courbe par profil, infobulle au survol ;
- causes de la mort par profil (tableau coloré) ;
- durée médiane des vagues et vie en fin de vague, par profil ;
- économie par vague (gagnées, dépensées), profil au choix ;
- cartes : prise, vague atteinte avec et sans, écart (à lire avec prudence : une carte prise tard profite d'avoir
  survécu) ;
- vague médiane de déblocage de chaque arme ;
- parties à vérifier : bloquées, plafond atteint.

## Hors périmètre

- Comparaison automatique de deux rapports ou de deux branches (le `.json` la permettra plus tard).
- Constructions et explosifs dans le pilote.
- Lancement en CI.
- Toute modification de l'équilibrage : le harnais mesure, il ne règle rien.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | Rien (les réglages des profils vivent avec le harnais, pas dans le jeu). |
| state | `src/state/world.js` | `world.pilot = null` : fonction appelée à la place des entrées quand elle est posée ; `S.lastHurtBy` dans `resetWorld`. |
| game | `src/game/combat.js`, `src/game/enemies.js`, `src/loop/update.js` | `hurtPlayer(dmg, soft, by)` : chaque appel passe sa source ; `S.lastHurtBy = by`. |
| game | `src/game/flow.js`, `src/game/counter.js` | Lecture seule pour le pilote : `pickOptions()` (cartes sur la table), `stallOptions()` (caisses de l'étale, vendues ou non). |
| loop | `src/loop/update.js` | `if (world.demo \|\| world.pilot)` : commandes lues dans `ctl`, tir quand le pilote vise ; `world.pilot()` remplace `demoControl()` hors démo. Comportement du jeu inchangé quand `world.pilot` est nul. |
| outil | `scripts/balance.mjs` | Lancement : Vite, Chrome, onglets, graines, plafond, collecte des résultats, écriture du rapport et du `.json`, résumé terminal. |
| outil | `scripts/balance/pilot.js` | Côté page : pilote paramétré (déplacement, visée, roulade), choix des cartes, boutique et Comptoir, boucle de simulation, mesures. Importe les modules de `src/`. |
| outil | `scripts/balance/profiles.js` | Les cinq profils. |
| outil | `scripts/balance/report.js` | Gabarit du rapport HTML (données injectées en JSON). |
| projet | `package.json`, `.gitignore`, `CLAUDE.md`, skill `testing` | Commande `npm run balance` ; `reports/` ignoré ; ligne dans le tableau des commandes et dans « Comportement attendu ». |
| décisions | `docs/decisions.md` | Section « Harnais d'équilibrage » : vrai jeu avec pilote plutôt que démo, rendu coupé, timers immédiats, ce que le pilote ne sait pas faire. |

## Critères d'acceptation

- Quand on lance `npm run balance -- --parties 2 --vagues 5`, alors 10 parties se jouent, et un rapport HTML et son
  `.json` sont écrits dans `reports/`.
- Quand on relance la même commande sans changer le code, alors les vagues atteintes sont identiques.
- Quand une vague ne se termine pas en 5 minutes de jeu, alors la partie s'arrête et figure dans « Parties à
  vérifier ».
- Quand un profil n'achète rien, alors ses pièces dépensées sont à 0 sur toutes les vagues.
- Quand le joueur meurt d'un Cracheur, alors la cause notée est « Cracheur ».
- Quand `world.pilot` est nul, alors le jeu se comporte exactement comme avant (démo et partie au clavier).
- Le rapport s'ouvre en double-clic, sans serveur.
- Quand on interrompt un lancement, alors le rapport des parties déjà jouées est écrit et l'indique.

## Tests

`tests/balance.test.js` (nouveau, décisions pures du pilote, si elles sont écrites en fonctions pures) :
- « le profil Prudent ne prend jamais de pacte »
- « le profil Pilleur choisit une carte du butin quand il en a une sur la table »
- « un profil qui garde une réserve n'achète pas au Comptoir en dessous de celle-ci »

Vérifications manuelles :
- **Accélération mesurée en premier**, avant tout le reste : temps réel d'une partie jusqu'à la vague 10 avec le
  pilote de la démo, pour annoncer la durée d'un lancement complet.
- Interruption par Ctrl+C au milieu d'un lancement : le rapport des parties jouées est écrit.
- Une partie du profil Démo regardée en vrai (rendu activé) : le pilote joue comme la démo de l'accueil.
- Reproductibilité : deux lancements identiques donnent le même `.json` de vagues atteintes.
- `npm test` vert (le `test.fails` du champ de distances compris) et `npm run perf` dans le budget : les
  changements dans `update` et `hurtPlayer` touchent un chemin chaud.

## Risques et questions ouvertes

- **Durée d'un lancement** : une partie dépasse la minute, c'est attendu. Un lancement complet (5 profils ×
  20 parties) se compte donc en dizaines de minutes, même sur 4 onglets. Le pas reste 1/60 s : un pas plus grand
  changerait la physique et les collisions, qui supposent `MAX_DT`, et fausserait les mesures.
- **Fidélité du pilote** : il ne joue pas comme un humain. Les chiffres servent à comparer deux réglages ou deux
  versions, pas à dire qu'une vague est trop dure dans l'absolu.
- **`setTimeout` immédiat** : quelques effets visuels (rebond du compteur de combo) se déclenchent en rafale ; sans
  importance sans rendu.
- **Arène** : une seule par lancement ; les arènes ont des plans différents (crevasses), donc des résultats différents.
- **Écart des cartes** : biais de survie (une carte prise tard est prise par des parties qui ont déjà survécu). Le
  rapport le dit ; une mesure plus juste (vague atteinte après la prise, comparée aux parties au même point) peut venir
  ensuite.
