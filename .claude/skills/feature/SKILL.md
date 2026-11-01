---
name: feature
description: Use when the user asks to implement a new feature or a gameplay change in Tête Carrée; runs the full cycle from understanding the request to a green test suite.
user_invocable: true
---

# Implémenter une fonctionnalité

## 1. Comprendre la demande

1. Reformule la demande en une ou deux phrases, dans le vocabulaire du jeu (vague, horde, combo,
   carte, pacte, roulade, crevasse…).
2. Invoque le skill `architecture`, puis le ou les skills de domaine concernés (`horde`, `armes`,
   `cartes`, `rendu`).
3. Pose les questions que le code ne tranche pas, et seulement celles-là :
   - **valeurs numériques** : dégâts, rayon, durée, vague d'apparition, rareté et niveau max d'une carte ;
   - **interactions** avec l'existant : cartes qui doivent s'y appliquer (Frénésie, Gâchette nerveuse,
     Perforantes…), blindé et bouclier, crevasses, constructions, roulade ;
   - **cas limites** : joueur mort, écran de pause ou de choix de carte, plusieurs instances, aucune
     arme débloquée ;
   - **plateformes** : clavier, manette, tactile — la commande doit-elle exister sur les trois ?
4. Si la demande touche un comportement listé dans « Deliberately left alone » de
   `docs/decisions.md`, signale-le et demande explicitement avant de le modifier.
5. Si le changement se voit à l'écran (rendu, écran, HUD, caméra, décor, thème) ou offre plusieurs
   options, fais une page HTML d'exemples (artifact, hors du dépôt) dans le style du jeu et avec les
   vraies données (plans d'arène, `config.js`) : une maquette par option, pour que l'utilisateur
   tranche avant le code. Sans choix à faire, montre le résultat de la même façon dans le résumé (section 5).

## 2. Implémenter

Respecte `CLAUDE.md`, en particulier :

- valeurs d'équilibrage dans `src/config.js` ;
- décision pure (formule, tirage, condition) dans `src/rules/`, sans DOM, horloge ni `Math.random` ;
- effets (sons, particules, bannières) dans `src/game/`, comportement par image dans
  `src/loop/update.js`, dessin dans `src/render/` ;
- aléa de gameplay par `rng`/`jitter`, aléa visuel par `Math.random`/`rnd` ;
- nouvel état de partie initialisé dans `resetWorld` ; état réaffecté entre modules sur `world` ;
- nouveau module d'entrée importé dans `src/main.js`.

Reste dans le périmètre demandé : pas de refonte ni de correction voisine non demandée.

## 3. Tester

1. Écris ou adapte le test macro dans `tests/<module>.test.js` (skill `testing`) : une phrase que le
   joueur reconnaîtrait.
2. Lance `npm test`. Corrige jusqu'à ce que tout soit vert.
3. Pour ce qui n'est pas testable (rendu, entrées, sensations), lance `npm run dev` et vérifie à la
   main ; dis explicitement ce qui a été vérifié ainsi et ce qui ne l'a pas été.
4. Si une approche échoue deux fois, arrête et reviens au plan avec l'utilisateur.

## 4. Mettre à jour la documentation

- **Documentation vivante du jeu** : textes de l'écran titre (contrôles, fiches du Bestiaire),
  indications de l'écran de choix de carte dans `index.html` ; `desc`/`plus`/`minus` des cartes et
  bannières de vagues si la règle annoncée change.
- `CLAUDE.md` et les skills concernés si une convention, un fichier ou un concept a bougé.
- `docs/decisions.md` pour tout choix d'architecture ou question laissée ouverte.
- `README.md` si une commande change.

## 5. Résumer

- Fichiers modifiés, avec une ligne par fichier sur ce qui a changé.
- Tests ajoutés ou modifiés, et résultat de `npm test`.
- Ce qui a été vérifié en jouant, et ce qui ne l'a pas été.
- Questions restées ouvertes.
- Lien de la page d'exemples, si le changement est visible du joueur.
