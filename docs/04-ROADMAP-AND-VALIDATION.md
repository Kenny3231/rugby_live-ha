# 04 — Feuille de route, jalons et validation

Règle : **un jalon = un arrêt**. À la fin de chaque jalon, résumer ce qui a été fait, ce qui a été testé, ce qui reste incertain, puis **attendre la validation de David**. Aucun jalon n'est « terminé » tant que ses critères ne sont pas vérifiés.

## Démarrage (avant M0)

1. Demander à David le chemin de `TRACKING_DIR` (dossier central local, hors dépôt, jamais en ligne) et le noter dans `CLAUDE.md`.
2. Relire `docs/` et signaler toute incohérence, erreur ou risque (design, cohérence, améliorations, sécurité). Utiliser les agents adaptés, **rapporter tokens et coût en € par agent**.
3. Lister les skills/plugins utiles qui manquent et **les proposer** ; n'installer qu'après accord.
4. Proposer un plan (`/plan`) et le faire confirmer.

## Phase 1 — Intégration HACS

| Jalon | Contenu | Critères d'acceptation |
|---|---|---|
| **M0** Socle | Dépôt, arborescence `custom_components/rugby_live/`, `manifest.json`, `hacs.json`, `.gitignore`, CI (ruff, pytest, hassfest, HACS), `tools/record_match.py`, `tools/replay_server.py` | Lint et tests verts en local ; le serveur de rejeu rejoue une capture enregistrée par `record_match.py` |
| **M1** Client ESPN | `api.py` + `models.py`, tests de contrat sur les captures réelles du 10/10, vérification en lecture seule des points « NON vérifié » restants (Challenge Cup en direct, plage de dates) | Tous les endpoints parsés ; `API-VERIFIED.md` dans `TRACKING_DIR` ; écarts signalés à David |
| **M2** Moteur timeline | `timeline.py` pur : **rapprochement** (corrections ESPN suppression/recréation, révocations, ordre par horloge) + retard. Cas testés : retard 0 et > 0, réduction/augmentation du retard, redémarrage en plein match, annulation, recréation tardive (~50 min), doublons, ordre des `id` | Couverture ≥ 95 % du module ; un événement logique = une émission ; **rejouer la capture du 10/10 ne produit aucun doublon** |
| **M3** Coordinator | `coordinator.py`, polling dynamique, limiteur ≤ 1 requête/s, backoff, score seul sans play-by-play | Test contre le serveur de rejeu : intervalles corrects, pas de requête hors fenêtre |
| **M4** Entités + flow | Config/options flow, entités **stables** de `02-SPEC`, traductions fr/en, services, diagnostics | `hassfest` OK ; tests flow/entités ; **démo avec le serveur de rejeu dans un HA de test** |
| **M5** **Validation 1** | David installe via HACS (dépôt personnalisé) dans un HA de test, avec le rejeu | David valide : entités, retard, calibration, événements bus |
| **M6** **Validation 2 — match réel** | Matchs réels avec `tools/record_match.py` actif : Champions Cup et Challenge Cup à partir du 16/10, Top 14 J7 | Retard myCanal mesuré et documenté ; aucune entité en erreur ; événements corrects (essais, cartons, corrections) ; parseur corrigé si besoin |
| **M7** Release 0.1.0 | README, exemples d'automatisations, changelog, tag `v0.1.0`, release GitHub, validation HACS | Installation propre depuis HACS sur le HA de production |

## Phase 1 bis — Sources officielles

L'ordre entre la phase 1 bis et la phase 2 est à choisir par David après M7.

| Jalon | Contenu | Critères |
|---|---|---|
| **M8** LNR (Top 14) → 0.2.0 | Client websocket Pusher + état initial par page, minute réelle, compositions, confirmation et fusion avec ESPN | Rejeu de la capture websocket du 10/10 ; un essai vu par les deux sources = un seul événement |
| **M9** EPCR (coupes) → 0.3.0 | Client InCrowd : transformations ratées, stats, compositions, minute réelle | Validé sur un match réel de coupe |

## Phase 2 — Cartes Lovelace

| Jalon | Contenu | Critères |
|---|---|---|
| **M10** Socle front | Vite + TS + Lit, chargement automatique de la ressource, carte « hello », harnais de test | Chargée dans HA sans erreur console |
| **M11** Scoreboard + multiplex | Cartes 1 et 1 bis + éditeurs visuels | Revue visuelle de David sur ses thèmes |
| **M12** Timeline | Carte 2 (carte de retard seulement si les cartes natives ne suffisent pas) | Retard réglable depuis le dashboard, calibration fonctionnelle |
| **M13** Fixtures | Carte 3 | |
| **M14** Release | Captures, doc, tag | Installation propre |

## Protocole de test sur match réel (M6)

1. Avant le match : serveur de rejeu éteint, intégration pointée sur ESPN, `delay = 0`, `poll_live = 5`.
2. Lancer `tools/record_match.py` (capture brute toutes les 5 s dans `TRACKING_DIR/captures/<date>_<match>/`).
3. David note l'**heure TV** (à la seconde) de chaque essai/carton. On compare avec `observed_at` : le décalage médian devient le **retard par défaut recommandé** et le sens du décalage (API en avance ou en retard sur la TV) est documenté.
4. Vérifier : minute estimée, score à chaque événement, compteurs, cartons jaunes (durée), fin de match, arrêt du polling.
5. Rejouer la capture enregistrée avec le serveur de rejeu pour reproduire tout bug rencontré.
6. Ne **pas** généraliser à partir d'un seul match : minimum 3 matchs, dont un avec carton si possible.

## Définition de « terminé » (toute phase)

- Tests automatisés verts, `ruff`/`mypy` propres, CI verte.
- Comportement vérifié sur données réelles, pas seulement sur fixtures.
- Zones d'ombre listées honnêtement dans le résumé de jalon.
- Aucune entrée dans le dépôt provenant du dossier de suivi.
