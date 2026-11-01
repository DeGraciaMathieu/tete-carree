# Pacte Assurance

## Objectif

Un Second souffle qui se paie et se renouvelle : tant que le joueur garde assez de pièces, un coup mortel le laisse en
vie, une fois par vague, en vidant sa bourse. En échange, une cotisation prend une part de la bourse à chaque fin de
vague. Il pousse à dépenser plutôt qu'à épargner, mais à garder un fond.

Maquette : https://claude.ai/artifact/Tg5S1mC6N6puESgousYf5Y. Valeurs de départ, à régler en jeu.

## Socle technique

- Coup mortel : `hurtPlayer` (`src/game/combat.js`) appelle `secondWind(hp, maxHp, mods, souffleUsed)`
  (`src/rules/damage.js`) : Second souffle rend 40 % de vie, une fois par partie (`S.souffleUsed`), avec onde de choc
  et bannière ; sinon mort (`player.dead`, `S.overT`).
- Fin de vague : bloc de fin de vague de `src/loop/update.js` (pièces de fin de vague, effets du Comptoir).
- Une seule vie : vie max à 1.

## Comportement

- Pacte ordinaire, `max` 1.
- **Avantage** : quand un coup devrait tuer le joueur, que la bourse compte au moins `ASSURANCE_MIN` (30) pièces et que
  l'assurance n'a pas encore servi pendant cette vague, le joueur reste à 1 PV, la bourse est vidée, et il est protégé
  `ASSURANCE_INVULN` (1 s). Bannière « Assurance » et son. Pas d'onde de choc.
- **Ordre avec Second souffle** : Second souffle passe d'abord (il est gratuit) ; l'assurance ne sert que s'il est déjà
  utilisé ou absent.
- L'assurance se recharge au début de chaque vague. Pendant la pause entre deux vagues, elle ne se recharge pas.
- **Contrepartie** : à chaque fin de vague, après les pièces de fin de vague, la cotisation retire
  `ASSURANCE_FEE` (15 %) de la bourse, arrondi à la pièce inférieure (rien sur une bourse sous 7 pièces). Chiffre
  flottant « −n cotisation ».
- Sous Tout ou rien, la cagnotte est versée avant la cotisation.
- **Exclusions** symétriques : Une seule vie (un coup tue toujours, l'assurance la contournerait), Vœu de pauvreté.
- **Démo** : jamais proposé.
- **Rachat** : plus d'assurance ni de cotisation.

## Hors périmètre

- Prix d'assurance qui monte avec les vagues.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'assurance', rar: 'p', max: 1, excl: ['unevie', 'pauvrete'], noDemo: true }` ; `ASSURANCE_MIN = 30`, `ASSURANCE_INVULN = 1`, `ASSURANCE_FEE = .15`. |
| rules | `src/rules/damage.js` | `insured(mods, hp, money, used)` : vrai si le coup est mortel, la bourse suffit et l'assurance est libre. |
| rules | `src/rules/scoring.js` | `insuranceFee(mods, money)` : cotisation de fin de vague. |
| state | `src/state/world.js` | `S.insuranceUsed` dans `resetWorld`, remis à faux par `startWave`. |
| game | `src/game/combat.js`, `src/game/enemies.js` | `hurtPlayer` : après Second souffle, `insured` ; `startWave` recharge l'assurance. |
| loop | `src/loop/update.js` | Fin de vague : cotisation. |
| render | `src/render/cardIcons.js` | Pictogramme `assurance` (bouclier coché). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.assurance` : « Assurance » / « Insurance », `plus` et `minus` construits depuis les constantes ; bannière et chiffre de cotisation. |

## Critères d'acceptation

- Quand le joueur a Assurance et 40 pièces et qu'un coup devrait le tuer, alors il reste à 1 PV et sa bourse tombe à 0.
- Quand un second coup mortel tombe pendant la même vague, alors il meurt.
- Quand il a 29 pièces, alors un coup mortel le tue.
- Quand il a aussi Second souffle non utilisé, alors c'est Second souffle qui le sauve, et l'assurance reste disponible.
- Quand une vague se termine avec 60 pièces en bourse, alors la cotisation en retire 9.

## Tests

`tests/damage.test.js` :
- « Assurance : un coup mortel laisse à 1 PV si la bourse a 30 pièces »
- « Assurance : une seule fois par vague »
- « Assurance : avec moins de 30 pièces, le coup mortel tue »

`tests/scoring.test.js` :
- « Assurance : la cotisation prend 15 % de la bourse en fin de vague »

`tests/cards.test.js` :
- « Assurance n'est jamais proposée avec Une seule vie »

## Risques et questions ouvertes

- **Force** : une vie de plus par vague tant qu'on a 30 pièces est très forte en fin de partie, où une vague
  rapporte bien plus. Le seuil pourrait monter avec la vague (`ASSURANCE_MIN × vague`) : à décider après mesure.
- Sous Bouclier d'or, les coups sont payés en pièces avant : la bourse peut fondre avant le coup mortel. Pas
  d'exclusion, l'ordre suffit (Bouclier d'or d'abord, puis l'assurance sur la vie).
