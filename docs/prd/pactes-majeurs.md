# Pactes majeurs

## Objectif

Ajouter douze pactes d'une nouvelle rareté, « Pacte majeur ». Chacun retire au joueur une capacité
centrale (la roulade, la vie, la vue, le HUD, la pause…) en échange d'un bonus fort. Ils sont rares,
arrivent en milieu de partie et on n'en prend qu'un par partie : c'est le choix qui donne son identité
à une partie, pas un réglage de plus.

Les valeurs chiffrées ci-dessous sont des valeurs de départ, à régler en jeu.

---

## Socle commun

### Socle technique

- Cartes : tableau `MODS` et raretés `RAR` (`src/config.js`) ; tirage `rollCards(mods, rng, legend)`
  (`src/rules/cards.js`) ; écran de choix `openPick`, `choosePick`, `applyCard`, `cardHtml`, `demoPick`
  (`src/game/flow.js`).
- Les pactes existants (`rar: 'p'`) s'affichent avec `plus(n)` / `minus(n)` au lieu de `desc(n)` ;
  le test `m.rar === 'p'` apparaît dans `cardHtml` (`flow.js:44`) et dans le sous-titre de bannière
  de `choosePick` (`flow.js:95`).
- Pastilles `.mchip r-<rar>` dans `#mods` et dans le récapitulatif de la dernière partie
  (`render/hud.js:52`, `:121`) ; style des cartes `.mcard r-<rar>` dans `src/style.css`.
- Pictogrammes : `src/render/cardIcons.js`, clé = `id` ; `tests/cards.test.js` échoue s'il en manque un.
- Points d'un kill : `killPoints(type, mods, multiplier)` (`src/rules/scoring.js`) ; bonus de fin de
  vague `WAVE_BONUS × vague` dans `src/loop/update.js` (section « vagues »).

### Comportement

**Rareté.** Nouvelle entrée `RAR.m = { name: 'Pacte majeur', w: MAJOR_WEIGHT }` avec
`MAJOR_WEIGHT = 3` (une Légendaire pèse 9, un pacte 12).

**Conditions de tirage**, appliquées par `rollCards` :

1. un pacte majeur n'est proposé qu'à partir de la fin de la vague `MAJOR_FROM_WAVE = 5` ;
2. dès qu'un pacte majeur est pris, plus aucun pacte majeur n'est proposé (un seul par partie) ;
3. **exclusions** : chaque pacte majeur porte un champ `excl: ['<id>', …]`. Une carte n'est pas
   proposée si une carte possédée l'exclut, ou si elle exclut une carte possédée. La règle est
   symétrique : prendre Sans échappatoire retire Double roulade du tirage, et posséder Double roulade
   empêche de se voir proposer Sans échappatoire ;
4. la démo (`demoPick`) ne tire jamais de pacte majeur.

`rollCards` reçoit la vague en cours : `rollCards(mods, rng, legend, wave)`. Marché du diable garde
son comportement : sa Légendaire garantie est tirée parmi les Légendaires non exclues, et le pacte
n'est pas proposé s'il n'en reste aucune.

**Affichage.** Un pacte majeur se lit comme un pacte : `plus(n)` / `minus(n)`, sous-titre de bannière
« Pacte scellé ». Le test `m.rar === 'p'` devient une fonction `isPact(m)` (`p` ou `m`). La carte
et la pastille ont leur propre couleur (`.r-m`), distincte de celle du pacte. Les entrées sont
ajoutées **à la fin** de `MODS`, `max: 1`.

**Points.** Les multiplicateurs de points des pactes majeurs (Une seule vie, Sablier, Élite, Silence)
se multiplient entre eux et avec ceux qui existent déjà (Prime de risque, Quitte ou double, Chair à
canon), dans `killPoints`. En pratique un seul pacte majeur est actif à la fois.

**Caisses de soin.** Deux pactes (Une seule vie, Plus de soins) suppriment les soins par caisse.
Une règle `healBoxes(mods)` (`rules/modifiers.js`) dit si une caisse peut être une caisse de soin.
Sinon, la caisse larguée (`BOX_HP_CHANCE`) ou lâchée par un ennemi (`DROP_HP_CHANCE`) devient une
caisse de munitions. Le tirage `rng` est conservé, seul son résultat est forcé : l'ordre des tirages
ne change pas.

### Impact par couche (socle)

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `RAR.m`, `MAJOR_WEIGHT`, `MAJOR_FROM_WAVE` ; douze entrées en fin de `MODS` avec `excl` ; constantes d'effet dans « Effets des cartes » |
| rules | `src/rules/cards.js` | paramètre `wave`, filtre vague, unicité, exclusions symétriques, exclusion de la démo (paramètre ou appel distinct) |
| rules | `src/rules/modifiers.js` | `isPact`, `healBoxes` |
| game | `src/game/flow.js` | `isPact` dans `cardHtml` et `choosePick` ; `S.wave` passé à `rollCards` ; démo sans pacte majeur |
| loop | `src/loop/update.js` | `healBoxes` aux deux tirages de nature de caisse |
| render | `src/render/cardIcons.js`, `src/style.css` | douze pictogrammes ; couleur `.r-m` sur `.mcard` et `.mchip` |

### Critères d'acceptation (socle)

- Quand on tire les cartes à la fin de la vague 4, alors aucun pacte majeur n'est proposé.
- Quand un pacte majeur est possédé, alors aucun autre n'est plus jamais proposé.
- Quand une carte possédée figure dans l'`excl` d'un pacte majeur, alors ce pacte n'est pas proposé,
  et inversement.
- Quand la démo choisit une carte, alors ce n'est jamais un pacte majeur.
- Quand un pacte majeur est affiché, alors on lit son avantage et sa contrepartie, la mention
  « Pacte majeur » et sa couleur propre.

### Tests (socle) — `tests/cards.test.js`

- « aucun pacte majeur n'est proposé avant la fin de la vague 5 »
- « un seul pacte majeur par partie »
- « une carte exclue par un pacte majeur possédé n'est plus proposée »
- « un pacte majeur n'est pas proposé si une carte possédée l'exclut »
- « la Légendaire promise par Marché du diable n'est jamais une carte exclue »
- « chaque pacte majeur a un pictogramme » (couvert par le test existant)

---

## 1. Sans échappatoire — `entrave`

**Objectif.** Le joueur renonce à l'esquive et devient un tank mobile.

- **Avantage** : déplacement +`ENTRAVE_SPEED_MUL` (×1,3) ; tes tirs font ×`ENTRAVE_DAMAGE_MUL` (1,5)
  dégâts.
- **Contrepartie** : plus aucune roulade.
- **Exclusions** : `double`, `rollboom`, `rollammo`, `firetrail`, `epaule`, `brulee`.

**Comportement.**
- `tryRoll` refuse la roulade (`rollMax` rend 0) ; la touche, le bouton A de la manette et le bouton
  tactile ROULER émettent le son `click` et ne font rien.
- Jauge de roulade (`render/sprites.js`) masquée ; bouton tactile `#rollBtn` grisé.
- Les **crevasses** ne se franchissent qu'en roulade (`rollClears`) : sous ce pacte elles deviennent
  infranchissables. C'est voulu et la carte doit le dire : contrepartie « Plus aucune roulade : les
  crevasses deviennent infranchissables ».
- Les dégâts passent par `shotDamageMul`, comme les autres pactes de dégâts : ni les éclats de
  Fragmentation ni la tourelle ne sont concernés.

**Impact.** `config` (constantes, entrée) ; `rules/modifiers.js` (`rollMax`, `speedMul`,
`shotDamageMul`) ; `game/player.js` (`tryRoll`, son) ; `render/sprites.js` (jauge) ; `input/` ou
`style.css` (bouton tactile grisé).

**Critères.** Quand le joueur appuie sur Roulade sous Sans échappatoire, alors il ne roule pas et ne
perd rien. Quand il est immobile devant une crevasse, alors il ne peut pas la traverser.

**Tests.** `modifiers.test.js` : « Sans échappatoire : aucune charge de roulade », « Sans échappatoire :
déplacement ×1,3 et tirs ×1,5, cumulés avec Enraciné ». Vérification manuelle : bouton tactile,
manette, crevasses.

---

## 2. Une seule vie — `unevie`

**Objectif.** Partie à la mort subite pour un score énorme.

- **Avantage** : points ×`UNEVIE_POINTS_MUL` (3) sur chaque kill et sur le bonus de fin de vague.
- **Contrepartie** : le premier coup encaissé te tue.
- **Exclusions** : `constitution`, `souffle`, `vampire`, `soif`, `verre`, `diable`, `brulee`,
  `sansarmure`.

**Comportement.**
- À la prise (`applyCard`) : `player.maxHp = player.hp = 1`. La barre de santé affiche « 1 coup ».
- Toute source de dégâts tue : coup ennemi, boule de feu, crachat et flaque d'acide (dégâts « soft »
  compris), explosion de Gonflé, explosions de tes propres barils, grenades et roquettes. Pas de cas
  particulier dans `hurtPlayer` : 1 PV suffit.
- L'invulnérabilité de la roulade protège toujours : c'est la seule défense.
- Plus de caisses de soin (`healBoxes` faux).

**Impact.** `config` ; `rules/scoring.js` (`killPoints`, et une règle `waveBonus(wave, mods)` pour le
bonus de fin de vague) ; `rules/modifiers.js` (`healBoxes`) ; `game/flow.js` (`applyCard`) ;
`loop/update.js` (bonus de vague) ; `render/hud.js` (libellé de santé).

**Critères.** Quand le joueur sous Une seule vie est touché par un zombie, alors la partie se termine.
Quand il roule à travers un zombie, alors il survit.

**Tests.** `damage.test.js` : « Une seule vie : une flaque d'acide suffit à tuer » (si la règle de dégât
est testable telle quelle). `scoring.test.js` : « Une seule vie : kill et bonus de vague ×3 ».

---

## 3. Mitraille — `mitraille`

**Objectif.** Une puissance de feu folle, mais chaque munition compte, y compris celles du pistolet.

- **Avantage** : cadence de tir ×2 (`MITRAILLE_FIRE_MUL = .5` sur le délai), pour tes tirs.
- **Contrepartie** : chaque tir coûte `MITRAILLE_AMMO_COST = 2` munitions, et le pistolet n'est plus
  infini.
- **Exclusions** : `fidele`.

**Comportement.**
- À la prise : le pistolet reçoit `MITRAILLE_PISTOL_AMMO = 120` munitions (son `refill` devient
  `MITRAILLE_PISTOL_REFILL = 60` pour les caisses).
- Les caisses de munitions peuvent désormais recharger le pistolet (il entre dans le tirage des armes
  à recharger).
- Un tir avec une seule munition restante part quand même et vide l'arme.
- Constructions, grenades et roquettes ne sont pas concernées : coût 1, cadence inchangée.
- Toutes les armes vides : le joueur ne peut plus tirer. Le retour automatique au pistolet
  (`EMPTY_SWAP_CD`) se fait vers l'arme à feu qui a encore des munitions, sinon le clic à vide
  continue.
- Cumul avec Sans armure (cadence ×2) autorisé : cadence ×4.
- Roulade tactique fonctionne et recharge aussi le pistolet.

**Impact.** `config` ; `rules/modifiers.js` (`fireMul`, `ammoCost(mods, weapon)`) ;
`game/weapons.js` (`fireWeapon` : coût, munitions du pistolet, arme de repli) ; `game/flow.js`
(`applyCard`) ; `loop/update.js` (ramassage) ; `render/hud.js` (le pistolet affiche un nombre au lieu
de ∞).

**Critères.** Quand le joueur tire au pistolet sous Mitraille, alors son compteur baisse de 2.
Quand toutes ses armes sont vides, alors il ne peut plus tirer jusqu'à la prochaine caisse.

**Tests.** `modifiers.test.js` : « Mitraille : un tir coûte 2 munitions, les constructions 1 »,
« Mitraille : cadence doublée, ×4 avec Sans armure ».

---

## 4. Aveugle — `aveugle`

**Objectif.** Combattre dans le noir : on entend la horde avant de la voir.

- **Avantage** : tes tirs font ×`AVEUGLE_DAMAGE_MUL` (2) dégâts.
- **Contrepartie** : tu ne vois rien au-delà de `AVEUGLE_SIGHT = 5` cases.

**Comportement.**
- Un voile sombre recouvre la scène au-delà d'un halo centré sur le joueur. Le halo est une ellipse
  écrasée par la perspective (facteur `.55` sur `y`), avec un dégradé doux sur la dernière case.
- Sous le voile : ennemis, projectiles, caisses et taches restent dessinés, mais masqués (opacité du
  voile `AVEUGLE_DARK = .94`). Les sons ne changent pas.
- Le voile est dessiné après la scène, avant le HUD DOM ; les bannières et le HUD restent lisibles.
- Les ennemis à distance (Cracheur à 270 px, Diable à 340 px, plus que les 160 px du halo) tirent depuis
  l'obscurité : c'est la contrepartie.
- **Performance** : le dégradé est créé une seule fois (au changement de taille du canvas ou de zoom),
  pas à chaque image.

**Impact.** `config` (constantes de portée et de dégâts ; l'opacité du voile est un réglage de rendu
et reste dans `render/`) ; `rules/modifiers.js` (`shotDamageMul`) ; `render/scene.js` ou nouveau module
`render/fog.js` ; `render/canvas.js` si le voile passe par `outlined()`.

**Critères.** Quand un zombie est à 8 cases, alors il est invisible. Quand il entre à 5 cases, alors il
apparaît progressivement.

**Tests.** `modifiers.test.js` : « Aveugle : tirs ×2 ». Vérifications manuelles : lisibilité sur mobile,
zoom min et max, `npm run perf`.

---

## 5. Main lourde — `lourde`

**Objectif.** Chaque tir est un coup de massue, mais l'arme est incontrôlable.

- **Avantage** : tes tirs font ×`LOURDE_DAMAGE_MUL` (1,8) dégâts et repoussent ×`LOURDE_KNOCK_MUL` (2).
- **Contrepartie** : chaque tir te repousse de `LOURDE_SELF_PUSH = 8` px et ajoute
  ±`LOURDE_SPREAD = .14` rad de dispersion, railgun compris.

**Comportement.**
- La poussée s'ajoute à celle du pompe (4 px) et passe par `moveCircle` : elle respecte les murs, les
  constructions et les crevasses (on ne tombe pas).
- La dispersion supplémentaire passe par `jitter()` : un tirage `rng` de plus par tir.
- Enraciné reste actif tant que le joueur ne touche pas aux commandes de déplacement : la poussée ne
  compte pas comme un déplacement.
- Le recul de caméra et d'arme (`recoil`) est multiplié par 1,5 : c'est cosmétique, la valeur reste
  dans `game/weapons.js`.

**Impact.** `config` ; `rules/modifiers.js` (`shotDamageMul`, `shotSpread(mods, base)`,
`shotKnockMul`) ; `game/weapons.js` (`fireWeapon`, `shoot`).

**Critères.** Quand le joueur tire à l'Uzi en continu sous Main lourde, alors il recule. Quand il tire
au railgun, alors le rayon n'est plus parfaitement droit.

**Tests.** `modifiers.test.js` : « Main lourde : dégâts ×1,8, recul ×2, dispersion ajoutée même au
railgun ». Vérification manuelle des sensations, à la manette surtout.

---

## 6. Spécialiste — `specialiste`

**Objectif.** Faire toute la fin de partie avec une seule arme, choisie par le joueur et devenue démesurée.

- **Avantage** : l'arme que tu choisis a des munitions infinies et fait ×`SPECIALISTE_DAMAGE_MUL` (2)
  dégâts.
- **Contrepartie** : tu ne peux plus changer d'arme de toute la partie.
- **Exclusions** : `fidele`, `rollammo`.

**Comportement.**
- **Proposition** : le pacte n'est proposé que si au moins `SPECIALISTE_MIN_WEAPONS = 2` armes sont
  débloquées. `rollCards` reçoit le nombre d'armes débloquées (la règle reste pure).
- **Choix de l'arme** : quand le joueur prend Spécialiste, l'écran de choix ne se ferme pas. Les cartes
  partent et sont remplacées par une rangée d'armes : toutes les armes débloquées, pistolet et
  constructions compris, chacune avec son nom et son pictogramme de la barre `#weapons`. Titre « Choisis
  ton arme », sous-titre « Pacte scellé : tu ne pourras plus en changer ».
  - Clavier : clic, ou touches 1 à 9 (rang de l'arme dans la rangée).
  - Manette : flèches ou stick pour passer d'une arme à l'autre, A pour valider.
  - Tactile : toucher une arme.
  - Pas d'annulation : le pacte est pris dès le clic sur la carte. La partie reste en état `pick`
    tant que l'arme n'est pas choisie (pas de minuteur).
  - Démo : sans objet, elle ne tire jamais de pacte majeur.
- **À la validation** : `S.special = i`, `player.weapon = i`, `ammo[i] = Infinity`, écran fermé,
  bannière « Spécialiste » avec le sous-titre « Pacte scellé · <nom de l'arme> ».
- `selectWeapon` et `cycleWeapon` refusent tout autre index : molette, touches 1 à 9, clic sur une case,
  manette et tactile sont donc couverts.
- Les armes débloquées ensuite au score le sont toujours (bannière comprise) mais restent inutilisables ;
  la barre `#weapons` les montre barrées.
- Caisses de munitions : elles donnent `AMMO_NO_WEAPON_BONUS` points, comme sous Fidélité.
- Ce qui compte comme dégâts ×2 :
  - armes à feu : `shotDamageMul` ;
  - grenade, roquette, baril : dégâts de leurs explosions ;
  - barricade : PV des barricades posées ×2.
- Choisir le pistolet ne donne que les dégâts ×2 (il est déjà infini) : choix permis, mais faible.

**Impact.** `config` (`SPECIALISTE_*`) ; `state/world.js` (`S.special = -1` dans `resetWorld`) ;
`rules/cards.js` (nombre d'armes débloquées) ; `rules/modifiers.js` (`shotDamageMul`,
`canSwitch(special, i)`) ; `game/flow.js` (`choosePick` enchaîne sur `openWeaponPick`, nouvelle action
`chooseWeapon(i)`, focus manette) ; `game/weapons.js` (`selectWeapon`, `cycleWeapon`, `placeBlock`) ;
`game/combat.js` (`explosion`) ; `loop/update.js` (ramassage) ; `input/keyboard.js` (touches 1 à 9
pendant le choix d'arme) ; `input/gamepad.js` (validation vers `chooseWeapon`) ; `index.html` (titre de
l'écran) ; `render/hud.js` (armes barrées) ; `src/style.css` (rangée d'armes, y compris sous 640 px).

**Critères.**
- Quand le joueur prend Spécialiste, alors il voit ses armes débloquées et le jeu reste en pause
  jusqu'à son choix.
- Quand il choisit le fusil d'assaut, alors il le tient aussitôt, son compteur affiche ∞, et il ne peut
  plus sélectionner d'autre arme.
- Quand seul le pistolet est débloqué, alors Spécialiste n'est pas proposé.

**Tests.** `cards.test.js` : « Spécialiste n'est pas proposé avec une seule arme débloquée ».
`modifiers.test.js` : « Spécialiste : seule l'arme choisie est sélectionnable », « Spécialiste : dégâts
×2 sur l'arme choisie seulement ». `unlock.test.js` : « Spécialiste : une arme débloquée après le pacte
reste inutilisable ». Vérifications manuelles : choix au clavier, à la manette et au tactile, en
portrait et en paysage.

---

## 7. Sablier — `sablier`

**Objectif.** La vie s'écoule : seul le massacre l'arrête.

- **Avantage** : points ×`SABLIER_POINTS_MUL` (2) sur chaque kill.
- **Contrepartie** : pendant une vague, tu perds `SABLIER_DRAIN = 4` PV par seconde ; chaque kill
  suspend la perte pendant `SABLIER_HOLD = 1.5` s. Ça peut tuer.
- **Exclusions** : `vampire`, `sansarmure`.

**Comportement.**
- La perte remplace la régénération pendant les vagues ; entre les vagues, régénération normale.
- Contrairement à Vampire, le Sablier peut prendre le dernier PV : la contrepartie l'annonce
  (« jusqu'à la mort »).
- La suspension ne se cumule pas : un kill remet le délai à 1,5 s, il ne l'allonge pas.
- Début de vague : la perte ne commence que 1,5 s après la première apparition d'ennemi.
- La barre de santé pulse quand la perte est active.

**Impact.** `config` ; `state/world.js` (`S.sablierT`) ; `rules/modifiers.js` (`hpRate` reçoit l'état de
la vague et le délai Sablier) ; `game/combat.js` (`killEnemy` remet le délai) ; `loop/update.js`
(application de `hpRate` sans plancher à 1 PV sous Sablier) ; `render/hud.js` (pulsation).

**Critères.** Quand le joueur ne tue rien pendant 25 s d'une vague avec 100 PV, alors il meurt. Quand
il tue toutes les secondes, alors il ne perd rien.

**Tests.** `modifiers.test.js` : « Sablier : −4 PV/s en vague sans kill récent », « Sablier : aucune perte
dans les 1,5 s qui suivent un kill », « Sablier : régénération normale entre les vagues ».

---

## 8. Plus de soins — `sanssoin`

**Objectif.** Chaque vague est un sprint à la vie comptée, mais on repart neuf à la suivante.

- **Avantage** : chaque vague terminée rend toute ta vie.
- **Contrepartie** : plus de régénération et plus de caisses de soin.
- **Exclusions** : `vampire`, `soif`, `sansarmure`.

**Comportement.**
- `hpRate` rend 0 en permanence ; `healBoxes` faux.
- Le soin complet a lieu au moment de la bannière « Vague terminée », avec un `pop` « Vie restaurée ».
- Constitution reste proposée : elle augmente la vie max et la soigne à la prise.

**Impact.** `config` ; `rules/modifiers.js` (`hpRate`, `healBoxes`) ; `loop/update.js` (fin de vague).

**Critères.** Quand une vague se termine avec 12 PV sur 100, alors le joueur repart à 100.

**Tests.** `modifiers.test.js` : « Plus de soins : aucune régénération, même longtemps après un coup »,
« Plus de soins : aucune caisse de soin ».

---

## 9. Élite — `elite`

**Objectif.** Moins d'ennemis, mais chacun est un vrai combat.

- **Avantage** : points ×`ELITE_POINTS_MUL` (3) sur chaque kill.
- **Contrepartie** : vagues réduites de moitié (`ELITE_COUNT_MUL = .5`, arrondi au supérieur, par type)
  mais ennemis ×`ELITE_HP_MUL` (2,5) PV et ×`ELITE_SPEED_MUL` (1,2) vitesse.

**Comportement.**
- `waveQueue` réduit chaque type, meutes de coureurs comprises (taille de meute ×0,5, au moins 2).
- PV et vitesse multipliés à l'apparition (`spawnEnemy`), bouclier du Blindé compris.
- Gonflés : rayon et dégâts d'explosion inchangés.
- Moins de kills : le multiplicateur monte moins vite. Le bonus ×3 doit compenser.

**Impact.** `config` ; `rules/waves.js` (`waveQueue`) ; règle de statistiques d'ennemi (là où
`ENEMY_STATS` est lu) ; `game/` (`spawnEnemy`) ; `rules/scoring.js` (`killPoints`).

**Critères.** Quand la vague 6 commence sous Élite, alors elle compte la moitié des ennemis d'une
vague 6 normale (arrondi au supérieur par type).

**Tests.** `waves.test.js` : « Élite : chaque type compte deux fois moins d'ennemis, arrondi au
supérieur », « Élite : une meute compte au moins 2 coureurs ». `scoring.test.js` : « Élite : kill ×3 ».

---

## 10. Pas de pause — `sanspause`

**Objectif.** La horde ne s'arrête plus, mais l'arsenal grossit plus vite.

- **Avantage** : toutes les deux vagues, tu gardes **les trois** cartes proposées.
- **Contrepartie** : plus de pause entre les vagues (`SANSPAUSE_BREAK = 1.5` s, le temps de la
  bannière), et plus de choix de carte après les vagues impaires.
- **Exclusions** : `repit`.

**Comportement.**
- Fin de vague impaire : pas d'écran de choix, la vague suivante démarre après 1,5 s.
- Fin de vague paire : l'écran affiche trois cartes tirées **hors pactes** (ni `p` ni `m`), titre
  « Tu gagnes ces trois cartes ». Toucher une carte, appuyer sur 1, 2, 3 ou sur A valide les trois
  d'un coup, une fois toutes les cartes retournées.
- Marché du diable ne peut donc plus être tiré après ce pacte.
- Le bonus de fin de vague est conservé.

**Impact.** `config` ; `rules/cards.js` (option « hors pactes ») ; `rules/modifiers.js` (`waveBreak`,
`pickAfter(wave, mods)`) ; `game/flow.js` (`openPick` en mode « tout prendre », `choosePick`) ;
`loop/update.js` (fin de vague) ; `index.html` (titre et aide de l'écran de choix).

**Critères.** Quand la vague 7 se termine sous Pas de pause, alors la vague 8 démarre 1,5 s plus tard
sans écran de choix. Quand la vague 8 se termine, alors le joueur reçoit trois cartes non-pacte.

**Tests.** `cards.test.js` : « tirage hors pactes : ni pacte ni pacte majeur ». `modifiers.test.js` :
« Pas de pause : choix de carte après les vagues paires seulement ».

---

## 11. Tout ou rien — `toutourien`

**Objectif.** Chaque vague est un pari : sans faute, on encaisse gros ; un coup, et elle ne rapporte rien.

- **Avantage** : un cran de multiplicateur tous les `TOUTOURIEN_KILLS_PER_MULTIPLIER = 2` kills (au lieu
  de 5).
- **Contrepartie** : les points des kills d'une vague vont dans une cagnotte ; un coup encaissé
  pendant la vague la vide.
- **Exclusions** : `fievre`, `quitte`.

**Comportement.**
- `S.pot` reçoit les points de kill pendant la vague ; ils sont versés par `addScore` à la fin de la
  vague, avec le bonus de vague (qui, lui, n'est jamais perdu).
- Est un « coup » tout dégât qui passe `playerProtected`, acide compris. Second souffle relève le
  joueur, mais la cagnotte est perdue.
- Conséquence : les **déblocages d'armes** n'arrivent qu'en fin de vague. La carte le dit :
  « Les points d'une vague ne comptent qu'à sa fin ».
- Le HUD montre la cagnotte sous le score (« en jeu : 4 200 ») ; elle se vide avec un effet rouge.

**Impact.** `config` ; `state/world.js` (`S.pot`) ; `rules/modifiers.js` (`multiplier`) ;
`rules/scoring.js` (`potAfterHit`) ; `game/combat.js` (`killEnemy`, `hurtPlayer`) ; `game/score.js` ;
`loop/update.js` (versement en fin de vague) ; `render/hud.js` ; `index.html` (élément de cagnotte).

**Critères.** Quand le joueur tue 20 ennemis puis se fait toucher, alors son score n'augmente que du
bonus de fin de vague. Quand il finit la vague intact, alors toute la cagnotte est versée.

**Tests.** `modifiers.test.js` : « Tout ou rien : un cran tous les 2 kills ». `scoring.test.js` :
« Tout ou rien : un coup vide la cagnotte ». `unlock.test.js` : « Tout ou rien : une arme se débloque à
la fin de la vague, pas au kill ».

---

## 12. Silence — `silence`

**Objectif.** Jouer à l'instinct, sans aucun chiffre à l'écran.

- **Avantage** : points ×`SILENCE_POINTS_MUL` (2) sur chaque kill.
- **Contrepartie** : plus de HUD : santé, score, combo, multiplicateur, armes et munitions, cartes
  actives.

**Comportement.**
- `#hud` reçoit une classe `silence` qui masque ses blocs (CSS) ; `updateHud` ne calcule plus les
  textes masqués.
- Restent visibles : bannières (vague, déblocage), écrans de choix, de pause et de fin, nombres
  flottants au-dessus des ennemis, boutons tactiles (indispensables). Les signaux du jeu restent :
  clignotement du joueur, son de vie basse, son du clic à vide.
- Touches 1 à 9 et molette : inchangées. Le clic sur une case d'arme devient impossible (la barre est
  masquée).
- L'écran de pause affiche toujours les cartes actives et le score.

**Impact.** `config` ; `rules/scoring.js` (`killPoints`) ; `render/hud.js` ; `src/style.css`.

**Critères.** Quand le joueur prend Silence, alors la barre de santé, le score, le combo et la barre
d'armes disparaissent jusqu'à la fin de la partie ; ils reviennent sur l'écran de pause.

**Tests.** `scoring.test.js` : « Silence : kill ×2 ». Vérification manuelle : desktop, mobile couché,
manette.

---

## Hors périmètre

- Bestiaire ou écran d'aide détaillant les pactes majeurs.
- Rééquilibrage des pactes existants et de leur poids `RAR.p.w`.
- Succès, statistiques ou tableau des scores séparés par pacte majeur.
- Tout pacte majeur de niveau supérieur à 1.

## Documentation vivante

- Les textes `plus` / `minus` construisent leurs nombres à partir des constantes (`pct`, `num`).
- `index.html` : aide de l'écran de choix pour Pas de pause ; libellé de santé « 1 coup » ; élément de
  cagnotte de Tout ou rien.
- `.claude/skills/cartes/SKILL.md` : tableau « où l'effet s'applique » et rareté `m`.
- `docs/decisions.md` : rareté majeure, unicité, exclusions symétriques.

## Risques et questions ouvertes

- **Tirage `rng`** : le pool change (douze cartes en plus, filtres), donc une graine donnée propose
  d'autres cartes. Main lourde ajoute un tirage par tir. `tests/cards.test.js` est à revoir.
- **Poids** : avec `MAJOR_WEIGHT = 3`, les douze pactes majeurs pèsent 36 sur 989 (953 aujourd'hui).
  Après la vague 5, au moins un pacte majeur apparaît donc dans environ 10 % des choix, soit à peu près
  une fois toutes les dix vagues. La question du poids des pactes ordinaires (12 chacun, 180 au total)
  reste celle déjà notée dans `decisions.md`.
- **Performance** : le voile d'Aveugle est un remplissage plein écran par image : à mesurer avec
  `npm run perf` et sur mobile.
- **Sans échappatoire et crevasses** : selon le plan de l'arène, une zone peut devenir inaccessible
  ou un joueur peut se retrouver coincé. Faut-il retirer les crevasses de l'arène sous ce pacte ?
- **Plus de soins** : le soin complet à chaque vague suffit-il comme « fort bonus » ? Si c'est trop
  faible en jeu, on peut ajouter des points ×1,5.
- **Élite** : l'arrondi au supérieur par type gonfle les petites vagues (1 Blindé reste 1 Blindé).
- **Une seule vie** : faut-il un effet d'aura ou de couleur sur le joueur pour rappeler l'état ?
- **Silence** : les nombres flottants de points restent visibles ; à masquer aussi ?
