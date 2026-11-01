# Carte Pillard

## Objectif

Une carte commune qui fait tomber plus de pièces, sans rien changer d'autre au jeu : la porte d'entrée des
cartes du butin. Le joueur qui la prend voit sa bourse grossir à chaque vague.

Maquette : https://claude.ai/artifact/2Cxep6W35PtKnVL6HD15wt. Valeurs de départ, à régler en jeu.

## Socle technique

- Tirage des pièces : `rollCoins(type, onVoid, rng, buffs)` (`src/rules/scoring.js`), chance par type
  `COIN_CHANCE` (`z` .3, `r` .2, `s` .6, `b`/`d`/`a` 1), nombre `COIN_VALUE` ; appelé par `killEnemy`
  (`src/game/combat.js`), jamais en démo ni pour un ennemi tombé dans une crevasse.
- Fouille (Comptoir) : `SHOP_DIG_CHANCE` (.5) remplace la chance des zombies pendant une vague.
- Cartes : `MODS` (`src/config.js`), `modLevel`, textes `cards.<id>` (`src/i18n/`), pictogramme `cardIcon`.

## Comportement

- Commune, `max` 3. Chaque niveau ajoute `PILLARD_CHANCE` (+0,1) à la chance qu'un ennemi lâche des pièces,
  pour tous les types, plafonnée à 1.
- Zombie : 30 % → 40 % → 50 % → 60 %. Coureur : 20 % → 50 % au niveau 3. Cracheur : 60 % → 90 %. Les
  Gonflés, Diables et Blindés lâchent déjà toujours leurs pièces : la carte ne change rien pour eux.
- Le nombre de pièces (`COIN_VALUE`) ne change pas.
- **Avec Fouille** (décision : les deux se cumulent) : la chance de Fouille (50 %) remplace celle de base des
  zombies, puis Pillard s'ajoute (60 % au niveau 1).
- Rien au-dessus du vide, rien pour un ennemi tombé dans une crevasse, rien en démo : inchangé.

## Hors périmètre

- Plus de pièces par ennemi (c'est Midas et Avarice).
- Pièces de fin de vague.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'pillard', rar: 'c', max: 3 }` dans `MODS`, à la suite des cartes ordinaires ; `PILLARD_CHANCE = .1`. |
| rules | `src/rules/scoring.js` | `rollCoins(type, onVoid, rng, buffs, mods)` : chance + `PILLARD_CHANCE × modLevel(mods, 'pillard')`, au plus 1. Sans `mods`, inchangé. |
| game | `src/game/combat.js` | `killEnemy` passe `S.mods` à `rollCoins`. |
| render | `src/render/cardIcons.js` | Pictogramme `pillard` (pelle et pièce). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.pillard` : `name` « Pillard » / « Looter », `short`, `desc(n)` construit depuis `PILLARD_CHANCE` et `COIN_CHANCE.z`. |

## Critères d'acceptation

- Quand le joueur a Pillard niveau 1, alors un zombie lâche une pièce environ 4 fois sur 10.
- Quand le joueur a Pillard niveau 3, alors un Cracheur lâche ses pièces 9 fois sur 10 et un Blindé toujours.
- Quand le joueur a Pillard et achète Fouille, alors un zombie lâche une pièce 6 fois sur 10 pendant la vague.
- Au niveau 3, la carte n'est plus proposée.

## Tests

`tests/scoring.test.js` :
- « Pillard : un zombie lâche une pièce environ 4 fois sur 10 » (10 000 tirages, graine fixe)
- « Pillard : la chance ne dépasse jamais 100 % »
- « Pillard et Fouille se cumulent sur les zombies »
- « sans Pillard, le tirage des pièces est inchangé pour une même graine »

`tests/cards.test.js` : pictogramme présent (test existant).

Vérification manuelle : nombre de pièces gagnées par vague en partie réelle, avec et sans la carte.

## Risques et questions ouvertes

- Ajout à `MODS` : pour une même graine, les cartes proposées changent.
- Économie : au niveau 3, environ +30 % de pièces sur une vague de zombies. À rapprocher de la cible de 20 à 30
  pièces par vague en milieu de partie (`docs/prd/butin.md`).
