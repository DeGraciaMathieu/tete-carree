# Mode Histoire : vue d'ensemble

## Objectif

Un second mode de jeu, à côté du mode Arène : quatre chapitres enchaînés dans quatre décors, cinq
vagues par chapitre, une petite scène de dialogue au début et à la fin de chaque chapitre. L'histoire
est méta et ne se prend pas au sérieux (piste « Le Dev » : Tête Carrée parle au développeur du jeu).
Le joueur gagne une partie qui a une fin, un décor qui change, et une raison de recommencer : le
record du mode Histoire.

## Décisions prises

| Sujet | Décision |
| --- | --- |
| Place du mode | À côté du mode Arène, qui ne change pas. |
| Chapitres | 1 Chinatown, 2 Camp de Sibérie, 3 Les égouts, 4 Camp militaire. |
| Vagues | 5 par chapitre, numérotation continue (vagues 1 à 20) : la difficulté monte comme en Arène. |
| Entre deux chapitres | On garde tout : cartes, armes débloquées, munitions, vie, score, combo. |
| Mort | On recommence au chapitre 1. Aucune reprise en cours de partie. |
| Fin | Après la vague 20 et la scène de fin du chapitre 4 : tableau de fin complet (score, vagues, kills, meilleur combo, durée, cartes, classement), boutons Rejouer et Accueil. |
| Record | Classement propre au mode Histoire : chapitre atteint d'abord, score ensuite ; une histoire terminée passe devant tout. |
| Nouvelles arènes | Jouables aussi en mode Arène, avec leur thème. |
| Dialogues | Boîte en bas de l'écran (option A des maquettes), jeu en pause, uniquement au début et à la fin d'un chapitre. |
| Boss | Mis de côté : sujet à part. |
| Barbelés de Sibérie | Cases de vide : ils arrêtent les corps et laissent passer les balles. |
| Pénombre et pacte Aveugle | Les deux s'ajoutent. |
| Option « Ambiance » | Oui, dans les Options et la pause : coupe la pénombre et les particules d'ambiance. |
| Constructions au changement de chapitre | Perdues, sans remboursement. |
| HUD | Le panneau de vague affiche le chapitre en mode Histoire (« Ch. 2 · Vague »). |
| Dernière partie de l'accueil | La plus récente, tous modes confondus. |
| Longueur des répliques | Libre : la boîte grandit puis le texte défile. |

Maquettes de référence (artifacts privés) : ambiances
<https://claude.ai/artifact/8FiADqjMKdvvjD1FTFmgv3>, plans et dialogues
<https://claude.ai/artifact/J2M3vcZbfCzeGGjbGuxftP>.

## Découpage

Chaque étape a son PRD, se livre seule, laisse la suite de tests verte et le jeu jouable.

| Étape | PRD | Livre | Dépend de |
| --- | --- | --- | --- |
| 1 | [`arenes-chapitres.md`](arenes-chapitres.md) | les quatre plans, jouables en mode Arène (encore sans thème) | — |
| 2 | [`themes-palettes.md`](themes-palettes.md) | un thème par arène : couleurs du sol, des murs, des caisses, du vide, du mini-plan | 1 |
| 3 | [`themes-decor-ambiance.md`](themes-decor-ambiance.md) | décor dessiné (boutiques, mirador, conteneurs…) et ambiance (pluie, neige, pénombre, projecteur) | 2 |
| 4 | [`histoire-regles.md`](histoire-regles.md) | règles pures et état du mode Histoire, testés sans DOM | 1 |
| 5 | [`histoire-deroulement.md`](histoire-deroulement.md) | le mode jouable de bout en bout : menu, changements de chapitre, mort, victoire, record | 4 |
| 6 | [`histoire-dialogues.md`](histoire-dialogues.md) | la boîte de dialogue et des textes provisoires | 5 |

Les étapes 2-3 (visuel) et 4-5-6 (mode) sont indépendantes : on peut mener l'une avant l'autre. Ordre
conseillé : 1, 2, 4, 5, 6, 3. Le mode est jouable tôt, et l'étape 3, la plus risquée pour les
performances, arrive sur une base stable.

## Hors périmètre de l'ensemble

- Boss de fin de chapitre.
- Déblocage progressif des armes et des cartes d'un chapitre à l'autre (sujet suivant, annoncé).
- Écriture définitive du scénario : l'étape 6 pose des textes provisoires.
- Reprise d'une partie Histoire interrompue (fermeture de l'onglet) ou après une mort.
- Démo de l'accueil en mode Histoire : la démo reste une partie Arène.
- Sons nouveaux (voix, bruit de frappe des dialogues).
