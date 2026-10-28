# Refactor decisions

Written by `/refactor-game`. Records what the code cannot express: why this layout, why
this toolchain, what was deliberately not touched, what is still undecided.

Read by `/scaffold-claude` so it does not have to re-deduce any of it.

## Deliberately left alone

Behaviour that looks wrong but was preserved, because the refactor must not change the
game. Each entry: what it is, where, and why it was not fixed.

- **Champ de distances : tuiles jamais propagées (arrondi Float32).** `relax()` dans
  `src/rules/pathfield.js` compare la distance extraite du tas (float64) à sa copie stockée dans un
  `Float32Array` (`if (d > D[i]) continue`). Quand l'arrondi Float32 descend sous la valeur exacte
  — fréquent dès qu'un chemin passe par des diagonales (coût 1,414) — la tuile est sautée et ses
  voisines ne sont pas propagées. Mesuré sur la version d'origine : 292 tuiles sur 1 320 sans
  chemin dans une arène vide, de 5 à 23 % des tuiles de sol dans l'arène réelle selon la position
  du joueur. Un ennemi sur une telle tuile n'obtient pas de `nextStep`. Comportement identique
  au prototype (vérifié tuile à tuile sur 140 positions du joueur). Documenté par un
  `test.fails` dans `tests/pathfield.test.js`.
