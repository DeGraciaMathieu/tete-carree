# Pacte Péage

## Objectif

Un pacte où la roulade devient une dépense : plus de charge ni de recharge, on roule autant qu'on veut, mais chaque
roulade coûte des pièces. Le joueur riche roule sans compter, le joueur pauvre doit garder de quoi s'échapper.

Maquette : https://claude.ai/artifact/Tg5S1mC6N6puESgousYf5Y. Valeurs de départ, à régler en jeu.

## Socle technique

- Roulade : `tryRoll` (`src/game/player.js`) refuse sans charge (`player.rollCharges`), décrémente la charge, retire
  les PV de Terre brûlée (`rollHpCost`) ; charges rendues par `player.rollCd` dans `update`, `rollMax` (1, +1 avec
  Double roulade, 0 sous Sans échappatoire), `rollCooldown` (`ROLL.CD` 0,7 s). Roulade : `ROLL.D` 0,46 s, protégée de
  `ROLL.A` 0,06 s à `ROLL.B` 0,36 s ; elle traverse les crevasses (`rollClears`).
- Effets de roulade : Roulade explosive (`rollboom`), Roulade tactique (`rollammo`), Traînée de feu (`firetrail`),
  Coup d'épaule (`epaule`), dans `rollPerks` et `updateRoll`.
- Jauge de roulade : `render/sprites.js` (pastilles `rollMax()`), bouton ROULER au tactile (`#rollBtn.cd`).
- Bourse : `S.money` ; aucune pièce en démo.

## Comportement

- Pacte ordinaire, `max` 1.
- **Avantage** : plus de charge ni de recharge. Une roulade peut partir dès que la précédente est finie.
- **Contrepartie** : chaque roulade coûte `PEAGE_COST` (10) pièces, retirées au départ. Avec moins de 10 pièces en
  bourse, la roulade fait le clic à vide (`sfx('click')`), comme sous Sans échappatoire. Sous Tout ou rien, le prix
  sort de la bourse, pas de la cagnotte.
- Chiffre flottant « −10 » doré au-dessus du joueur à chaque roulade.
- Les effets de roulade gardent leur règle (Roulade explosive à chaque roulade, Roulade tactique rend ses munitions,
  Traînée de feu, Coup d'épaule) : on les paie.
- **Exclusions** symétriques : Sans échappatoire (plus de roulade), Terre brûlée (roulade payée en PV), Double roulade
  (inutile), Vœu de pauvreté (plus de pièces).
- **Démo** : jamais proposé.
- **Rachat** (60 pièces) : la charge et la recharge reviennent ; `rollCharges` est remis à `rollMax()`.
- Jauge : sous Péage, les pastilles de charge laissent la place au prix (« 10 » doré, grisé si la bourse ne suffit
  pas) ; bouton ROULER grisé au tactile dans le même cas.

## Hors périmètre

- Changer la durée ou la protection de la roulade.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'peage', rar: 'p', max: 1, excl: ['entrave', 'brulee', 'double', 'pauvrete'], noDemo: true }` ; `PEAGE_COST = 10`. Nouveau champ `noDemo` (carte jamais proposée en démo), partagé par les pactes de la bourse. |
| rules | `src/rules/modifiers.js` | `rollPrice(mods)` : `PEAGE_COST` sous Péage, 0 sinon ; `canRoll(mods, charges, money)` : sous Péage, `money ≥ prix`, sinon `charges > 0`. |
| rules | `src/rules/cards.js` | `rollCards` écarte les cartes `noDemo` quand `ctx.demo`. |
| game | `src/game/player.js` | `tryRoll` : `canRoll` au lieu du test des charges ; sous Péage, débit et chiffre flottant au lieu de la charge. |
| game | `src/game/flow.js` | Rachat : `undoPact` remet `rollCharges` à `rollMax()`. |
| render | `src/render/sprites.js`, `src/render/hud.js` | Jauge de roulade : prix au lieu des pastilles ; `#rollBtn.cd` quand la bourse ne suffit pas. |
| render | `src/render/cardIcons.js` | Pictogramme `peage` (barrière). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.peage` : « Péage » / « Toll », `plus` et `minus` construits depuis `PEAGE_COST`. |

## Critères d'acceptation

- Quand le joueur a Péage et 35 pièces, alors il peut enchaîner 3 roulades et sa bourse tombe à 5.
- Quand il a 9 pièces, alors la roulade fait le clic à vide.
- Quand il a Péage, alors Sans échappatoire, Terre brûlée et Double roulade ne sont jamais proposées, et inversement.
- Dans la démo de l'accueil, Péage n'est jamais tiré.
- Quand il rachète Péage, alors il retrouve sa charge de roulade.

## Tests

`tests/modifiers.test.js` :
- « Péage : une roulade coûte 10 pièces »
- « Péage : sans 10 pièces, pas de roulade, même avec une charge »
- « Péage : sans charge, la roulade part quand même si la bourse suffit »
- « sans Péage, la roulade dépend des charges comme avant »

`tests/cards.test.js` :
- « Péage n'est jamais proposé avec Sans échappatoire, Terre brûlée ni Double roulade »
- « la démo ne tire jamais un pacte de la bourse »

Vérification manuelle : enchaînement des roulades au clavier, à la manette et au tactile ; lisibilité du prix sur la
jauge.

## Risques et questions ouvertes

- **Roulades enchaînées** : la roulade protège 0,30 s sur 0,46 s ; enchaînées, elles protègent 65 % du temps, pour
  environ 20 pièces par seconde. Le prix est le seul frein : à surveiller avec Midas, Avarice et Pillard.
- **Crevasses** : une roulade traverse une crevasse ; sous Péage, on les traverse à volonté tant qu'on paie.
- `npm run balance` : le pilote roule au contact (`dodge`) ; ses dépenses de roulade ne sont pas comptées comme des
  achats (à ajouter à la mesure des pièces dépensées si on veut les suivre).
