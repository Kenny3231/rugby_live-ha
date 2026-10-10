# rugby_live — Intégration Home Assistant (HACS) + cartes Lovelace

Intégration custom Home Assistant, dans l'esprit de **F1 Sensor** : suivi en direct des matchs de rugby français et européens (score, essais, transformations, pénalités, drops, cartons, remplacements, temps de jeu), avec un **système de retard réglable** pour recaler les données sur la diffusion TV/streaming.

Propriétaire : David (GitHub `@Kenny3231`, dépôt `Kenny3231/rugby_live-ha`). Langue de travail : **français** (échanges, README, UI fr + en). Code, identifiants et commentaires : **anglais**.

## Périmètre (décidé avec David)

| Phase | Livrable |
|---|---|
| **1** | Intégration HACS `rugby_live` (config flow, entités, événements, retard) |
| **2** | Cartes Lovelace (scoreboard, timeline, fixtures, contrôle du retard) |

Compétitions obligatoires dès la v0.1 : **Top 14** (`270559`), **European Rugby Champions Cup** (`271937`), **European Rugby Challenge Cup** (`272073`). Architecture extensible à d'autres ligues ESPN (URC `270557`, Premiership `267979`, Six Nations `180659`…) via un identifiant de ligue personnalisé, sans les promettre en v0.1.

Hors périmètre tant que David ne l'a pas demandé : add-on, MQTT, notifications, pronostics/cotes, stats joueurs, classements.

## Règles de travail (préférences de David)

- Réponses **directes, corrigeantes, techniquement honnêtes**. Si une demande ou une info est fausse, le dire. Pas de flatterie.
- **Pas de scope creep** : ne rien ajouter qui ne soit pas dans `docs/` sans l'avoir proposé et fait valider.
- **Validation itérative** : on avance par jalons (`docs/04-ROADMAP-AND-VALIDATION.md`). À chaque jalon, s'arrêter, résumer, laisser David valider avant de continuer. Jamais de « big bang ».
- **Au démarrage ou à la reprise du projet** : utiliser les agents les mieux adaptés, relire design, cohérence, améliorations possibles et sécurité.
- **Pour chaque agent lancé** : rapporter à David le nombre de tokens et le **coût en €**.
- **Suivi du projet** : dans **un seul dossier central local sur le PC de David** (`TRACKING_DIR`, chemin à demander à David en tout premier, à noter dans ce fichier). Ce dossier est **hors du dépôt Git**, **jamais poussé sur GitHub ni ailleurs en ligne**. Il contient : journal de session, décisions, statut des jalons, coûts agents, captures de matchs réels.
  **`TRACKING_DIR` = `D:\Projets\rugby-live-tracking`** (fixé le 2026-10-10).
- **Sources de données** (décision du 2026-10-10, voir `docs/01` et `docs/02`) : ESPN = socle v0.1 pour les 3 compétitions ; LNR (websocket, Top 14) puis EPCR (flux InCrowd, coupes) en enrichissement. Entités **stables** (par compétition, par équipe favorite), pas d'entité par match. David regarde sur **myCanal via sa box**.
- **Skills / plugins manquants** : les proposer à David, les installer **seulement après sa validation**.
- Git : **Conventional Commits**, **SemVer**, branding **uniquement `@Kenny3231`** (README, `manifest.json` → `codeowners`/`documentation`), aucune autre marque. Le code de l'intégration peut être sur GitHub (HACS l'exige) ; le suivi, non.

## Contexte Home Assistant de David

HA en mode UI, thème **Mushroom Square Shadow**, dashboards en vue **Sections** (4 colonnes max), **Bubble Card** pour les popups, stack **HACS**. Autres intégrations maison pour référence de style : Portainer (`portainer_stacks`, séparation stricte API / coordinator / entités) et TigerTag (carte Lovelace JS servie par l'intégration).

## Architecture imposée (couches strictes)

```
api.py          Client aiohttp pur (aucun import homeassistant). Retourne des dataclasses.
models.py       Dataclasses : League, Match, Team, Play, PlayType, MatchStatus…
timeline.py     Moteur de retard (aucun import homeassistant) : ingestion, file de libération, état visible.
coordinator.py  DataUpdateCoordinator par ligue, intervalle dynamique, orchestration api + timeline.
entity.py       Entités de base (device info, unique_id, availability).
sensor.py / binary_sensor.py / event.py / number.py / button.py / calendar.py
config_flow.py  Config flow + options flow.
services.yaml, strings.json, translations/{fr,en}.json, diagnostics.py, icons.json
```

`api.py` et `timeline.py` doivent être testables sans Home Assistant (pytest simple).

## Lire dans cet ordre

1. `docs/01-API-FINDINGS.md` — ce qui a été **vérifié** sur l'API ESPN (et ce qui ne l'est pas).
2. `docs/02-SPEC-INTEGRATION.md` — spec phase 1.
3. `docs/03-SPEC-LOVELACE.md` — spec phase 2.
4. `docs/04-ROADMAP-AND-VALIDATION.md` — jalons, critères d'acceptation, protocole de test sur match réel.
5. `fixtures/` — données réelles tronquées pour les tests.

## Garde-fous

- API ESPN **non officielle et non documentée** : usage personnel, requêtes modérées, `User-Agent` explicite, backoff exponentiel sur 429/5xx, aucune clé. Prévoir qu'elle puisse changer : parseurs tolérants, champs optionnels, tests de contrat sur fixtures.
- Aucun secret à stocker (API publique). Ne jamais journaliser de données personnelles.
- Toute affirmation sur le comportement de l'API qui n'est pas dans `01-API-FINDINGS.md` section « Vérifié » doit être **testée** avant d'être codée en dur.
