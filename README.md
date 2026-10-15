# Rugby Live pour Home Assistant

Scores et événements **en quasi direct** du **Top 14**, de la **Champions Cup** et de la **Challenge Cup** dans Home Assistant : score, statut, minute de jeu, essais, transformations, pénalités, drops, cartons, remplacements, avec un **retard réglable** pour ne pas te faire spoiler avant ta TV.

**Site, guide d'installation illustré et démo en direct : https://rugby-live-ha.pages.dev**

> ⚠️ Les données viennent de l'API **non officielle et non documentée** d'ESPN (usage personnel, requêtes modérées). Elle peut changer sans préavis.

## Ce qu'il faut savoir sur le « direct »

- Les données arrivent environ **40 à 65 s après l'action** sur le terrain (mesuré le 10/10/2026). Aucune source publique ne fait mieux : elles sont saisies par des opérateurs.
- ESPN **corrige** régulièrement en supprimant puis recréant une action (parfois 50 min plus tard), et supprime les essais annulés. L'intégration suit chaque action par son joueur et son équipe : une correction ne déclenche **jamais** deux fois tes automatisations, et un essai annulé émet un événement `revoked`.
- Le score vient du tableau d'affichage ESPN, pas des actions (moins fiable).

## Installation (HACS)

1. HACS → menu ⋮ → **Dépôts personnalisés** → `https://github.com/Kenny3231/rugby_live-ha`, catégorie **Intégration**.
2. Installer **Rugby Live**, redémarrer Home Assistant.
3. **Paramètres → Appareils et services → Ajouter une intégration → Rugby Live** : choisis les compétitions, puis tes équipes favorites (facultatif).

## Entités

Les identifiants ne changent jamais d'un match à l'autre : tes automatisations et cartes restent valides.

| Appareil | Entités |
|---|---|
| **Rugby Live** | `number` Retard (s), `button` Calibrer le retard, `sensor` État de l'API |
| **Par compétition** | `sensor` Matchs en direct (attribut `matches` : tous les matchs du jour avec score, minute, logos, dernier événement), `sensor` Prochain match, `calendar` Matchs (14 jours) |
| **Par équipe favorite** | `sensor` Statut du match, Score, Minute, Dernier événement (attribut `events` : fil du match), Prochain match ; `binary_sensor` En match, Carton jaune en cours ; `event` Événement du match |

Logos : officiels LNR pour le Top 14, ESPN pour les autres équipes.

## Événements pour les automatisations

| Événement | Quand |
|---|---|
| `rugby_live_event` | Après le retard réglé (ce que tu vois) |
| `rugby_live_event_raw` | Dès que l'intégration voit l'action |
| `rugby_live_event_revoked` | Une action déjà publiée a été annulée |

Données : `type` (`try`, `conversion`, `penalty_goal`, `drop_goal`, `yellow_card`, `red_card`, `substitution`, `kickoff`, `half_time`, `second_half`, `full_time`), `team_id`, `team_name`, `side`, `player`, `minute`, `score_home`, `score_away`, `home_name`, `away_name`, `favorite`, `competition`, `match_id`.

```yaml
# Lumière aux couleurs du club à chaque essai du Stade Toulousain
triggers:
  - trigger: event
    event_type: rugby_live_event
    event_data:
      type: try
      team_id: "25922"
actions:
  - action: light.turn_on
    target: { entity_id: light.salon }
    data: { rgb_color: [220, 0, 0], flash: short }
```

```yaml
# Annonce d'un carton rouge pour un match de mon équipe
triggers:
  - trigger: event
    event_type: rugby_live_event
    event_data: { type: red_card, favorite: true }
actions:
  - action: tts.speak
    target: { entity_id: tts.google_translate_fr_fr }
    data:
      media_player_entity_id: media_player.salon
      message: "Carton rouge pour {{ trigger.event.data.team_name }}, {{ trigger.event.data.player }}."
```

```yaml
# Notification de fin de match
triggers:
  - trigger: event
    event_type: rugby_live_event
    event_data: { type: full_time, favorite: true }
actions:
  - action: notify.notify
    data:
      message: >-
        Fin du match : {{ trigger.event.data.home_name }} {{ trigger.event.data.score_home }}
        - {{ trigger.event.data.score_away }} {{ trigger.event.data.away_name }}
```

## Retard anti-spoil (myCanal, box…)

Un flux TV ou streaming a son propre retard. Pour caler les données dessus :

1. Pendant un match, laisse le retard à 0.
2. Quand une action affichée par Home Assistant **apparaît à ta TV**, appuie sur **Calibrer le retard** : le retard devient le temps écoulé depuis que l'intégration a vu cette action.
3. Ajuste au besoin avec le service `rugby_live.set_delay` (`seconds`, `relative`).

Le retard ne peut que **retenir** les données : si ta TV est déjà en retard sur l'action plus que les données, le bon réglage est 0. Augmenter le retard peut faire « reculer » un score affiché, sans jamais réémettre d'événement.

## Dashboard d'exemple

[`examples/dashboard.yaml`](examples/dashboard.yaml) : vue Sections avec carte du match de l'équipe favorite (nécessite `button-card`), fil du match, multiplex de tous les matchs (cartes Markdown natives), calendrier et réglage du retard. Remplace `stade_toulousain` par le nom de ton équipe.

## Options

Intervalles d'interrogation (en match 10 s par défaut, minimum 10 s ; avant-match ; sans match), fenêtre d'avant-match, suivi après le match, durée du carton jaune, publication des remplacements. Le débit vers ESPN est plafonné à 1 requête/s.

## Développement

```bash
pip install -r requirements_test.txt
ruff check . && pytest            # sous Windows : pytest -p no:homeassistant
python tools/record_match.py --league 270559 --out <dossier>   # capture d'un match réel
python tools/replay_server.py <dossier> --speed 10             # rejeu (RUGBY_LIVE_ESPN_BASE_URL)
```

Spécifications et mesures : [`docs/`](docs/).

## Licence

MIT — © 2026 Kenny3231.
