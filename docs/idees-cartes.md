# Idées de cartes

Réserve d'idées pour enrichir le tirage entre les vagues. Les cartes implémentées sont marquées ✅ ;
les valeurs des autres sont des propositions à discuter.

Coût d'implémentation : **S** une constante ou une ligne, **M** une branche dans le code existant,
**L** une nouvelle mécanique.

## Communes

| Carte | Max | Effet | Coût |
| --- | --- | --- | --- |
| ✅ **Artificier** (`artificier`) | 2 | Rayon des grenades et roquettes × 1,25 par niveau | S : `blastRadius` (`rules/modifiers.js`) |
| **Semelles épaisses** | 2 | Dégâts de l'acide −40 % par niveau ; au niveau 2, l'acide ne ralentit plus | S : `ACID_DAMAGE`, `ACID_SPEED_MUL` dans `update` |
| **Béton armé** | 3 | Barricades +40 % de PV par niveau | S : `WALL_HP` dans `placeBlock` |
| **Infirmier** | 2 | Les caisses de soin rendent +15 PV par niveau | S : `MEDKIT_HP` |

## Rares

| Carte | Max | Effet | Coût |
| --- | --- | --- | --- |
| ✅ **Coup d'épaule** (`epaule`) | 2 | La roulade bouscule les ennemis traversés ; poussés dans une crevasse, ils tombent (« Chute ! ») | M : `shove` (`game/player.js`), `shoveKnock` |
| ✅ **Fragmentation** (`frag`) | 2 | Une grenade qui explose projette 4 éclats par niveau | M : `fragments` (`game/weapons.js`), `fragShards` |
| **Gravité** | 1 | Un ennemi tombé dans une crevasse rapporte × 3 points | S : multiplicateur dans `killEnemy` quand `fell` est vrai |
| **Sang-froid** | 1 | Un coup encaissé ne fait plus perdre de temps de combo | S : `COMBO_HIT_DRAIN` dans `hurtPlayer` |

## Légendaires

| Carte | Max | Effet | Coût |
| --- | --- | --- | --- |
| **Dos au mur** | 1 | Sous `LOW_HP` (30 PV), cadence de tir doublée | S : condition de plus dans `fireMul` |
| **Tête chercheuse** | 1 | Les roquettes s'orientent vers l'ennemi le plus proche | M : section « roquettes » de `update` |
| **Réaction en chaîne** | 1 | Un ennemi tué par une explosion explose à son tour, en plus petit | L : surveiller cascades, particules, performances |

## Pactes

| Carte | Avantage | Contrepartie | Coût |
| --- | --- | --- | --- |
| ✅ **Fièvre** (`fievre`) | Un cran de multiplicateur tous les 3 kills au lieu de 5 | Fenêtre de combo réduite de 50 % | S : `multiplier`, `comboTime` |
| ✅ **Quitte ou double** (`quitte`) | Points × 2 sur chaque kill | Un coup encaissé remet le combo à zéro | S : `killPoints`, `comboAfterHit` |
| ✅ **Poudre noire** (`poudre`) | Rayon des barils, grenades et roquettes +50 % | Leurs explosions te blessent deux fois plus | S : `explosion(…, own)` |
| ✅ **Bout portant** (`portant`) | Tirs × 2 à moins de 3 cases | × 0,5 au-delà | S : `shotDamageMul` |
| ✅ **Ravitaillement** (`ravito`) | Caisses de ravitaillement deux fois plus fréquentes | Chaque caisse larguée fait entrer un zombie | S : `boxPeriod`, section « caisses » de `update` |
| ✅ **Sans répit** (`repit`) | +1 cran de multiplicateur par vague terminée, jusqu'à +5 | Pause entre les vagues réduite de 50 % | M : `S.repit`, `waveBreak` |
| ✅ **Fidélité** (`fidele`) | Dégâts du pistolet × 3 | Les caisses ne rechargent plus les autres armes | S : `shotDamageMul`, ramassage |
| ✅ **Vampire** (`vampire`) | Chaque kill rend 1 PV, Soif de sang dès × 1 | Plus de régénération ; sans combo, −1 PV/s | S : `soifHeal`, `hpRate` |
| ✅ **Terre brûlée** (`brulee`) | Roulade rechargée deux fois plus vite | Chaque roulade coûte 5 PV | S : `rollCooldown`, `rollHpCost` |
| ✅ **Enraciné** (`racine`) | Tirs × 2 à l'arrêt | Déplacement −30 % | S : `shotDamageMul`, `speedMul` |
| ✅ **Marché du diable** (`diable`) | Une Légendaire garantie au prochain choix | −25 PV max, définitivement | M : `rollCards(…, legend)` |
| ✅ **Canon de verre** (`verre`) | Tirs × 1,5 | −40 PV max | S : `shotDamageMul`, `choosePick` |
| **Napalm** | Tes explosions laissent des flammes au sol | Elles te blessent deux fois plus | M : réutilise les flammes de Traînée de feu |
| **Pistolero** | Le pistolet tire 3 balles en éventail | Les ennemis ne lâchent plus de caisses de munitions | M |
## Effet sur le tirage

Chaque carte pèse selon sa rareté (`RAR`) : en ajouter dilue les autres. Avec 4 communes de plus,
une commune donnée passe d'environ 23 % à environ 18 % de chances d'être proposée.

## Combos à surveiller

- **Coup d'épaule + Gravité** : la horde poussée dans le vide, un style de jeu à part entière.
- **Fièvre + Frénésie** : la Frénésie s'active dès 12 kills enchaînés au lieu de 20.
- **Fragmentation + Artificier** : la grenade devient l'arme de nettoyage de la horde.
