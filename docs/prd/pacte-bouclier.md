# Pacte Bouclier d'or

## Objectif

Un pacte qui fait de la bourse une deuxième barre de vie : les coups se paient d'abord en pièces. En échange, tout ce
qui s'achète coûte deux fois plus. Le joueur choisit entre dépenser pour se renforcer et garder ses pièces pour encaisser.

Maquette : https://claude.ai/artifact/Tg5S1mC6N6puESgousYf5Y. Valeurs de départ, à régler en jeu.

## Socle technique

- Coups : `hurtPlayer(dmg, soft, by)` (`src/game/combat.js`) : protections (`playerProtected`), Gilet du Comptoir,
  puis `player.hp -= dmg`, combo, cagnotte de Tout ou rien, Second souffle, mort.
- Prix : `discounted(price, mods)` (`src/rules/shop.js`, Marchandage), appliqué par `price()` à tous les prix de
  `src/game/flow.js` et `src/game/counter.js`.
- Cupidité (`docs/prd/carte-cupidite.md`) : un coup fait tomber 5 pièces de la bourse.

## Comportement

- Pacte ordinaire, `max` 1.
- **Avantage** : un coup encaissé (y compris l'acide et la perte du Sablier) est payé en pièces avant la vie :
  `BOUCLIER_COIN_HP` (2) PV par pièce, arrondi à la pièce supérieure. Si la bourse ne suffit pas, elle est vidée et le
  reste passe sur la vie. Exemple : un coup de zombie (10 PV) coûte 5 pièces ; un coup de Blindé (15 PV) en coûte 8.
- Le coup reste un coup : combo entamé, cagnotte de Tout ou rien perdue, Contrat raté, tremblement d'écran.
- Les pièces sortent de la bourse, jamais de la cagnotte de Tout ou rien.
- Chiffre flottant « −5 » doré au lieu du rouge des PV quand le coup est entièrement payé.
- **Contrepartie** : tous les prix en pièces sont multipliés par `BOUCLIER_PRICE_MUL` (×2) : relance, carte en plus,
  bannissement, rachat d'un pacte, réassort, caisses du Comptoir. Marchandage s'applique ensuite (remise sur le prix
  doublé). Le rachat de Bouclier d'or lui-même coûte donc 120 pièces (102 avec Marchandage).
- **Exclusions** symétriques : Cupidité (un coup ferait perdre deux fois), Vœu de pauvreté.
- **Démo** : jamais proposé.
- **Rachat** : les prix et les coups redeviennent normaux.

## Hors périmètre

- Soins payés en pièces.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'bouclier', rar: 'p', max: 1, excl: ['cupidite', 'pauvrete'], noDemo: true }` ; `BOUCLIER_COIN_HP = 2`, `BOUCLIER_PRICE_MUL = 2`. |
| rules | `src/rules/damage.js` | `coinShield(mods, dmg, money)` → `{ coins, dmg }` : pièces payées et dégâts restants. |
| rules | `src/rules/shop.js` | `discounted` devient le prix payé : × `BOUCLIER_PRICE_MUL` sous le pacte, puis remise de Marchandage. |
| game | `src/game/combat.js` | `hurtPlayer` : après le Gilet, `coinShield` ; débit de la bourse, chiffre flottant, puis vie. |
| render | `src/render/cardIcons.js` | Pictogramme `bouclier` (pièce en bouclier). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.bouclier` : « Bouclier d'or » / « Golden shield », `plus` et `minus` construits depuis les constantes. |

## Critères d'acceptation

- Quand le joueur a Bouclier d'or et 40 pièces et qu'un zombie le frappe, alors sa bourse tombe à 35 et sa vie ne
  bouge pas.
- Quand il a 3 pièces et qu'un Blindé le frappe (15 PV), alors sa bourse tombe à 0 et il perd 9 PV.
- Quand il a Bouclier d'or, alors la première relance coûte 20 pièces et le rachat d'un pacte 120.
- Quand il a Bouclier d'or, alors Cupidité n'est jamais proposée, et inversement.

## Tests

`tests/damage.test.js` :
- « Bouclier d'or : un coup de 10 PV coûte 5 pièces et aucun PV »
- « Bouclier d'or : une bourse trop maigre est vidée, le reste passe sur la vie »
- « sans Bouclier d'or, le coup va entièrement sur la vie »

`tests/shop.test.js` :
- « Bouclier d'or : tout coûte deux fois plus cher, Marchandage s'applique après »

`tests/cards.test.js` :
- « Bouclier d'or et Cupidité ne sont jamais proposés ensemble »

## Risques et questions ouvertes

- **Force avec Midas et Pillard** : une grosse bourse rend presque invulnérable. Les prix doublés sont le frein ; à
  mesurer avec `npm run balance`.
- **Lisibilité** : la barre de vie ne bouge pas pendant que la bourse fond ; le chiffre doré au-dessus du joueur doit
  suffire, à vérifier en jeu.
