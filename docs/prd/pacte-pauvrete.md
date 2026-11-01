# Pacte majeur Vœu de pauvreté

## Objectif

Le pari inverse du butin : le joueur renonce pour toute la partie aux pièces, à la boutique et au Comptoir, contre une
puissance brute. Plus de pièce au sol, plus de raison de plonger dans la horde : on ne compte plus que sur ses armes.

Maquette : https://claude.ai/artifact/Tg5S1mC6N6puESgousYf5Y. Valeurs de départ, à régler en jeu.

## Socle technique

- Pactes majeurs (`docs/prd/pactes-majeurs.md`) : rareté `m`, un seul par partie, proposés à partir de la fin de la
  vague `MAJOR_FROM_WAVE` (5), jamais en démo ; `excl` : cartes rendues inutiles, exclusion symétrique.
- Pièces : `rollCoins` / `dropCoins` dans `killEnemy`, `waveCoins` en fin de vague (`src/loop/update.js`), contrat
  et cotisations du Comptoir ; bourse `S.money`, cagnotte `S.coinPot` (Tout ou rien).
- Boutique de l'écran des cartes (`#shop`, `#buyback`, `src/game/flow.js`) ; Comptoir (`openShop`, ne s'ouvre pas
  avec une bourse vide).
- Dégâts : `shotDamageMul` (tirs du joueur), `explosion(…, own)` avec `specialMul` (explosions du joueur).
- HUD : panneau `.money` (`#money`) sous le score.

## Comportement

- Pacte majeur, `max` 1.
- **Avantage** : les tirs et les explosions du joueur font `PAUVRETE_DAMAGE_MUL` (×1,4) de dégâts, multiplié avec les
  autres pactes de dégâts. La tourelle et les éclats de Fragmentation n'en profitent pas (comme les autres pactes de
  dégâts).
- **Contrepartie**, dès que le pacte est pris :
  - la bourse et la cagnotte de Tout ou rien sont vidées, les pièces encore au sol disparaissent ;
  - plus aucune pièce ne tombe des ennemis, aucune pièce de fin de vague, pas de Contrat payé ;
  - la boutique de l'écran des cartes (relancer, carte en plus, bannir, racheter) disparaît pour toute la partie ;
  - le Comptoir ne s'ouvre plus ;
  - le panneau des pièces du HUD est barré (« Vœu de pauvreté »).
- **Exclusions** : toutes les cartes du butin (Pillard, Poches profondes, Marchandage, Collecte, Sang d'or, Midas,
  Trésor de guerre), les pactes de la bourse (Péage, Bouclier d'or, Crédit, Assurance, Monnaie piégée, Casino) et
  Avarice, Cupidité, Mercenaire. Aimant reste proposé : il attire encore les caisses.
- Pacte majeur : ne se rachète pas (de toute façon, plus de pièce).
- Pris sur un écran des cartes : la boutique de cet écran est déjà passée (la carte se prend en dernier) ; le
  Comptoir qui suit ne s'ouvre pas.

## Hors périmètre

- Convertir les pièces perdues en points ou en autre chose.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'pauvrete', rar: 'm', max: 1, excl: [...] }` (liste ci-dessus) ; `PAUVRETE_DAMAGE_MUL = 1.4`. |
| rules | `src/rules/modifiers.js` | `shotDamageMul` et `specialMul` (ou une règle `ownBlastMul`) : × `PAUVRETE_DAMAGE_MUL`. |
| rules | `src/rules/scoring.js` | `rollCoins` et `waveCoins` : 0 sous le pacte. |
| game | `src/game/flow.js` | `applyCard` : vide bourse, cagnotte et `world.coins` ; `openPick` masque `#shop` et `#buyback` sous le pacte. |
| game | `src/game/counter.js` | `openShop` : jamais sous le pacte (la bourse vide suffit, mais la règle est écrite). |
| render | `src/render/hud.js`, `src/style.css` | Panneau `.money` barré sous le pacte. |
| render | `src/render/cardIcons.js` | Pictogramme `pauvrete` (bourse barrée). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.pauvrete` : « Vœu de pauvreté » / « Vow of poverty », `plus` et `minus` construits depuis la constante ; libellé du panneau barré. |

## Critères d'acceptation

- Quand le joueur prend Vœu de pauvreté avec 80 pièces, alors sa bourse tombe à 0 et les pièces au sol disparaissent.
- Quand il tue un Blindé ensuite, alors aucune pièce ne tombe ; en fin de vague, aucune pièce n'est versée.
- Quand il arrive sur l'écran des cartes suivant, alors il n'y a ni boutique ni rachat ; le Comptoir ne s'ouvre pas.
- Quand il tire, alors ses balles font 40 % de dégâts en plus.
- Quand il a une carte du butin ou un pacte de la bourse, alors Vœu de pauvreté n'est jamais proposé, et inversement.

## Tests

`tests/scoring.test.js` :
- « Vœu de pauvreté : plus aucune pièce ne tombe »
- « Vœu de pauvreté : la fin de vague ne verse plus de pièces »

`tests/modifiers.test.js` :
- « Vœu de pauvreté : les tirs font 40 % de dégâts en plus »

`tests/cards.test.js` :
- « Vœu de pauvreté n'est jamais proposé avec une carte du butin ni un pacte de la bourse »

## Risques et questions ouvertes

- **Force** : +40 % de dégâts contre la boutique entière ; à comparer avec `npm run balance` (un profil qui prend le
  pacte dès qu'il sort) : la vague atteinte doit rester comparable aux profils qui achètent.
- Exclusions nombreuses : sous le pacte, le tirage perd environ seize cartes ; les autres reviennent plus souvent.
