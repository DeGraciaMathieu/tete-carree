# Butin : pièces et boutique de l'écran des cartes

## Objectif

Les ennemis abattus lâchent des pièces, qui disparaissent vite. Il faut donc aller les chercher
pendant le combat, au milieu de la horde, au lieu de seulement reculer en tirant. Entre deux vagues,
ces pièces se dépensent sur l'écran des cartes pour agir sur le tirage : relancer, ajouter une carte,
bannir une carte, racheter un pacte. Le joueur gagne une prise sur la construction de sa partie, et
la prend en échange d'un risque.

L'argent est séparé du score : le score continue de débloquer les armes et de compter pour le record ;
les pièces ne servent qu'à la boutique et sont perdues à la fin de la partie.

Maquette jouable : https://claude.ai/artifact/LVcfU8T3XweGymNnNctdt8. Les valeurs chiffrées
ci-dessous sont des valeurs de départ, à régler en jeu.

## Socle technique

- **Chute d'objets** : `killEnemy` (`src/game/combat.js`) appelle `rollDrop(type, onVoid, rng, mods)`
  (`src/rules/scoring.js`) et pousse une caisse dans `world.pickups`. Un ennemi tombé dans une crevasse
  (`fell`) sort de `killEnemy` avant ce tirage : il ne lâche rien.
- **Ramassage** : section « ramassage » de `src/loop/update.js` : attraction par Aimant
  (`AIMANT_RANGE × niveau`, `AIMANT_SPEED`), prise sous `PICKUP_RADIUS`, puis
  `world.pickups = world.pickups.filter(…)`. Les caisses n'expirent pas et sont plafonnées à
  `MAX_PICKUPS` (3) : les pièces ont besoin de leur propre collection.
- **Fin de vague** : même fichier, bloc `if (!S.queue.length && world.enemies.length === 0)` :
  `waveBonus` ajouté au score, `S.pickT = pickAfter(…) ? PICK_DELAY : 0`, puis `openPick()` quand
  `S.pickT` s'écoule.
- **Écran des cartes** : `openPick`, `choosePick`, `dealCards`, `takeAll`, `applyCard`, `focusCard`
  (`src/game/flow.js`), état `world.state = 'pick'`, `pickChoices`, `pickLocked`, `pickTimers`.
  Balisage `#pickScreen` / `#cards` / `#pickHint` dans `index.html`, styles « Choix de carte » de
  `src/style.css`.
- **Tirage** : `rollCards(mods, rng, legend, ctx)` (`src/rules/cards.js`), avec la Légendaire promise par
  Marché du diable (`S.legendNext`, remis à `false` dans `openPick`) et le pacte majeur garanti
  (`majorDue`).
- **Saisie** : `src/input/keyboard.js` (chiffres → `choosePick`), `src/input/gamepad.js` (croix,
  stick, A → `focusCard` / `choosePick`) ; au tactile, les cartes sont des `<button>`.
- **État** : `S` et `world` (`src/state/world.js`), réinitialisés par `resetWorld`. Aléatoire de gameplay
  par `rng()` / `jitter()`.
- **HUD** : `updateHud` (`src/render/hud.js`), `#score`, puces `#mods`, masquage par `#hud.silence`.
- **Démo** : `world.demo`, `demoPick()` choisit sans écran.

## Comportement

### Chute des pièces

À la mort d'un ennemi (hors chute en crevasse), un tirage `rng()` décide s'il lâche des pièces :

| Ennemi | Chance | Pièces |
| --- | --- | --- |
| Zombie `z` | 30 % | 1 |
| Coureur `r` (meutes `p<n>` comprises) | 20 % | 1 |
| Cracheur `s` | 60 % | 2 |
| Gonflé `b` | 100 % | 2 |
| Diable `d` | 100 % | 3 |
| Blindé `a` | 100 % | 5 |

- Chaque pièce est un objet de `world.coins` (`{ x, y, z, vz, life }`) qui vaut 1. Elles s'éparpillent
  autour du corps (décalage tiré par `jitter()`) avec un petit saut vertical cosmétique.
- Pas de pièce au-dessus du vide (`isVoid`), ni pour un ennemi tombé dans une crevasse.
- **Aucune pièce en démo.**
- Plafond `COIN_MAX` (80) pièces au sol : au-delà, la plus ancienne disparaît.

### Au sol

- Une pièce reste `COIN_LIFE` (6 s), et clignote pendant les `COIN_BLINK` (2 s) dernières.
- Le joueur la prend en passant dessus (`PICKUP_RADIUS`, comme une caisse) : +1 pièce, son court
  synthétisé, petit chiffre flottant « +1 » en or.
- **Aimant** attire aussi les pièces, avec la même portée et la même vitesse que pour les caisses.
- Le temps de vie s'écoule pendant la pause entre deux vagues, mais pas pendant l'écran des cartes ni
  la pause (`update` ne tourne pas).
- Joueur mort : plus de ramassage.

### Fin de vague

En plus des points, la vague terminée crédite directement `COIN_WAVE_BONUS × numéro de vague` pièces
(1 × vague : 6 pièces en fin de vague 6). La bannière de fin de vague l'indique.

### Bourse

- `S.money`, à 0 au début de la partie (`resetWorld`), jamais négatif.
- Affichée dans le HUD, dans un panneau à côté du score (`#money`), et en haut à droite de l'écran
  des cartes.
- Sous **Silence**, le panneau du HUD est masqué comme le score ; il reste visible sur l'écran des
  cartes.
- Non enregistrée : rien dans `localStorage`, rien dans les meilleures parties.

### Boutique de l'écran des cartes

Les actions sont possibles quand toutes les cartes sont retournées et qu'aucune n'est choisie
(`!pickLocked`). Un bouton trop cher est grisé. Chaque achat retire son prix de `S.money`.

| Action | Prix | Règle |
| --- | --- | --- |
| Relancer | `REROLL_COST` 10, puis +`REROLL_STEP` 5 à chaque relance | Retire toutes les cartes de la table et en distribue de nouvelles, en même nombre, avec la même animation. Le prix revient à 10 au prochain écran. Les garanties de l'écran sont conservées : Légendaire promise par Marché du diable, pacte majeur dû (`majorDue`). |
| Carte en plus | `EXTRA_CARD_COST` 25 | Une fois par écran. Ajoute une 4ᵉ carte, tirée parmi celles qui ne sont pas déjà sur la table. Tant qu'elle n'est pas achetée, l'emplacement montre un dos de carte avec son prix. Une relance après l'achat redistribue 4 cartes. |
| Bannir | `BAN_COST` 15 | Active un mode de bannissement ; le clic suivant sur une carte la bannit au lieu de la prendre (Échap, B ou un second clic sur le bouton annule). La carte est remplacée par un tirage sans garantie et ne sera plus jamais proposée de la partie. Pas de limite par écran. Une carte de n'importe quelle rareté peut être bannie, pacte majeur compris. |
| Racheter un pacte | `BUYBACK_COST` 60 | Proposé pour chaque pacte ordinaire possédé (rareté `p`), jamais pour un pacte majeur. Voir ci-dessous. |

**Racheter un pacte** retire le pacte de `S.mods`, avec son avantage et sa contrepartie, quel que soit
son niveau. Un pacte racheté est banni : il ne ressortira plus. Effets immédiats à annuler :

| Pacte | Annulation |
| --- | --- |
| Marché du diable | Vie max +`DIABLE_HP` (la vie actuelle ne change pas). Si la Légendaire promise n'a pas encore été tirée (`S.legendNext`), elle est annulée. |
| Canon de verre | Vie max +`VERRE_HP` (la vie actuelle ne change pas). |
| Sans répit | Les crans gagnés (`S.repit`) sont perdus. |
| Fièvre, Vampire, Sans armure, Enraciné… | Rien de plus : leurs effets se lisent dans `S.mods` à chaque image. |

Les cartes de la table restent en place après un rachat, même si le pacte racheté les excluait.

**Sous Pas de pause** (toutes les cartes proposées sont gagnées) : relancer et bannir restent
disponibles, la carte en plus n'est pas proposée.

**Sous Spécialiste** : la boutique disparaît sur l'écran du choix de l'arme gardée.

### Saisie

| Action | Clavier | Manette | Souris / tactile |
| --- | --- | --- | --- |
| Prendre la carte n | 1 à 4 | A sur la carte en focus | clic / tap |
| Relancer | R | X | bouton « Relancer » |
| Carte en plus | C | Y | dos de carte / bouton |
| Bannir | B (puis le chiffre de la carte) | LB pour entrer dans le mode, puis A | bouton « Bannir », puis la carte |
| Racheter un pacte | clic seulement | croix bas : la rangée des pactes prend le focus ; A pour racheter, croix haut pour revenir aux cartes | clic / tap sur la puce du pacte |
| Annuler le bannissement | Échap ou B | B | second appui sur le bouton |

Les touches s'affichent sur les boutons (`only-desk`), comme les chiffres sous les cartes.
`#pickHint` et le texte manette `pickHintPad` les mentionnent.

## Hors périmètre

- Ravitaillement, améliorations d'armes, achat de constructions avant la vague (options 2, 3 et 4
  de la réflexion).
- Toute méta-progression : les pièces ne survivent pas à la partie.
- Nouvelles cartes ou nouveaux pactes liés aux pièces (Avarice, Cupidité…).
- Achat des armes avec des pièces : elles restent débloquées par le score.
- Pièces dans la démo de l'accueil.
- Affichage des pièces dans les meilleures parties ou l'écran de fin.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | Section « Butin » : `COIN_CHANCE` et `COIN_VALUE` par type, `COIN_LIFE`, `COIN_BLINK`, `COIN_MAX`, `COIN_WAVE_BONUS`, `REROLL_COST`, `REROLL_STEP`, `EXTRA_CARD_COST`, `BAN_COST`, `BUYBACK_COST`. |
| rules | `src/rules/scoring.js` | `rollCoins(type, onVoid, rng)` → nombre de pièces ; `waveCoins(wave)`. |
| rules | `src/rules/shop.js` (nouveau) | `rerollCost(rerolls)`, `canBuyExtra(mods, extraBought)` (faux sous Pas de pause), `buybackable(mods)` (pactes `p` possédés), `buyback(mods, id)` → nouveaux `mods` sans le pacte, sans muter l'argument. |
| rules | `src/rules/cards.js` | `rollCards` reçoit `ctx.banned` (ids jamais proposés) et `ctx.without` (cartes déjà sur la table), et `ctx.count` (nombre de cartes, `CARDS_PER_PICK` par défaut). |
| state | `src/state/world.js` | `world.coins = []`, `S.money = 0`, `S.banned = []` dans `resetWorld`. |
| game | `src/game/combat.js` | `killEnemy` : après `rollDrop`, `rollCoins` puis ajout des pièces (sauf démo). |
| game | `src/game/flow.js` | État de l'écran : `pickRerolls`, `pickExtra`, `pickBanning`, garanties gardées pour la relance. Actions `rerollPick`, `buyExtraCard`, `toggleBan`, `banCard(i)`, `buybackPact(id)`. `choosePick` passe par `banCard` en mode bannissement. `openPick` passe `banned` à `rollCards`. Annulation des effets immédiats au rachat (voir le tableau). |
| loop | `src/loop/update.js` | Section « ramassage » : durée de vie, Aimant, prise des pièces, retrait sans allocation (parcours à rebours avec `splice` ou compactage en place, pas de `filter` à chaque image). Fin de vague : `S.money += waveCoins(S.wave)`. |
| render | `src/render/scene.js` | `drawCoin` trié en profondeur avec les autres objets, clignotement, ombre, contour sombre ; vue 3/4 (ellipse × .55). |
| render | `src/render/hud.js` | Panneau `#money` dans `updateHud`, bourse et boutique de l'écran des cartes, état grisé des boutons. |
| audio | `src/audio/` | Son court de pièce, distinct de `pickup`, limité en fréquence comme `splat`. |
| input | `src/input/keyboard.js`, `src/input/gamepad.js` | Touches R, C, B, Échap et chiffre 4 ; boutons X, Y, LB, B et rangée des pactes à la croix. |
| documentation vivante | `index.html`, `src/style.css`, `src/i18n/fr.js`, `src/i18n/en.js` | Bourse et boutons dans `#pickScreen` (`data-i18n`) ; panneau `#money` dans le HUD et règle `#hud.silence` ; nouveaux textes (libellés, aides, bannière de fin de vague « +n pièces », messages de bannissement et de rachat) dans les deux langues ; `cards.aimant.desc` : « Les caisses et les pièces glissent vers toi… » ; touches de la boutique dans le volet Contrôles (`keys` clavier et manette). |
| décisions | `docs/decisions.md` | Section « Butin » : argent séparé du score, pièces perdues en fin de partie, pas de pièces en démo. |

## Critères d'acceptation

- Quand un Blindé meurt hors crevasse, alors 5 pièces tombent autour de son corps.
- Quand un ennemi tombe dans une crevasse, alors aucune pièce ne tombe.
- Quand une pièce reste 6 s au sol sans être ramassée, alors elle disparaît ; elle clignote pendant les
  2 dernières secondes.
- Quand le joueur passe sur une pièce, alors la bourse gagne 1 et la pièce disparaît.
- Quand le joueur a Aimant, alors les pièces dans son rayon glissent vers lui.
- Quand la vague 6 se termine, alors la bourse gagne 6 pièces en plus des points.
- Quand le joueur relance trois fois sur le même écran, alors il paie 10, 15 puis 20 ; au prochain
  écran, la relance coûte de nouveau 10.
- Quand le joueur relance après un Marché du diable, alors la nouvelle main contient toujours une
  Légendaire.
- Quand le joueur achète une carte en plus, alors une 4ᵉ carte différente des trois autres apparaît,
  et l'achat n'est plus proposé sur cet écran.
- Quand le joueur bannit une carte, alors elle est remplacée et n'est plus jamais proposée de la partie.
- Quand le joueur rachète Canon de verre, alors sa vie max remonte de 40 et Canon de verre ne sera plus
  proposé.
- Quand le joueur possède un pacte majeur, alors aucun bouton ne permet de le racheter.
- Quand le joueur est sous Pas de pause, alors la carte en plus n'est pas proposée.
- Quand une action coûte plus que la bourse, alors son bouton est grisé et l'action ne fait rien.
- Quand une carte est encore face cachée, alors aucune action de la boutique n'est possible.
- Dans la démo de l'accueil, aucune pièce ne tombe.
- Les trois modes de saisie (clavier, manette, tactile) donnent accès à toutes les actions.

## Tests

`tests/scoring.test.js` :
- « un Blindé abattu lâche toujours 5 pièces »
- « un zombie lâche une pièce environ une fois sur trois » (fréquence sur une graine fixe et 10 000 tirages)
- « un ennemi tué au-dessus du vide ne lâche aucune pièce »
- « la fin de la vague 6 rapporte 6 pièces »

`tests/shop.test.js` (nouveau) :
- « la relance coûte 10, puis 5 de plus à chaque relance du même écran »
- « la carte en plus n'est pas proposée sous Pas de pause »
- « seuls les pactes ordinaires possédés peuvent être rachetés »
- « racheter un pacte le retire entièrement, quel que soit son niveau »
- « racheter un pacte ne modifie pas les cartes passées en argument »

`tests/cards.test.js` :
- « une carte bannie n'est plus jamais proposée »
- « la carte en plus est différente des cartes déjà sur la table »
- « relancer après le Marché du diable propose toujours une Légendaire »
- « un pacte majeur dû reste garanti après une relance »
- Vérifier que les tests existants sur graine fixe restent valides : `rollCards` sans `ctx.banned` ni
  `ctx.without` doit tirer exactement comme aujourd'hui.

`tests/i18n.test.js` : couvre les nouvelles clés dans les deux langues sans rien ajouter.

Vérifications manuelles :
- Sensation du ramassage : lisibilité des pièces sur chaque sol d'arène, clignotement, son pas trop
  présent quand un Blindé en lâche 5.
- Écran des cartes à 1280 × 720, sur téléphone (cartes couchées sous 640 px, 4ᵉ carte comprise) et à
  la manette.
- Économie : nombre de pièces gagnées par vague en partie réelle (cible : 20 à 30 au milieu de partie).
- `npm run perf` après le branchement dans `update` et `scene.js`.

## Risques et questions ouvertes

- **Ordre des tirages `rng`** : le tirage des pièces ajoute des appels à `rng()` à chaque mort
  d'ennemi. Pour une même graine, la suite de la partie (caisses, cartes, écarts de tir) change. Aucun
  test actuel ne joue une partie entière sur graine, mais toute reproduction de partie faite avant ce
  changement ne sera plus valable.
- **Performances** : jusqu'à `COIN_MAX` objets de plus à mettre à jour, trier et dessiner à chaque
  image. Pas de tableau temporaire dans `update` ni dans `scene.js` ; `npm run perf` doit passer sous
  10 Mo/s.
- **Équilibrage** : la relance et le bannissement rendent les combinaisons visées plus faciles
  (Frénésie, Tourelle). Le prix croissant de la relance est le frein principal ; à surveiller en jeu.
- **Rachat et poids des pactes** : un pacte racheté pendant la vague où son malus pèse le plus devient
  un bonus temporaire peu cher (Prime de risque prise, rentabilisée, puis rachetée). 60 pièces est
  peut-être trop bas.
- **Bannir sans limite** : on pourrait vider le tirage d'une rareté entière. À garder ou à limiter à un
  bannissement par écran ?
- **Tout ou rien** : la cagnotte de points est perdue sur un coup encaissé ; les pièces, non. Faut-il
  que les pièces ramassées pendant la vague passent aussi par la cagnotte ?
- **Pièces au sol pendant l'écran des cartes** : à `PICK_DELAY`, des pièces peuvent encore être au sol ;
  elles reprennent leur décompte après le choix. À vérifier en jeu que ce n'est pas frustrant.
