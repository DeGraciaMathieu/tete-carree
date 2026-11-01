# Pacte Avarice

## Objectif

Un pacte qui double le butin mais le rend fuyant : les ennemis lâchent deux fois plus de pièces, qui ne restent
que 3 s au sol. Il faut plonger dans la horde tout de suite pour en profiter.

Maquette : https://claude.ai/artifact/2Cxep6W35PtKnVL6HD15wt. Valeurs de départ, à régler en jeu.

## Socle technique

- Tirage : `rollCoins` (`src/rules/scoring.js`), nombre `COIN_VALUE` par type ; `dropCoins`
  (`src/game/combat.js`) crée une pièce par unité.
- Durée au sol : `COIN_LIFE` (6 s), `COIN_BLINK` (2 s de clignotement) ; règle `coinLife` prévue par
  `docs/prd/carte-poches.md`.
- Pactes : rareté `p`, textes `plus(n)` / `minus(n)`, rachetables à 60 pièces sur l'écran des cartes.

## Comportement

- Pacte ordinaire, `max` 1.
- **Avantage** : quand un ennemi lâche des pièces, il en lâche `AVARICE_MUL` (×2) fois plus (zombie 2,
  Blindé 10). La chance de lâcher ne change pas.
- **Contrepartie** : les pièces restent `AVARICE_COIN_LIFE` (3 s) au sol au lieu de 6, dont la dernière seconde
  en clignotant (`COIN_BLINK` ramené à 1 s sous Avarice, sinon elles clignoteraient presque tout le temps).
- **Exclusion** symétrique avec Poches profondes.
- **Avec Pièces collantes** (Comptoir) : la caisse rend 10 s pendant la vague ; elle annule la contrepartie pour
  une vague, comme un contre-pacte. Voulu.
- **Avec Pillard, Midas** : se cumulent (plus de chances, deux fois plus de pièces, chaque pièce vaut 2).
- Racheté (60 pièces) : les pièces retrouvent leurs 6 s ; celles déjà au sol gardent leur durée.

## Hors périmètre

- Pièces de fin de vague.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'avarice', rar: 'p', max: 1 }` ; `AVARICE_MUL = 2`, `AVARICE_COIN_LIFE = 3`, `AVARICE_BLINK = 1`. |
| rules | `src/rules/scoring.js` | `rollCoins` : nombre × `AVARICE_MUL` sous le pacte ; `coinLife` : 3 s sous le pacte ; `coinBlink(mods)`. |
| render | `src/render/scene.js` | `drawCoins` lit `coinBlink(S.mods)` au lieu de `COIN_BLINK` (une fois par image, pas par pièce). |
| render | `src/render/cardIcons.js` | Pictogramme `avarice` (deux pièces). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.avarice` : « Avarice » / « Greed », `plus` et `minus` construits depuis les constantes. |

## Critères d'acceptation

- Quand le joueur a Avarice et tue un Blindé, alors 10 pièces tombent.
- Quand une pièce tombe sous Avarice, alors elle disparaît au bout de 3 s et clignote pendant la dernière.
- Quand le joueur a Avarice, alors Poches profondes n'est jamais proposée.
- Quand le joueur rachète Avarice, alors les pièces suivantes restent 6 s.

## Tests

`tests/scoring.test.js` :
- « Avarice : un Blindé lâche 10 pièces »
- « Avarice : une pièce ne reste que 3 s au sol »
- « Avarice : la chance de lâcher des pièces ne change pas »

`tests/cards.test.js` :
- « Avarice et Poches profondes ne sont jamais proposées ensemble »

## Risques et questions ouvertes

- Plafond `COIN_MAX` (80) : deux fois plus de pièces au sol, mais deux fois moins longtemps ; à vérifier en fin de
  partie.
- Nom anglais « Greed » à confirmer : Cupidité se traduirait aussi par Greed, d'où « Avidity » pour elle
  (`docs/prd/carte-cupidite.md`).
