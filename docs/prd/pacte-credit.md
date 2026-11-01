# Pacte Crédit

## Objectif

Un pacte qui permet d'acheter tout de suite ce qu'on paiera plus tard : la bourse peut descendre sous zéro. Tant que le
joueur est à découvert, il encaisse plus de dégâts. Il achète sa puissance maintenant et joue sous pression jusqu'à
avoir remboursé.

Maquette : https://claude.ai/artifact/Tg5S1mC6N6puESgousYf5Y. Valeurs de départ, à régler en jeu.

## Socle technique

- Achats : tests `S.money < prix` (bouton grisé, action refusée) dans `src/game/flow.js` (relance, carte en plus,
  bannir, rachat) et `src/game/counter.js` (caisses, réassort) ; Comptoir fermé si `S.money <= 0` (`openShop`).
- Pièces : `S.money += …` au ramassage (`updateCoins`) et en fin de vague ; perte de Cupidité `coinsLostOnHit`.
- Coups : `hurtPlayer` ; Trésor de guerre `hoardMul(mods, money)`.
- HUD : `#money`, bourse de l'écran des cartes `#purseNum` et du Comptoir `#shopPurse`.

## Comportement

- Pacte ordinaire, `max` 1.
- **Avantage** : un achat est permis tant que la bourse ne descend pas sous `CREDIT_FLOOR` (−100). Le Comptoir s'ouvre
  même avec une bourse à zéro ou négative, tant qu'il reste du crédit.
- **Contrepartie** : tant que la bourse est négative, les coups encaissés font `CREDIT_HURT_MUL` (×1,3) de dégâts.
- Les pièces gagnées (ramassées, fin de vague) remboursent la dette d'elles-mêmes : la bourse remonte.
- La bourse négative s'affiche en rouge, avec un signe moins, partout où elle apparaît.
- Cupidité ne prend rien sur une bourse négative ou nulle.
- **Exclusions** symétriques : Trésor de guerre (un bonus de dégâts sur une bourse négative n'a pas de sens), Vœu de
  pauvreté.
- **Démo** : jamais proposé.
- **Rachat** (60 pièces, donc bourse positive) : le crédit disparaît. Racheter est impossible à découvert, puisqu'il
  faut 60 pièces.
- Fin de partie à découvert : rien de plus (les pièces ne sont pas enregistrées).

## Hors périmètre

- Intérêts sur la dette.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'credit', rar: 'p', max: 1, excl: ['tresor', 'pauvrete'], noDemo: true }` ; `CREDIT_FLOOR = -100`, `CREDIT_HURT_MUL = 1.3`. |
| rules | `src/rules/shop.js` | `canAfford(mods, money, price)` : `money − price ≥ plancher` (0 sans le pacte) ; `shopOpens(mods, money)`. |
| rules | `src/rules/damage.js` | `debtHurtMul(mods, money)` : `CREDIT_HURT_MUL` sous le pacte et à découvert, 1 sinon. |
| rules | `src/rules/scoring.js` | `coinsLostOnHit` : jamais plus que `max(0, money)`. |
| game | `src/game/flow.js`, `src/game/counter.js` | Tous les tests de prix passent par `canAfford` ; `openShop` par `shopOpens`. |
| game | `src/game/combat.js` | `hurtPlayer` : dégâts × `debtHurtMul`. |
| render | `src/render/hud.js`, `src/game/flow.js`, `src/game/counter.js`, `src/style.css` | Bourse négative en rouge (`.money.debt`, `.purse.debt`). |
| render | `src/render/cardIcons.js` | Pictogramme `credit` (carte de paiement). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.credit` : « Crédit » / « Credit », `plus` et `minus` construits depuis les constantes. |

## Critères d'acceptation

- Quand le joueur a Crédit et 10 pièces, alors il peut acheter une caisse à 25 et sa bourse passe à −15, en rouge.
- Quand sa bourse est à −95, alors une caisse à 10 est grisée.
- Quand il est à découvert et qu'un zombie le frappe (10 PV), alors il perd 13 PV.
- Quand il ramasse 20 pièces à −15, alors sa bourse passe à 5 et les dégâts redeviennent normaux.
- Quand sa bourse est à 0 en fin de vague, alors le Comptoir s'ouvre quand même.

## Tests

`tests/shop.test.js` :
- « Crédit : un achat est permis jusqu'à −100 »
- « Crédit : le Comptoir s'ouvre avec une bourse vide »
- « sans Crédit, un achat ne fait jamais passer la bourse sous zéro »

`tests/damage.test.js` :
- « Crédit : à découvert, un coup fait 30 % de dégâts en plus »

`tests/scoring.test.js` :
- « Cupidité ne prend rien sur une bourse négative »

## Risques et questions ouvertes

- Le harnais (`scripts/balance/decide.js`) raisonne en « bourse moins réserve » : un profil pilleur sous Crédit
  dépenserait jusqu'au plancher. À régler dans le profil si on veut mesurer le pacte.
- Racheter Crédit demande 60 pièces positives : un joueur endetté ne peut pas en sortir autrement qu'en remboursant.
  Voulu.
