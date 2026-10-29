---
description: Prépare et publie une release GitHub (semver, notes en anglais), ce qui déclenche le déploiement sur itch.io
---

# /release

## 1. Vérifications

Arrête-toi et explique ce qui bloque si une seule vérification échoue :

1. Branche courante : `main`.
2. Arbre de travail propre : `git status --short` vide.
3. À jour avec le dépôt distant : `git fetch`, puis ni commit à tirer ni commit à pousser.
4. CI au vert sur `HEAD` : `gh run list --commit $(git rev-parse HEAD)` montre **Tests** et **Perf**
   en `success`. Si un workflow est encore en cours, attends-le (`gh run watch <id> --exit-status`).
   Le workflow Perf tient lieu du `npm run perf` exigé avant chaque publication sur itch.io.

## 2. Version

1. Dernier tag : `git describe --tags --abbrev=0` (aucun tag : première release, `v0.1.0`).
2. Commits depuis ce tag : `git log <tag>..HEAD --oneline` (tout l'historique s'il n'y a pas de tag).
   Aucun commit : dis-le et arrête-toi.
3. Propose le numéro en semver, préfixé par `v` :
   - **mineure** (`v0.2.0`) : nouveau contenu ou changement de gameplay (arme, carte, pacte, ennemi,
     écran, équilibrage) ;
   - **patch** (`v0.1.1`) : uniquement des corrections ou des changements invisibles pour le joueur ;
   - **majeure** : jamais de toi-même, seulement si l'utilisateur la demande.

## 3. Notes de version

Rédige-les **en anglais**, pour les joueurs qui les liront sur GitHub et itch.io :

- Lis les commits (et leur diff si le message ne suffit pas) pour décrire ce que le joueur voit,
  pas ce que le code fait.
- Sections, omises si vides : `### New`, `### Balance`, `### Fixes`.
- Les commits purement techniques (CI, tests, perf, refactor, documentation, outillage Claude)
  n'apparaissent pas, sauf effet visible (« smoother framerate »).
- Tout nombre cité (dégâts, PV, score de déblocage) doit correspondre à `src/config.js`.
- Titre de la release : le numéro de version seul (`v0.2.0`).

## 4. Validation

Affiche le numéro, le titre et les notes complètes.

**Attends l'accord explicite de l'utilisateur avant de publier** : la release déclenche le
déploiement sur itch.io et ne se retire pas proprement.

## 5. Publication

1. `gh release create <version> --target main --title <version> --notes-file <fichier>` (notes
   écrites dans un fichier temporaire du scratchpad).
2. Suis le workflow **Deploy to itch.io** lancé par la release (`gh run list --workflow
   deploy-itch.yml --limit 1`, puis `gh run watch <id> --exit-status`).
3. En cas d'échec, montre la fin du journal (`gh run view <id> --log-failed`) ; ne supprime ni la
   release ni le tag sans accord.

## 6. Rapport

```
## Release <version>

Release : <url de la release GitHub>
Déploiement itch.io : <succès | échec, avec la cause>
```
