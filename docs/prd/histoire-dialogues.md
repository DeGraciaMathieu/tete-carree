# Étape 6 : les dialogues du mode Histoire

Partie du [mode Histoire](mode-histoire.md). Suppose l'[étape 5](histoire-deroulement.md) livrée.

## Objectif

Faire parler Tête Carrée et le Dev au début et à la fin de chaque chapitre, dans une boîte en bas de
l'écran, jeu en pause (option A de la maquette des dialogues). Le ton est méta et ne se prend pas au
sérieux : Tête Carrée sait qu'il est dans un jeu et le développeur lui répond. Le joueur gagne le fil
qui relie les quatre décors. Cette étape livre la mécanique et des textes provisoires ; le scénario
définitif s'écrira ensuite.

## Socle technique

- `src/game/story.js` (étape 5) : `beginChapter` et `endChapter` avec leurs points d'accroche début
  et fin de chapitre ; état `'talk'` (monde figé, dessin seul).
- `src/render/hud.js`, `drawFace(c, mood, flash, blink)` : visage de Tête Carrée en 13 × 13 pixels,
  humeurs `ok`, `hurt`, `crit`, `dead`, choisies d'après la vie dans le HUD (`#face`, affiché en
  `image-rendering: pixelated`).
- `src/style.css` : jetons `--panel`, `--line`, `--text`, `--muted`, `--hazard`, polices `--display`
  (Black Ops One) et `--mono` (Share Tech Mono), classes `only-desk`, `only-pad` et `only-touch`, `.btn.ghost`.
- `src/input/keyboard.js`, `gamepad.js` (fronts montants `hit(i)`), `touch.js`, `buttons.js`.
- `src/i18n/` : `tr`, `fr.js`/`en.js` aux mêmes clés, `tests/i18n.test.js`.
- `docs/decisions.md` : son démarré au premier geste, pause sur `blur`, aucun texte en dur.

## Comportement

### La scène

- Une scène est une suite de répliques. Une réplique a un personnage (`tc` ou `dev`) et un texte.
- Chaque chapitre a deux scènes : **introduction**, jouée par `beginChapter` avant la bannière
  « Chapitre N », et **conclusion**, jouée par `endChapter` avant le fondu (ou avant le tableau de fin
  au chapitre 4).
- `world.state` vaut `'talk'` pendant toute la scène : le monde est figé et légèrement assombri
  derrière la boîte, le HUD reste en place et les boutons tactiles (stick, ROULER, ARME) sont masqués.
- À la fin de la scène, la boîte disparaît et la suite prévue à l'étape 5 reprend.
- Une scène sans réplique se termine aussitôt.

### La boîte

D'après la maquette (option A) :

- Elle est posée en bas de l'écran, au-dessus de l'encoche du téléphone (`safe-area-inset-bottom`),
  sur toute la largeur moins une marge de 16 px, au plus 760 px de large, centrée.
- Fond `--panel`, bordure `--line`, coins de 3 px.
- Portrait à gauche, en pixels agrandis (13 × 13 affichés à environ 52 px) :
  - Tête Carrée : `drawFace` avec l'humeur que le HUD montrerait à ce moment (un joueur à 20 PV a
    l'air blessé dans la scène) ;
  - le Dev : une flèche de souris en pixels, nouvelle fonction `drawDevFace` sur la même grille 13 × 13.
- Nom au-dessus du texte, en `--display`, couleur `--hazard` pour Tête Carrée et `--dev` (nouveau
  jeton, violet `#8f7bff`) pour le Dev.
- Une réplique peut être longue : la boîte grandit avec le texte, jusqu'à 40 % de la hauteur de
  l'écran, puis le texte défile à l'intérieur.
- Texte en `--mono`. Il s'écrit lettre par lettre, environ 32 ms par caractère (constante de
  `render/dialog.js` : c'est un réglage d'affichage, pas d'équilibrage). Avec
  `prefers-reduced-motion`, la réplique entière apparaît d'un coup.
- Indication en bas à droite, qui clignote : « Entrée ▸ » au clavier (`only-desk`), « A ▸ » à la
  manette (`only-pad`), « Toucher ▸ » sur écran tactile (`only-touch`).
- Bouton **Passer** (`.btn.ghost`, petit), toujours visible : sur téléphone, c'est le seul moyen de
  passer toute la scène.

### Commandes pendant une scène

| Action | Clavier | Souris / toucher | Manette |
| --- | --- | --- | --- |
| Finir la réplique en cours, sinon passer à la suivante | Entrée, Espace | clic ou toucher n'importe où, sauf sur Passer | A, Start |
| Passer toute la scène | Échap | bouton Passer | B |

- Une réplique qui s'écrit encore se complète au lieu de passer à la suivante.
- Les entrées sont ignorées pendant les 250 premières millisecondes d'une scène : un tir maintenu ou
  un Entrée appuyé juste avant ne la fait pas défiler par erreur. Les répétitions automatiques d'une
  touche tenue (`e.repeat`) sont ignorées aussi.
- P et Échap ne mettent pas en pause pendant une scène (Échap passe la scène). La perte de focus ne
  change rien : le monde est déjà figé.
- Aucune entrée de jeu (tir, déplacement, roulade, changement d'arme) n'a d'effet pendant une scène.

### Accessibilité

- Boîte `role="dialog"` avec le nom du personnage en titre. Le texte qui s'écrit est `aria-hidden` ;
  une copie cachée de la réplique complète, en `aria-live="polite"`, est lue d'un coup par les
  lecteurs d'écran.
- Le bouton Passer est un vrai `<button>`, focalisable, avec contour de focus `--hazard`.

### Données (`src/i18n/fr.js` et `en.js`)

```js
speakers: { tc: 'Tête Carrée', dev: 'Le Dev' },        // en : { tc: 'Tête Carrée', dev: 'The Dev' }
scenes: {
  chinatown: { intro: [['dev', '…'], ['tc', '…']], outro: [ … ] },
  siberie:   { intro: [ … ], outro: [ … ] },
  egouts:    { intro: [ … ], outro: [ … ] },
  militaire: { intro: [ … ], outro: [ … ] },
},
```

Une scène se retrouve par l'arène du chapitre (`tr.scenes[chapterArena(i)]`). Le nom de Tête Carrée
ne se traduit pas : c'est le nom du jeu.

### Textes provisoires

Ton « Le Dev ». Ils sont à réécrire ensemble ; la mécanique ne dépend pas d'eux.

**Chinatown, introduction**
- Dev : Chapitre 1. Chinatown. Tiens cinq vagues et on passe à la suite. / *Chapter 1. Chinatown. Hold five waves and we move on.*
- TC : Pourquoi tout est rouge ? / *Why is everything red?*
- Dev : J'ai trouvé une palette. Elle était gratuite. / *I found a palette. It was free.*
- TC : Et les zombies ? / *And the zombies?*
- Dev : Les mêmes. Recolorés. Personne ne verra. / *Same ones. Recoloured. Nobody will notice.*

**Chinatown, conclusion**
- TC : C'est fini ? / *Is it over?*
- Dev : Pour cette rue. On t'envoie en Sibérie. / *For this street. You're off to Siberia.*
- TC : Pourquoi la Sibérie ? / *Why Siberia?*
- Dev : J'avais un pack de neige. / *I had a snow pack.*

**Camp de Sibérie, introduction**
- Dev : Chapitre 2. Un camp de prisonniers, en Sibérie. / *Chapter 2. A prison camp, in Siberia.*
- TC : Je n'ai rien fait. / *I didn't do anything.*
- Dev : Tu as abattu une centaine de zombies à Chinatown. / *You shot about a hundred zombies in Chinatown.*
- TC : C'était le jeu ! / *That was the game!*
- Dev : Le camp n'a pas lu les règles. / *The camp didn't read the rules.*

**Camp de Sibérie, conclusion**
- TC : Comment je sors d'ici ? / *How do I get out of here?*
- Dev : Par les égouts. Il y a toujours des égouts. / *Through the sewers. There are always sewers.*
- TC : En Sibérie ? / *In Siberia?*
- Dev : J'ai dit toujours. / *I said always.*

**Égouts, introduction**
- Dev : Chapitre 3. Les égouts. / *Chapter 3. The sewers.*
- TC : Ça sent mauvais. / *It stinks.*
- Dev : C'est du canvas. Ça ne sent rien. / *It's a canvas. It doesn't smell.*
- TC : Alors pourquoi je le sens ? / *Then why can I smell it?*
- Dev : Immersion. / *Immersion.*

**Égouts, conclusion**
- TC : Il y a de la lumière, là-haut. / *There's light up there.*
- Dev : Une base militaire. C'est là que tout a commencé. / *An army base. That's where it all started.*
- TC : Tu viens de l'inventer. / *You just made that up.*
- Dev : À l'instant, oui. / *Just now, yes.*

**Camp militaire, introduction**
- Dev : Chapitre 4. Le camp militaire. Le dernier. / *Chapter 4. The army camp. The last one.*
- TC : Et après ? / *And then?*
- Dev : Après, il y a l'écran de fin. Je l'ai fait en dernier. / *Then there's the end screen. I made it last.*
- TC : Ça va se voir. / *It'll show.*

**Camp militaire, conclusion**
- TC : C'est vraiment fini ? / *Is it really over?*
- Dev : Vingt vagues. Je n'ai rien écrit après. / *Twenty waves. I didn't write anything after that.*
- TC : Même pas un boss ? / *Not even a boss?*
- Dev : C'est un sujet complexe à part. / *That's a whole separate, complicated topic.*

## Hors périmètre

- Scénario définitif.
- Bulles en jeu, fenêtre système du Dev (options B et C de la maquette), répliques pendant les vagues
  ou entre deux vagues.
- Son de frappe, voix, musique de scène.
- Choix de réponse, embranchements.
- Portraits animés autres que le clignement des yeux de `drawFace`.
- Revoir une scène depuis l'accueil.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | — | aucun |
| game | `src/game/story.js` | `playScene(lines, done)`, `advanceScene()`, `skipScene()` ; accroches début et fin de chapitre branchées |
| render | `src/render/dialog.js` (nouveau) | affichage de la boîte, écriture lettre par lettre, portraits, `drawDevFace` |
| render | `src/render/hud.js` | `drawFace` réutilisé tel quel ; fonction d'humeur partagée si elle est aujourd'hui interne |
| input | `src/input/keyboard.js` | `'talk'` : Entrée/Espace avancent, Échap passe, `e.repeat` ignoré |
| input | `src/input/gamepad.js` | `'talk'` : A et Start avancent, B passe |
| input | `src/input/buttons.js` | clic ou toucher sur l'écran : avancer ; bouton Passer |
| DOM | `index.html`, `src/style.css` | `#talkBox` (portrait, nom, texte, copie `aria-live`, indication, Passer), voile, jeton `--dev`, boutons tactiles masqués pendant `'talk'` |
| i18n | `src/i18n/fr.js`, `src/i18n/en.js` | `speakers`, `scenes`, `skip` (« Passer » / « Skip »), indications |
| documentation | `docs/decisions.md`, skill `architecture` | section « Mode Histoire : dialogues » ; carte des modules (`render/dialog.js`) |

Si `render/dialog.js` ou un module d'entrée pose des écouteurs à l'import, il doit être importé dans
`src/main.js`.

## Critères d'acceptation

- Quand on lance l'Histoire, alors la boîte s'ouvre sur la première réplique du Dev, avec la flèche
  pour portrait et son nom en violet. Le texte s'écrit et le monde est figé derrière.
- Quand on appuie sur Entrée pendant que le texte s'écrit, alors la réplique se complète. Un second
  appui passe à la suivante.
- Quand Tête Carrée parle, alors son portrait est le visage du HUD, avec l'humeur de sa vie actuelle.
- Quand on appuie sur Échap, B ou Passer, alors la scène se ferme et le jeu reprend là où il devait reprendre.
- Quand la dernière réplique est passée, alors la bannière « Chapitre N » apparaît (introduction), ou
  le fondu vers le chapitre suivant (conclusion), ou le tableau de fin (conclusion du chapitre 4).
- Quand le tir est maintenu à la fin de la vague 5, alors la conclusion ne défile pas toute seule.
- Sur téléphone, la boîte ne passe pas sous l'encoche, les boutons tactiles sont masqués, toucher
  l'écran avance et Passer ferme.
- À la manette seule, toute l'histoire se suit et se passe.
- En anglais, toutes les scènes sont en anglais.
- `npm test` passe.

## Tests

`tests/i18n.test.js` :

- `chaque chapitre a une introduction et une conclusion dans les deux langues`
- `les deux langues donnent les mêmes répliques aux mêmes personnages, dans le même ordre`
  (même nombre de répliques par scène, même suite de `tc` et `dev`)
- `aucune réplique n'est vide ni ne contient undefined`
- `scenes` et `speakers` ajoutés à la liste des dictionnaires imbriqués comparés clé à clé

Vérifications manuelles :

- chaque scène au clavier, à la souris, au toucher et à la manette ;
- appui rapide répété ;
- tir maintenu en fin de vague ;
- Passer à chaque étape ;
- `prefers-reduced-motion` ;
- lecteur d'écran (VoiceOver), qui lit chaque réplique une fois ;
- texte anglais le plus long, sur un téléphone étroit (environ 360 px).

## Risques et questions ouvertes

- **Scénario** : les textes provisoires posent le ton. Les écrire pour de bon est un chantier à part,
  avec l'auteur.
- **Répliques longues** (décision : aucune limite de longueur) : la boîte grandit avec le texte,
  jusqu'à 40 % de la hauteur de l'écran ; au-delà, le texte défile dans la boîte. Pendant l'écriture,
  le défilement suit la dernière ligne. À vérifier sur téléphone étroit avec une réplique de plusieurs phrases.
- **Humeur du portrait** : une humeur choisie par réplique (dans les données) remplacerait l'humeur
  tirée de la vie. Ce serait plus expressif, mais il faudrait de nouveaux dessins de visage. Par
  défaut, la vie décide.
- Équilibrage et `rng` : aucun effet.
