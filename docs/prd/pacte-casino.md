# Pacte Casino

## Objectif

Le pur pari : à chaque fin de vague, la bourse est doublée ou divisée par deux, à pile ou face. En moyenne elle gagne,
mais une mauvaise série la vide. Le plus drôle des pactes de la bourse, et une raison de regarder la fin de vague.

Maquette : https://claude.ai/artifact/Tg5S1mC6N6puESgousYf5Y. Valeurs de départ, à régler en jeu.

## Socle technique

- Fin de vague : bloc de fin de vague de `src/loop/update.js` : bonus de points, bannière `banner(tr.waveCleared, …)`,
  pièces de fin de vague (`waveCoins` + cagnotte de Tout ou rien), effets du Comptoir (`endShopEffects`, Contrat).
- Aléatoire de gameplay : `rng()` (`src/state/world.js`).
- Chiffres flottants : `pop` (`src/render/effects.js`).

## Comportement

- Pacte ordinaire, `max` 1.
- **Avantage et contrepartie** : à chaque fin de vague, après les pièces de fin de vague, la cagnotte de Tout ou rien
  et le Contrat, un tirage `rng() < CASINO_CHANCE` (0,5) :
  - pile : la bourse est doublée (`× CASINO_WIN`, 2) ;
  - face : elle est divisée par deux (`× CASINO_LOSS`, 0,5), arrondie à la pièce inférieure.
- Une bourse vide ne tire rien (pas de tirage, pas d'affichage).
- Affichage : chiffre flottant au-dessus du joueur, « Pile ! ×2 » en or ou « Face… ÷2 » en rouge, avec un son distinct
  pour chaque issue.
- Sous Crédit, une bourse négative ne tire rien (on ne double pas une dette).
- **Exclusion** : Vœu de pauvreté.
- **Démo** : jamais proposé.
- **Rachat** : plus de tirage.

## Hors périmètre

- Choisir sa mise.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'casino', rar: 'p', max: 1, excl: ['pauvrete'], noDemo: true }` ; `CASINO_CHANCE = .5`, `CASINO_WIN = 2`, `CASINO_LOSS = .5`. |
| rules | `src/rules/scoring.js` | `casinoPurse(mods, money, r)` : bourse après le tirage (`r` entre 0 et 1), inchangée sans le pacte ou si la bourse est nulle ou négative. |
| loop | `src/loop/update.js` | Fin de vague : un `rng()` seulement sous le pacte et avec une bourse positive ; chiffre flottant et son. |
| audio | `src/audio/sfx.js` | Deux sons courts (gain, perte). |
| render | `src/render/cardIcons.js` | Pictogramme `casino` (dé). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.casino` : « Casino », `plus` et `minus` construits depuis les constantes ; textes « Pile ! ×2 » / « Face… ÷2 ». |

## Critères d'acceptation

- Quand le joueur a Casino et 40 pièces en fin de vague, alors sa bourse passe à 80 ou à 20.
- Quand il a 0 pièce, alors rien ne se passe.
- Quand il a 7 pièces et perd, alors il lui en reste 3.
- Sur un grand nombre de fins de vague, la bourse double environ une fois sur deux.

## Tests

`tests/scoring.test.js` :
- « Casino : pile, la bourse double »
- « Casino : face, elle est divisée par deux, arrondie en dessous »
- « Casino : une bourse vide ou négative ne tire rien »
- « sans Casino, la bourse ne change pas en fin de vague »

## Risques et questions ouvertes

- **Tirage `rng`** : un appel de plus par fin de vague sous le pacte ; pour une même graine, la suite de la partie
  diffère dès qu'il est pris.
- **Espérance** : +25 % par vague en moyenne ; combiné à l'épargne (Trésor de guerre, Marchandage), il peut emballer
  la bourse. À mesurer avec `npm run balance`.
