# Comptoir : étale de caisses entre les vagues

## Objectif

Après l'écran des cartes, un second écran, le Comptoir, propose 4 caisses tirées au hasard, à acheter
avec les pièces du butin. Les cartes construisent la partie ; le Comptoir prépare la vague qui vient :
rien de ce qui s'y achète ne dure au-delà. Le joueur a une raison de dépenser à chaque vague, et un
moyen d'adoucir pour une vague le malus d'un pacte qu'il a choisi.

Maquette jouable : https://claude.ai/artifact/CZuvEqXWAyXybQ6bpjGZ9x. Les prix, raretés et effets
chiffrés ci-dessous sont des valeurs de départ, à régler en jeu.

## Socle technique

- **Fin de vague et pause** : `src/loop/update.js`, bloc de fin de vague (`S.waveActive = false`,
  `S.breakT = waveBreak(…)`, `S.pickT = pickAfter(S.mods, S.wave) ? PICK_DELAY : 0`, pièces de fin de
  vague), puis `if (S.pickT > 0) { … openPick() }` et `S.breakT` jusqu'à `startWave()`.
- **Écran des cartes** : `src/game/flow.js`. Il se ferme par `world.state = 'play'` à quatre
  endroits : délai de `choosePick`, `takeAll` (Pas de pause), `chooseWeapon` (Spécialiste) et
  `banCard` quand il ne reste aucune carte. Boutique de cet écran : `rerollPick`, `buyExtraCard`,
  `toggleBan`, `buybackPact` ; règles pures dans `src/rules/shop.js`.
- **Bourse** : `S.money`, `S.coinPot` (Tout ou rien), pièces `world.coins`, `rollCoins`, `COIN_CHANCE`,
  `COIN_LIFE` (`src/rules/scoring.js`, `src/game/combat.js`, `updateCoins` dans `update.js`).
- **Raretés** : `RAR` (`c` 55, `r` 28, `l` 9…) et tirage pondéré de `rollCards` (`src/rules/cards.js`).
- **Vague** : `startWave` (`src/game/enemies.js`) construit `S.queue = waveQueue(n, S.mods, rng)`
  (`src/rules/waves.js`) ; Blindés à partir de la vague 6 (`WAVE_UNITS.a`), meutes à partir de la 4,
  `PRIME_PACK_BONUS` coureurs de plus par meute et par niveau de Prime de risque.
- **Effets visés** : `hpRate` et `REGEN_DELAY`/`REGEN_RATE` (régénération, Sans armure, Vampire),
  `comboTime` (`COMBO_T`, Fièvre), `multiplier(combo, mods, bonus)` (le bonus porte déjà `S.repit`),
  `shotDamageMul`, `extraSpread`, `refillOf`, `rollMax`, `boxKind`/`S.boxT` (caisses larguées),
  `hurtPlayer` (`src/game/combat.js`), `killPoints`.
- **Cartes** : `S.mods`, `applyCard` (effets immédiats de Constitution, Double roulade…), puces
  `#mods` de `updateHud` (`src/render/hud.js`).
- **Saisie** : `src/input/keyboard.js`, `src/input/gamepad.js` (branche `world.state === 'pick'`),
  boutons dans `src/input/buttons.js`.

## Comportement

### Ouverture et fermeture

- Le Comptoir s'ouvre **après l'écran des cartes**, quand celui-ci se ferme (carte prise, cartes
  gagnées sous Pas de pause, arme choisie sous Spécialiste, dernière carte bannie).
- Il s'ouvre **aussi les vagues sans carte** (vagues impaires sous Pas de pause), au même moment que
  l'aurait fait l'écran des cartes (`PICK_DELAY` après la fin de la vague).
- Il **ne s'ouvre pas si la bourse est vide** (`S.money === 0`) : la partie reprend directement.
  L'Appât, gratuit, n'est donc jamais proposé avec une bourse vide.
- Jamais en démo.
- Nouvel état `world.state = 'shop'` : `update` ne tourne pas, comme sur l'écran des cartes (le temps
  de vie des pièces et le décompte de la pause sont suspendus). La perte de focus ne met pas en pause
  (comme `pick`).
- On quitte par « En route » : la partie reprend, la pause entre les vagues continue.

### L'étale

- `SHOP_SLOTS` (4) caisses, toutes différentes, tirées par `rng()` parmi les articles permis,
  **pondérées par rareté**, sans aucune garantie (ni Soin, ni contre-pacte).
- Une caisse ne se vend qu'une fois par visite ; achetée, elle reste à sa place marquée « Vendu ».
- Une caisse trop chère est grisée.
- **Réassort** : remplace les 4 caisses par un nouveau tirage (caisses vendues comprises).
  `RESTOCK_COST` 5, puis `RESTOCK_STEP` 3 de plus à chaque réassort de la même visite (5, 8, 11…) ;
  le prix revient à 5 à la visite suivante.
- La bourse est **partagée** avec la boutique de l'écran des cartes : ce qui a été dépensé en
  relances, cartes en plus, bannissements et rachats n'est plus disponible ici.
- La bourse s'affiche en haut à droite, comme sur l'écran des cartes.

### Rareté de l'étale

Poids repris de `RAR` pour que le joueur lise la même échelle que sur les cartes : commun 55, rare 28,
très rare 9. Avec la répartition ci-dessous (au plus 10 communs, 14 rares et 2 très rares), une caisse
très rare sort sur environ une étale sur 14.

| Rareté | Articles | Pourquoi |
| --- | --- | --- |
| Commun | Chargeur, Balles de pistolet, Rustine, Grand chargeur, Mèche longue, Prime de tête, Fouille, Pièces collantes, Éclaireur, Appât | effet faible ou étroit, prix bas : de quoi dépenser quelques pièces à chaque visite |
| Rare | Gilet, Roulade de réserve, Livraison, Balles lourdes, Lunette, Départ lancé, Contrat, Répulsif, Location, et les contre-pactes sauf Balles de pistolet | effet net sur la vague ; les contre-pactes ne doivent pas rendre les pactes indolores |
| Très rare | Ravitaillement complet, Location rare | les deux achats les plus forts |

### Durée des effets

- **Immédiats** (appliqués à l'achat) : Trousse complète, Chargeur, Ravitaillement complet, Balles de
  pistolet.
- **Tous les autres** : actifs dès l'achat et jusqu'à la fin de la vague qui suit, puis retirés dans
  le bloc de fin de vague. Un effet acheté pendant la pause vaut donc aussi pour le reste de la pause.
- Un même article ne s'empile pas : un article déjà actif n'est plus proposé jusqu'à la fin de la
  vague.
- Pendant la vague, chaque effet actif a sa puce dans `#mods`, avec le libellé de l'article et la
  mention « 1 vague », masquée sous Silence comme les autres puces.

### Articles

Le numéro de « vague suivante » désigne la vague qui commence après le Comptoir.

**Contre-pactes** (rares, sauf Balles de pistolet, commun) : proposés seulement si le joueur possède le
pacte indiqué.

| Article | Pacte | Prix | Effet |
| --- | --- | --- | --- |
| Trousse complète | Sans armure, Vampire, Terre brûlée | 15 | Vie remise au maximum, tout de suite. |
| Poche de sang | Vampire | 15 | Pendant la vague, plus de perte de `VAMPIRE_DRAIN` PV/s quand le combo retombe. |
| Attelle | Canon de verre, Marché du diable | 15 | Vie max +`VERRE_HP` (40) ou +`DIABLE_HP` (25) pendant la vague (les deux avec les deux pactes). Au retrait, la vie est ramenée sous la vie max. |
| Sang-froid | Fièvre | 12 | La fenêtre de combo ignore Fièvre pendant la vague (2,6 s au lieu de 1,3). |
| Leurre | Prime de risque | 15 | Les meutes de la vague n'ont pas les coureurs en plus de Prime de risque. |
| Balles de pistolet | Mitraille | 8 | +`MITRAILLE_PISTOL_AMMO` (120) balles de pistolet, tout de suite. |

**Soins**

| Article | Rareté | Prix | Effet |
| --- | --- | --- | --- |
| Gilet | rare | 20 | Le premier coup de la vague ne fait rien (ni dégât, ni combo cassé ; sous Tout ou rien, la cagnotte est sauve). |
| Roulade de réserve | rare | 15 | Une charge de roulade de plus pendant la vague. Jamais proposée sous Sans échappatoire. |
| Rustine | commun | 8 | Vie max +10 pendant la vague. |

**Munitions** : l'arme est nommée sur la caisse, tirée parmi les armes débloquées qui ont des
munitions (`refill > 0`). Jamais sous Spécialiste (l'arme gardée est infinie).

| Article | Rareté | Prix | Effet |
| --- | --- | --- | --- |
| Chargeur | commun | 8 | L'arme reçoit le plein d'une caisse (`refillOf`), tout de suite. |
| Ravitaillement complet | très rare | 25 | Toutes les armes débloquées reçoivent ce plein, tout de suite. |
| Livraison | rare | 10 | Une caisse de munitions tombe `LIVRAISON_DELAY` (2) s après le début de la vague. |

**Armurerie** : l'arme est nommée sur la caisse, tirée parmi les armes débloquées concernées ; sous
Spécialiste, seulement l'arme gardée.

| Article | Rareté | Prix | Effet |
| --- | --- | --- | --- |
| Balles lourdes | rare | 20 | +30 % de dégâts pour cette arme pendant la vague, multiplié avec les cartes (`shotDamageMul`). |
| Grand chargeur | commun | 10 | +25 % de munitions par caisse ramassée pour cette arme pendant la vague. Armes à munitions seulement. |
| Lunette | rare | 12 | Dispersion de cette arme divisée par 2 pendant la vague. Uzi et fusil à pompe seulement. |

**Combo et score**

| Article | Rareté | Prix | Effet |
| --- | --- | --- | --- |
| Mèche longue | commun | 15 | Fenêtre de combo +1 s pendant la vague. |
| Départ lancé | rare | 20 | Un cran de multiplicateur en plus pendant la vague (comme le bonus de Sans répit). |
| Prime de tête | commun | 10 | Le premier Blindé abattu de la vague rapporte 5 fois ses points. Proposé seulement si la vague suivante contient des Blindés (vague 6 et après, ou Appât acheté). |

**Butin**

| Article | Rareté | Prix | Effet |
| --- | --- | --- | --- |
| Fouille | commun | 15 | Chance qu'un zombie lâche une pièce : 50 % au lieu de 30 % pendant la vague. |
| Pièces collantes | commun | 15 | Les pièces tombées pendant la vague restent 10 s au sol au lieu de 6. |

**Horde et renseignement**

| Article | Rareté | Prix | Effet |
| --- | --- | --- | --- |
| Éclaireur | commun | 5 | La composition de la vague suivante s'affiche tout de suite sur le Comptoir, puis dans la bannière de début de vague : nombre de zombies, Gonflés, Cracheurs, Blindés, Diables, meutes. |
| Contrat | rare | 10 | Si la vague suivante se termine sans coup encaissé, +30 pièces en fin de vague ; sinon rien. |
| Appât | commun | 0 | La vague suivante compte 2 Blindés de plus. Proposé seulement à partir de la fin de la vague 5. |
| Répulsif | rare | 20 | La vague suivante compte 15 % d'ennemis en moins dans chaque type (arrondi à l'inférieur, au moins 1 zombie). |

**Location** : une carte nommée sur la caisse, active pendant la vague suivante, comme si le joueur
en avait un niveau de plus, puis retirée en fin de vague (avant l'écran des cartes suivant, qui ne la
voit donc pas).

| Article | Rareté | Prix | Effet |
| --- | --- | --- | --- |
| Location | rare | 15 | Une carte commune tirée au hasard. |
| Location rare | très rare | 30 | Une carte rare tirée au hasard. |

Cartes louables : rareté commune ou rare, niveau maximal pas atteint, pas exclue par les cartes
possédées, pas bannie, et **sans effet immédiat** dans `applyCard` (Constitution et Double roulade
exclues : leur effet ne se défait pas proprement).

### Saisie

| Action | Clavier | Manette | Souris / tactile |
| --- | --- | --- | --- |
| Acheter la caisse n | 1 à 4 | croix ou stick pour choisir, A | clic / tap sur la caisse |
| Réassort | R | X (□) | bouton « Réassort » |
| En route | Entrée | Y (△) ou Start | bouton « En route » |

Les touches s'affichent sur les boutons (`only-desk`) ; l'aide sous l'étale et l'aide manette les
mentionnent. Volet Contrôles de l'accueil : une ligne « Comptoir » par mode de saisie.

## Hors périmètre

- Constructions à vendre (barricades, barils, tourelles posés avant la vague).
- Tout effet durable : améliorations d'armes permanentes, vie max permanente, Coffre (intérêts).
- Garantie de tirage (Soin ou contre-pacte garanti).
- Achat ou déblocage des armes avec des pièces.
- Comptoir dans la démo de l'accueil.
- Pièces dans les meilleures parties ou l'écran de fin.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | Section « Comptoir » : `SHOP_ITEMS` (`id`, `rar`, `price`, famille, pactes requis), `SHOP_SLOTS`, `RESTOCK_COST`, `RESTOCK_STEP`, et les valeurs d'effet (`SHOP_HEAVY_MUL` 1.3, `SHOP_MAG_MUL` 1.25, `SHOP_SCOPE_MUL` .5, `SHOP_RUSTINE_HP` 10, `SHOP_FUSE_T` 1, `SHOP_HEAD_MUL` 5, `SHOP_DIG_CHANCE` .5, `SHOP_COIN_LIFE` 10, `SHOP_CONTRACT_COINS` 30, `SHOP_REPEL_MUL` .85, `SHOP_BAIT_ARMORED` 2, `LIVRAISON_DELAY` 2). |
| rules | `src/rules/counter.js` (nouveau) | `rollStall(ctx, rng)` → 4 articles permis, pondérés par rareté, avec leur arme ou leur carte ; `itemAllowed(id, ctx)` (pactes requis, Sans échappatoire, Spécialiste, armes débloquées, vague, effets déjà actifs) ; `restockCost(n)` ; `rentable(mods, banned, rar)` ; `waveForecast(n, mods, buffs)` (comptes par type, sans `rng`). |
| rules | `src/rules/modifiers.js`, `src/rules/waves.js`, `src/rules/scoring.js` | Paramètre `buffs` (effets actifs) dans les règles qu'ils modifient : `hpRate` (Poche de sang), `comboTime` (Mèche longue, Sang-froid), `shotDamageMul` (Balles lourdes), `extraSpread` ou dispersion (Lunette), `refillOf` (Grand chargeur), `rollMax` (Roulade de réserve), `waveQueue` (Répulsif, Appât, Leurre), `rollCoins` (Fouille). Sans `buffs`, résultats inchangés. |
| state | `src/state/world.js` | `S.buffs = {}` (effets actifs, avec arme ou carte louée), `S.rented` (carte louée) dans `resetWorld`. |
| game | `src/game/flow.js` | `openShop`, `buyItem(i)`, `restock`, `leaveShop` ; état de la visite (`stall`, `restocks`) ; appel de `openShop` aux quatre fermetures de l'écran des cartes et quand `S.pickT` s'écoule sans carte. |
| game | `src/game/combat.js`, `src/game/enemies.js`, `src/game/weapons.js` | Gilet dans `hurtPlayer`, Prime de tête dans `killEnemy`, Pièces collantes dans `dropCoins`, Livraison dans `startWave`, Éclaireur dans la bannière de `startWave`. |
| loop | `src/loop/update.js` | Fin de vague : Contrat versé, effets retirés (`S.buffs = {}`, carte louée rendue, vie max d'Attelle et Rustine retirée), `S.pickT` aussi quand le Comptoir doit s'ouvrir sans carte. |
| render | `src/render/hud.js` | Puces « 1 vague » dans `#mods`. |
| render | `index.html`, `src/style.css`, `src/game/flow.js` | Écran `#shopScreen` : titre, bourse, 4 caisses en vue 3/4 (dessus écrasé, contour sombre, couleur de famille), bouton Réassort avec son prix, « En route », aide. Vignettes des caisses dessinées en CSS ou en SVG. |
| audio | `src/audio/sfx.js` | Réutiliser `coin` à l'achat et `toss` au réassort. |
| input | `src/input/keyboard.js`, `src/input/gamepad.js`, `src/input/buttons.js` | Branche `world.state === 'shop'` : chiffres, R, Entrée ; croix, A, X, Y, Start ; clics. |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js`, `index.html` | Clés `shop.<id>` (`name`, `desc` citant les vrais nombres), titres, boutons, aides, mention « 1 vague » ; texte de l'accueil sur les cartes et la boutique ; lignes du volet Contrôles. |
| décisions | `docs/decisions.md` | Section « Comptoir » : écran à part, ouvert aussi sans carte, fermé si la bourse est vide, rien de durable, pas de garantie, bourse partagée. |

## Critères d'acceptation

- Quand le joueur prend sa carte et que sa bourse n'est pas vide, alors le Comptoir s'ouvre avec 4
  caisses différentes.
- Quand la bourse est vide, alors le Comptoir ne s'ouvre pas et la pause reprend.
- Sous Pas de pause, quand une vague impaire se termine avec des pièces en bourse, alors le Comptoir
  s'ouvre sans écran de cartes.
- Quand le joueur réassortit trois fois, alors il paie 5, 8 puis 11 ; à la visite suivante, le
  réassort coûte de nouveau 5.
- Quand le joueur n'a aucun pacte, alors aucun contre-pacte n'est proposé.
- Quand le joueur a Vampire, alors la Trousse complète et la Poche de sang peuvent sortir, sans
  garantie.
- Quand le joueur achète Balles lourdes pour l'Uzi, alors l'Uzi fait 30 % de dégâts de plus pendant
  la vague suivante, et plus rien à la vague d'après.
- Quand le joueur achète le Gilet, alors le premier coup de la vague ne lui fait rien, le deuxième si.
- Quand le joueur loue une carte, alors elle apparaît dans ses puces avec la mention « 1 vague » et
  disparaît en fin de vague ; elle n'est pas comptée au tirage des cartes suivant.
- Quand le joueur achète l'Appât, alors la vague suivante compte 2 Blindés de plus.
- Quand le joueur achète le Contrat et termine la vague sans être touché, alors il gagne 30 pièces.
- Un article déjà actif n'est pas proposé une seconde fois avant la fin de la vague.
- Sous Sans échappatoire, la Roulade de réserve n'est jamais proposée ; sous Spécialiste, aucun
  article de munitions.
- Dans la démo de l'accueil, le Comptoir ne s'ouvre jamais.
- Les trois modes de saisie donnent accès à l'achat, au réassort et au départ.

## Tests

`tests/counter.test.js` (nouveau) :
- « l'étale propose 4 caisses toutes différentes »
- « un article très rare sort bien moins souvent qu'un commun » (fréquences sur une graine fixe)
- « sans pacte, aucun contre-pacte n'est proposé »
- « sous Vampire, la Trousse complète peut sortir, sans être garantie » (sur 200 graines : au moins
  une fois, pas à chaque fois)
- « la Roulade de réserve n'est jamais proposée sous Sans échappatoire »
- « sous Spécialiste, aucun article de munitions n'est proposé »
- « un article encore actif n'est pas proposé une seconde fois »
- « l'Appât n'est pas proposé avant la fin de la vague 5 »
- « le réassort coûte 5, puis 3 de plus à chaque réassort de la même visite »
- « on ne loue ni Constitution ni une carte au niveau maximal »
- « l'Éclaireur annonce les mêmes comptes que la vague tirée » (comparer `waveForecast` et
  `waveQueue` sur plusieurs graines)

`tests/modifiers.test.js` :
- « Balles lourdes : l'arme visée fait 30 % de dégâts de plus, les autres non »
- « Poche de sang : plus de perte de vie sans combo sous Vampire »
- « Sang-froid : la fenêtre de combo ignore Fièvre »
- « Mèche longue : le combo tient une seconde de plus »
- « Roulade de réserve : une charge de plus »
- « sans effet du Comptoir, les règles donnent les mêmes résultats qu'avant »

`tests/waves.test.js` :
- « l'Appât ajoute 2 Blindés à la vague »
- « le Répulsif retire 15 % des ennemis de chaque type »
- « le Leurre rend aux meutes leur taille normale sous Prime de risque »

`tests/scoring.test.js` :
- « Fouille : un zombie lâche une pièce environ une fois sur deux »

`tests/i18n.test.js` : couvre les nouvelles clés sans rien ajouter.

Vérifications manuelles :
- Enchaînement cartes → Comptoir → pause : pas de double ouverture, pas de pause qui s'écoule
  pendant le Comptoir ; Spécialiste et dernière carte bannie compris.
- Écran à 1280 × 720, sur téléphone (caisses sur 2 colonnes sous 760 px) et à la manette.
- Économie en partie réelle : nombre de visites où le joueur peut acheter quelque chose, part de la
  bourse prise par chaque boutique.
- `npm run perf` : les effets lus à chaque image (`shotDamageMul`, `comboTime`, `hpRate`…) ne doivent
  rien allouer.

## Risques et questions ouvertes

- **Ordre des tirages `rng`** : l'étale et le réassort tirent avec `rng()`. Pour une même graine, la
  suite de la partie change dès qu'un joueur visite le Comptoir.
- **Éclaireur** : la composition doit se calculer sans `rng` pour ne pas décaler les tirages. Les
  comptes par type sont déterministes, mais la taille des meutes dépend d'un tirage : l'Éclaireur
  annonce le nombre de meutes, pas le nombre de coureurs.
- **Performances** : les règles lues à chaque image reçoivent `S.buffs` ; pas d'objet créé par image
  (lecture de propriétés seulement).
- **Location** : une carte louée modifie `S.mods` pendant une vague. Toute carte à effet immédiat ou
  à état propre (Second souffle, Sans répit…) doit être exclue ; la liste est à vérifier carte par
  carte pendant l'implémentation.
- **Attelle et Rustine** : la vie max qui redescend en fin de vague peut faire perdre de la vie
  (ramenée sous la nouvelle vie max) ; c'est le comportement voulu, à vérifier en jeu.
- **Équilibrage** : deux boutiques sur la même bourse. Les prix du Comptoir (5 à 30) sont calés
  sous ceux de l'écran des cartes (10 à 60) ; à surveiller en jeu.
- **Une étape de plus entre les vagues** : sous Pas de pause (pause de 1,5 s), le Comptoir revient à
  chaque vague ; à vérifier que le rythme ne casse pas.
- **Gilet sous Second souffle** : le Gilet passe avant ; Second souffle reste disponible.
