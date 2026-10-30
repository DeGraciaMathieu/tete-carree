# Le bug d'arrondi du champ de distances

Comportement conservé volontairement (`docs/decisions.md`, « Deliberately left alone »). Ce document
explique ce qu'il fait, pourquoi on ne le voit pas en partie, et ce qu'il pèse arène par arène.

Page interactive (artifact privé), calculée avec une copie de `rules/pathfield.js` sur les vrais plans :
<https://claude.ai/artifact/VB8t3yVEDGcnhnb5dduW2s>. On y place le joueur d'un clic, on le fait marcher,
et on compare avec et sans le bug.

## Comment la horde trouve son chemin

1. **Une carte des distances.** Toutes les `FIELD_PERIOD` secondes (0,22 s), `computeField` calcule pour
   chaque case la longueur du chemin jusqu'à la case du joueur : 1 par pas droit, 1,414 par pas en diagonale.
2. **Descendre la pente.** À chaque image, un ennemi regarde ses huit voisines et va vers celle qui a le
   plus petit nombre (`nextStep`). Il contourne ainsi murs et crevasses.
3. **Sinon, tout droit.** Si sa case n'a pas de nombre et qu'aucune voisine ne fait mieux, `nextStep` ne
   rend rien et l'ennemi marche droit sur le joueur (`loop/update.js`). Il marche aussi droit sur lui
   quand il est à moins de 1,3 case et qu'aucun obstacle ne les sépare (`walkLine`).

## Le bug, avec un vrai nombre

Le calcul se fait en nombres 64 bits (le tas), mais la carte les range dans un `Float32Array`. En les
rangeant, certains nombres sont arrondis un tout petit peu vers le bas. Un chemin de 7 diagonales :

```
distance calculée          7 × 1,414 = 9,898
distance rangée (32 bits)              9,897999763…
contrôle de relax()        « 9,898 > 9,897999763 ? »  →  oui
```

Dans `relax()`, `if (d > D[i]) continue` veut dire : « cette case a déjà reçu un chemin plus court,
cette entrée du tas est périmée ». La case est donc ignorée. Elle garde sa distance, mais ne la transmet
jamais à ses voisines. Les cases qu'on ne pouvait atteindre que par elle restent à `UNREACHABLE` :
ce sont les cases **sans chemin**. Le phénomène est fréquent dès que les chemins passent par des
diagonales.

Le test `test.fails` de `tests/pathfield.test.js` le documente. Il passera au rouge le jour où le bug
sera corrigé.

## Pourquoi on ne le voit pas en partie

- **La zone bouge sans cesse.** Les cases sans chemin dépendent de la case exacte du joueur, et la carte
  est recalculée toutes les 0,22 s. Dès que le joueur fait un pas, elles changent. Un ennemi n'y reste
  qu'une fraction de seconde.
- **« Tout droit » marche souvent.** En terrain dégagé, marcher droit sur le joueur est le bon chemin.
  Contre un mur, l'ennemi glisse le long de la paroi (`moveCircle` traite les deux axes séparément) et
  retrouve vite une case qui a un chemin.
- **Loin du joueur.** Les cases touchées sont surtout à l'autre bout de l'arène, derrière des obstacles :
  là où les ennemis passent juste après leur entrée, pas au contact, là où le joueur regarde.

Seul compte vraiment le cas où un ennemi est sur une case sans chemin, qu'aucune voisine n'a de chemin
et qu'un mur le sépare du joueur : il **bute**.

## Mesures

« Sans chemin » : part des cases de sol à `UNREACHABLE`. « Bute » : part des cases de sol où `nextStep`
ne rend rien **et** où un mur coupe la ligne droite vers le joueur. « En moyenne » : joueur placé tour à
tour sur une case sur quatre de l'arène (une colonne et une rangée sur deux).

| Arène | Sans chemin, joueur au centre | Sans chemin, en moyenne | Bute, en moyenne |
| --- | --- | --- | --- |
| La Fosse | 1 % | 6 % | 3,3 % |
| Camp de Sibérie | 5 % | 9 % | 5,2 % |
| Les égouts | 1 % | 8 % | 5,2 % |
| Le Pont | 7 % | 11 % | 5,8 % |
| Chinatown | 9 % | 12 % | 7,9 % |
| Entrepôt | 11 % | 18 % | 10,2 % |
| Colonnade | 11 % | 22 % | 11,1 % |
| Camp militaire | 33 % | 24 % | 13,8 % |
| Bunker | 66 % | 33 % | 23,1 % |

Le chiffre « joueur au centre » est une photo prise depuis la case de départ. Il peut tromper : le camp
militaire y monte à 33 % parce que le centre tombe mal pour ce plan, mais en moyenne il reste proche de
la Colonnade et de l'Entrepôt. Le Bunker est la seule arène nettement à part.

## Décision

On garde le bug et les plans tels quels. Le camp militaire ne pèse pas plus, en moyenne, que des arènes
où rien d'anormal n'a été remarqué en partie. La question de corriger le bug, ou de retoucher le Bunker,
reste ouverte dans `docs/decisions.md`.
