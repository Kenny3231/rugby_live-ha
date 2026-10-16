# 02 — Spécification phase 1 : intégration HACS `rugby_live`

> Révision du 2026-10-10 après la revue du kit et les mesures en direct (Top 14 J6). Décisions détaillées : `TRACKING_DIR/decisions.md`.

## Objectif (David)

Le score en direct de **tous** les matchs des 3 compétitions, et surtout celui de son **équipe favorite**, avec le plus d'événements possible, le plus vite possible. David regarde les matchs sur **myCanal via sa box TV**.

« Temps réel » veut dire ici **quasi temps réel** : toutes les sources publiques ont environ **40 à 65 s** de retard sur le terrain (mesure ESPN du 10/10). L'intégration ne peut pas faire mieux que sa source la plus rapide.

## Identité

- Domaine : `rugby_live`, nom affiché « Rugby Live ».
- `manifest.json` : `iot_class: cloud_polling`, `integration_type: service`, `config_flow: true`, `single_config_entry: true`, `requirements: []`, SemVer (`0.1.0`).
- Cible : Home Assistant **2026.10** (Python ≥ 3.14). `hacs.json` → `homeassistant: "2026.10.0"`.
- Traductions **fr + en** complètes, noms d'entités traduits.

## Sources de données

| Version | Source | Rôle |
|---|---|---|
| **v0.1** | ESPN (3 compétitions) | Socle : calendrier, scores, événements. La plus rapide mesurée. |
| v0.2 | LNR, websocket Pusher (Top 14) | Vraie minute de jeu (horodatages de période), compositions, confirmation officielle, redondance. |
| v0.3 | EPCR / InCrowd (coupes d'Europe) | Transformations ratées, ~100 stats Opta, compositions, minute réelle. |

Chaque source a son propre module client (aucun import `homeassistant`) qui renvoie les **mêmes dataclasses** de `models.py`. Pas de classe abstraite tant qu'il n'y a qu'une source.

## Config flow

1. **Étape `user`** : cases **Top 14**, **Champions Cup**, **Challenge Cup** (au moins une). Champ avancé facultatif : identifiant de ligue ESPN personnalisé.
2. **Étape `favorites`** (facultative) : équipes favorites, choisies dans la liste des équipes des ligues sélectionnées et stockées par ID ESPN.
3. **Options flow** :
   - `delay` : retard en secondes (0–300, défaut **0**).
   - `poll_live` : intervalle en match (défaut 10 s, **minimum 10 s**).
   - `poll_prematch` : défaut 60 s ; `prematch_window` : défaut 30 min.
   - `poll_idle` : défaut 900 s ; `postmatch_grace` : défaut 15 min.
   - `show_substitutions` : publier les remplacements comme événements (défaut `false`).
   - Compétitions et favoris modifiables.

## Entités : toutes **stables**

Aucun appareil ni entité créé ou supprimé par match : les `entity_id` ne changent jamais, les automatisations et les cartes restent valides d'un week-end à l'autre.

### Appareil « Rugby Live » (global)

| Entité | Détail |
|---|---|
| `number.rugby_live_delay` | Retard en secondes, 0–300, pas 1. Restauré au redémarrage. **Source de vérité du retard.** |
| `button.rugby_live_calibrate` | « Je viens de voir à la TV le dernier événement affiché » : `delay = now − observed_at` du dernier événement d'un match d'une équipe favorite (le plus récent si plusieurs). Refusé si aucun événement depuis 5 min. |
| `sensor.rugby_live_api_status` | `ok` / `degraded` / `error`, avec en attributs latence et erreurs consécutives. Catégorie diagnostic. |

### Appareil par compétition : **tous les matchs**

| Entité | Détail |
|---|---|
| `sensor.<comp>_live_matches` | État = nombre de matchs en cours. Attribut `matches` : **tous les matchs du jour** (`match_id`, équipes avec ID, nom et logo, `home_score`, `away_score`, `status`, `minute`, `kickoff`, `last_event`). Une seule carte peut afficher tous les scores. |
| `sensor.<comp>_next_match` | `device_class: timestamp` = prochain coup d'envoi ; équipes et lieu en attributs. |
| `calendar.<comp>` | Calendrier des rencontres. |

### Appareil par équipe favorite

| Entité | Détail |
|---|---|
| `sensor.<team>_match_status` | enum `no_match`, `scheduled`, `first_half`, `half_time`, `second_half`, `extra_time`, `finished`, `postponed`, `cancelled`, `unknown`. Attributs : adversaire, domicile/extérieur, compétition, coup d'envoi, lieu. |
| `sensor.<team>_score` | `"23 - 15"` (domicile – extérieur). Attributs : `home_score`, `away_score`, `team_score`, `opponent_score`, et compteurs par camp (essais, transformations, pénalités, drops, jaunes, rouges). |
| `sensor.<team>_minute` | Minute **estimée** (voir « Temps de jeu »). |
| `sensor.<team>_last_event` | Texte, ex. « Essai — Louis Carbonel (53') ». Attributs `type`, `side` (`team`/`opponent`), `player`, `minute`, et `events` (liste plafonnée des événements visibles, pour la carte timeline ; **exclue du recorder**). |
| `binary_sensor.<team>_playing` | Allumé pendant le match. |
| `sensor.<team>_next_match` | Timestamp du prochain match. |
| `event.<team>_match_event` | `EventEntity`, `event_types` : `kickoff`, `try`, `conversion`, `penalty_goal`, `drop_goal`, `yellow_card`, `red_card`, `substitution`, `half_time`, `second_half`, `full_time`, `revoked`. Attribut `side`. |

### Appareil « Match suivi » (ajout demandé par David le 10/10)

- `select.rugby_live_match_suivi` : **Automatique** (match de l'équipe favorite, sinon un match en direct, sinon le prochain) ou n'importe quel match du jour. Choix restauré au redémarrage.
- Mêmes entités que pour une équipe favorite (statut, score, minute, dernier événement, en match, carton jaune, `event`), mais pour le match choisi, avec des **identifiants fixes** (`sensor.match_suivi_*`, `event.match_suivi_evenement_du_match`) : la base des futures animations lumières / panneau LED.
- Le bouton Calibrer se cale sur le match suivi.

### Écarts assumés par rapport à la première version de cette spec

- **Un seul coordinator** pour toutes les ligues (un client limité à 1 req/s, une horloge) au lieu d'un par ligue.
- Le retard n'est **pas** dans les options : `number.rugby_live_retard` est l'unique source de vérité.
- Calendrier : balayage de 14 jours, jour par jour, toutes les 6 h (ESPN refuse les plages de dates).
- Identifiant de ligue ESPN personnalisé : **pas encore** implémenté (non nécessaire pour les 3 compétitions).

### Événements du bus : **tous les matchs**

- `rugby_live_event` (retardé), `rugby_live_event_raw` (immédiat), `rugby_live_event_revoked` (événement déjà publié puis annulé).
- Données : `competition`, `match_id`, `event_key`, `type`, `team_id`, `team_name`, `side` (`home`/`away`), `favorite` (bool), `player`, `minute`, `score_home`, `score_away`, `delay_seconds`, `observed_at`, `released_at`, `source`.
- Chaque événement logique n'est émis **qu'une fois** (clé `event_key`, voir plus bas).

## Moteur de timeline (`timeline.py`, pur)

Entrées : `(snapshots de la source, now, delay)`. Sorties : `(état visible, événements à émettre, révocations)`. Aucune dépendance Home Assistant.

### Rapprochement des événements

Mesure du 10/10 : ESPN corrige en **supprimant le play et en le recréant avec un nouvel `id`**, parfois ~50 min plus tard. Il supprime aussi les essais annulés. Les `id` ne suivent pas l'ordre du match.

1. Un événement logique a une clé `event_key` = `(match_id, type, side, period, clock)`.
2. Un play nouveau qui correspond à un événement **disparu** du même match, du même type et du même camp, à ±90 s de jeu, est la **même** occurrence. Elle garde son `observed_at` et son `event_key`, et n'est pas réémise. Ses champs (joueur, minute) sont mis à jour.
3. Un événement absent de **2 relevés consécutifs** sans remplaçant est **révoqué**. S'il était déjà visible, `rugby_live_event_revoked` est émis et l'état est recalculé (le score peut baisser). Sinon il disparaît sans bruit.
4. L'ordre d'affichage est `(period, clock)`, jamais l'`id`.

### Retard

1. Chaque événement et chaque **changement de score** reçoit `observed_at`, l'horloge murale UTC au moment où l'intégration le voit pour la première fois.
2. Un élément est **visible** quand `now ≥ observed_at + delay`.
3. **Tout** ce que voit l'utilisateur (états, attributs, événements) dérive des seuls éléments visibles. Le score visible est le dernier **score de scoreboard** visible : ESPN met parfois le score à jour avant les plays (vu le 10/10).
4. Libération planifiée avec `async_track_point_in_time` vers le prochain `observed_at + delay`.
5. Retard **réduit** : les éléments devenus dus sont libérés immédiatement, une seule fois. Retard **augmenté** : l'état est recalculé et peut reculer ; rien n'est réémis ni révoqué.
6. Un retard ne peut que **retenir** les données. Si l'image TV est en avance sur les données, le réglage reste à 0 (documenté). Avec myCanal sur box, les deux retards sont du même ordre : le bouton Calibrer tranche.

### Redémarrage de HA en plein match

- `observed_at` et `event_key` sont persistés dans un `Store` par match.
- Un événement inconnu découvert au redémarrage alors que des événements plus récents existent est un **rattrapage** : intégré à l'état, sans événement bus ni `event` entity.

## Temps de jeu

`status.displayClock` d'ESPN est **faux** (toujours `"1'"`).

1. v0.1 : dernier `clock.value` connu + temps réel écoulé depuis son observation. Plafonné à 40:00 en 1ʳᵉ mi-temps et 80:00 en 2ᵉ, affiché `40+` ou `80+` au-delà. Ne redescend jamais. En repli : estimation depuis le coup d'envoi. Attribut `source` (`play_clock` | `kickoff_estimate`).
2. v0.2 (Top 14) : horodatages réels de période fournis par la LNR (`timer-updated`), source `official_timer`.
3. La minute affichée est soumise au retard.

## Polling (ESPN)

Un `DataUpdateCoordinator` par ligue, intervalle dynamique :

| Situation | Intervalle | Appels |
|---|---|---|
| Rien dans la fenêtre pré-match ni en cours | `poll_idle` | 1 scoreboard |
| Match(s) dans la fenêtre pré-match | `poll_prematch` | 1 scoreboard |
| Match(s) `in` | `poll_live` | 1 scoreboard + 1 `plays` par match `in` |
| Match terminé depuis moins de `postmatch_grace` | 60 s | 1 scoreboard + `plays` (corrections tardives) |

- 4 matchs simultanés de Top 14 toutes les 10 s = 0,5 requête/s. Un limiteur global maintient **≤ 1 requête/s** toutes ligues confondues.
- Noms des joueurs : d'abord `details[].athletesInvolved` du scoreboard, sinon `GET athletes/{id}` (cache mémoire + `Store`).
- `User-Agent` explicite, timeouts courts, backoff exponentiel avec jitter, repair issue si l'API est injoignable plus de 15 min pendant un match.
- **Pas de repli « événements devinés »** : si `playByPlayAvailable` est `false`, seul le score est publié, sans événement.

## Diagnostics et qualité

- `diagnostics.py` (aucune donnée sensible), `sensor.rugby_live_api_status`.
- Tests : `pytest` sur les clients et sur `timeline.py` (sans HA), `pytest-homeassistant-custom-component` pour le flow et les entités.
- `ruff`, `hassfest`, action HACS. Viser le niveau **Bronze**.
- `tools/record_match.py` : capture brute (scoreboard + plays, uniquement quand ça change) vers `TRACKING_DIR/captures/`.
- `tools/replay_server.py` : rejoue une capture en simulant l'avancement du match. L'intégration n'accepte une URL de base surchargée **que** via la variable d'environnement `RUGBY_LIVE_ESPN_BASE_URL` (développement), jamais via l'UI.

## Documentation livrée avec la v0.1

README fr/en : installation HACS, configuration, entités, exemples d'automatisations (lumière WLED sur un essai de son équipe, annonce TTS d'un carton rouge, notification de fin de match), avertissement « sources non officielles », calibration du retard avec myCanal.
