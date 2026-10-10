# Premier prompt à coller dans Claude Code

Place ce dossier à la racine d'un nouveau dépôt (par ex. `rugby-live-ha/`), ouvre Claude Code dedans, puis colle :

---

Lis `CLAUDE.md` puis `docs/01` à `docs/04` et les `fixtures/`. Ce projet est une intégration Home Assistant HACS « rugby_live » (phase 1), suivie de cartes Lovelace (phase 2), pour le Top 14, la Champions Cup et la Challenge Cup, avec un système de retard réglable.

Avant d'écrire du code :

1. Demande-moi le chemin du dossier de suivi local `TRACKING_DIR` (hors dépôt, jamais poussé en ligne).
2. Fais une revue critique de la spec : design, cohérence, améliorations possibles, sécurité. Dis-moi clairement ce qui est faux, risqué ou superflu. Utilise les agents les mieux adaptés et donne-moi tokens et coût en € pour chacun.
3. Liste les skills/plugins manquants utiles et propose-les ; n'installe rien sans mon accord.
4. Propose un plan détaillé des jalons M0 et M1, et attends ma validation.

Ensuite on avance jalon par jalon, en t'arrêtant à chaque fin de jalon pour que je valide.

---

Données utiles à avoir sous la main pour la suite :

- IDs ligues : Top 14 `270559`, Champions Cup `271937`, Challenge Cup `272073`.
- Prochains matchs réels pour le jalon M6 : Top 14 ce week-end, Champions Cup à partir du 16/10 (Gloucester – Bordeaux-Bègles), Challenge Cup à vérifier.
- Mon HA : mode UI, thème Mushroom Square Shadow, vue Sections, Bubble Card, HACS.
