# 01 — API ESPN : ce qui a été vérifié

Source : tests réels du 10/10/2026 depuis le navigateur du PC de David (`sports.core.api.espn.com`) et lecture du scoreboard `site.api.espn.com`. API **non officielle**, sans clé, sans limite publiée. Les `$ref` renvoyés sont en `http://` avec `?lang=en&region=us` ; utiliser `https://`.

## Vérifié

### Ligues

| Compétition | ID ligue | Remarque |
|---|---|---|
| French Top 14 | `270559` | `season.year` 2026 mais dates de saison incohérentes : ne pas s'y fier |
| European Rugby Champions Cup | `271937` | libellés de saison périmés (« 2023/24 ») : ne pas s'y fier |
| European Rugby Challenge Cup | `272073` | **play-by-play non testé** |

Liste complète : `GET https://sports.core.api.espn.com/v2/sports/rugby/leagues?limit=100` (25 ligues). Autres utiles : URC `270557`, Gallagher Premiership `267979`, Six Nations `180659`, Rugby Championship `244293`, Nations Championship `17567`.

### Endpoints qui fonctionnent

```
# Matchs du jour d'une ligue : scores, statut, équipes, venue (+ "details" = événements si PBP dispo)
GET https://site.api.espn.com/apis/site/v2/sports/rugby/{league}/scoreboard
GET .../scoreboard?dates=YYYYMMDD

# Liste des matchs d'un jour (refs seulement)
GET https://sports.core.api.espn.com/v2/sports/rugby/leagues/{league}/events?dates=YYYYMMDD

# Match / compétition (drapeaux de disponibilité)
GET .../leagues/{league}/events/{id}
GET .../leagues/{league}/events/{id}/competitions/{id}          -> playByPlayAvailable, liveAvailable…
GET .../leagues/{league}/events/{id}/competitions/{id}/status   -> period, type.state (pre|in|post), type.name

# Play-by-play (LE bon endpoint pour le live)
GET .../leagues/{league}/events/{id}/competitions/{id}/plays?limit=400

# Dernier événement (ref seulement)
GET .../leagues/{league}/events/{id}/competitions/{id}/situation

# Joueur (nom complet) — résolution d'un $ref participant
GET https://sports.core.api.espn.com/v2/sports/rugby/athletes/{athleteId}
```

`/details` et `/playtypes` renvoient 404.

### Format d'un play

```json
{
  "id": "1895463",
  "sequenceNumber": "0",
  "type": { "id": "1", "text": "try" },
  "homeScore": 5, "awayScore": 0,
  "period": { "number": 1 },
  "clock": { "value": 1049.0, "displayValue": "18'" },
  "addedClock": { "value": 0, "displayValue": "18'" },
  "priority": false,
  "modified": "2026-10-10T14:11Z",
  "team": { "$ref": ".../seasons/2027/teams/25921?lang=en&region=us" },
  "participants": [ { "order": 1, "type": "player",
      "athlete": { "$ref": ".../athletes/117466?lang=en&region=us" },
      "position": { "$ref": ".../positions/6" } } ]
}
```

- **Les plays portent le score cumulé** (`homeScore`/`awayScore`) **après** l'événement : le score se lit directement, sans table de points.
- Types observés sur 77 matchs (Top 14 et Champions Cup, 2025-26 et début 2026-27) :

| id | text | occurrences | Note |
|---|---|---|---|
| 1 | `try` | 334 | essai |
| 2 | `conversion` | 246 | transformation réussie uniquement |
| 3 | `penalty goal` | 114 | pénalité réussie uniquement |
| 4 | `drop goal` | 3 | |
| 5 | `yellow card` | 70 | |
| 6 | `red card` | 6 | |
| 7 | `player substituted` | 863 | joueur qui sort |
| 8 | `substitute on` | 863 | joueur qui entre (même minute, juste après le 7) |

- **Aucun événement pour les tentatives manquées** (transformations/pénalités ratées) : on ne peut pas les afficher.
- `team.$ref` : l'ID d'équipe est le dernier segment. Associer à `home`/`away` via `competitors[].homeAway` (scoreboard ou compétition).
- `clock.value` en secondes, `displayValue` en minutes (`"53'"`). Les plays arrivent triés par `id` croissant, mais **l'ordre des `id` est l'ordre de saisie, pas l'ordre du match** (vérifié le 10/10 : une transformation de 9' a reçu un `id` postérieur à une pénalité de 14'). Trier par `(period, clock.value)`.
- **Corrections = suppression + recréation avec un nouvel `id`** (vérifié 2 fois en 5 min le 10/10 : essai Pau–Castres 15' `1895716` → `1895727`, transformation Lyon–La Rochelle 9' `1895710` → `1895721`). Une correction peut arriver **longtemps après** (carton jaune Toulon–Racing de 7' recréé avec un nouvel `id` en 2ᵉ mi-temps, ~50 min plus tard). Un play peut aussi **disparaître** (essai du Racing à 40', 14-12, supprimé quelques minutes après ; la LNR a corrigé son score de 14-12 à 14-7). Conséquence : on ne peut **pas** dédupliquer par `id` seul ; il faut rapprocher par `(type, équipe, période, minute ±1)` et recalculer l'état quand un play disparaît.
- Joueur : `participants[0].athlete.$ref` → ID ; le nom exige un second appel (mettre en cache) **ou** se lit dans `scoreboard.events[].competitions[].details[].athletesInvolved[].fullName`.
- Couverture play-by-play : Top 14 47 matchs sur 52 sondés (les 5 manquants étaient des matchs non commencés) ; Champions Cup 2025-26 : 30 matchs sur 30 avec `playByPlayAvailable: true`. Mais **sur le scoreboard du 10/10, seul le match déjà en cours avait le flag à `true`**, les matchs à venir l'avaient à `false` : lire le flag **à chaque cycle** pour les matchs `in`.

### Scoreboard (site API)

- `events[].competitions[0]` : `competitors[]` (équipes, `homeAway`, `score` en chaîne, `team.id`, `team.logo`), `status.type.{name,state,detail}`, `playByPlayAvailable`, `situation.lastPlay`, `details[]` (événements avec `athletesInvolved[].fullName`, `clock.displayValue`, `team.id`, `type.text`).
- Sans match aujourd'hui, le scoreboard renvoie le prochain jour de match (Champions Cup du 10/10 → événements du 16/10).
- Horodatages en UTC (`...Z`).
- `details[]` n'a **ni `id` ni score cumulé** (vérifié sur le scoreboard complet) : le scoreboard seul ne suffit pas à suivre les événements de façon fiable ; l'endpoint `plays` reste nécessaire.
- Cache CDN : `Cache-Control: max-age=1` à `4`. Pas d'`ETag` ni de `Last-Modified` observés.
- Challenge Cup `272073` : le scoreboard répond (matchs du 16/10, `STATUS_SCHEDULED`). Play-by-play toujours non testé.

### Résumé de match (site API)

`GET https://site.api.espn.com/apis/site/v2/sports/rugby/{league}/summary?event={id}` : `rosters[]` (2 × 23 joueurs : `jersey`, `starter`, `subbedIn`, `subbedOut`, `athlete.fullName`, `position`). `boxscore` (stats d'équipe) est **vide** et il n'y a pas de commentaire.

### Statuts relevés le 10/10

| `status.type.name` | `state` |
|---|---|
| `STATUS_SCHEDULED` | `pre` |
| `STATUS_FIRST_HALF` | `in` |
| `STATUS_HALFTIME` | `in` |
| `STATUS_SECOND_HALF` | `in` |
| `STATUS_FINAL` | `post` (`detail: "FT"`) |

### Latence mesurée (Top 14 J6, 10/10, 4 matchs, 1ʳᵉ mi-temps)

- Sur le match complet (39 scores comparés, première apparition de chaque score) : ESPN **en avance dans 35 cas sur 39**, de **+43 s en médiane** (de −20 s à plusieurs minutes ; la LNR accuse parfois plusieurs minutes de retard). ESPN était interrogé toutes les 15 s, d'où une marge de ±15 s.
- Passage d'ESPN en `STATUS_HALFTIME` par rapport à l'heure de fin de période saisie par la LNR : **+42 s, +55 s, +63 s**. Ordre de grandeur du retard d'ESPN sur le terrain : **~40–65 s** (l'heure LNR est elle-même saisie à la main).
- Captures brutes : `TRACKING_DIR/captures/2026-10-10_top14_j6/`.

## Sources officielles (gratuites, non documentées)

Sites web officiels, pas des API publiques : usage personnel modéré, structure susceptible de changer sans préavis.

### LNR — Top 14 (et Pro D2)

- **Push temps réel** via Pusher (clé publique du site `33760977f514c7917e95`, cluster `eu`) : `wss://ws-eu.pusher.com/app/<key>?protocol=7`, canal public `fixtures.{lnrMatchId}`. Événements : `score-updated` (`{"score":[h,a],"halftimeScore":…}`), `timeline-updated` (faits de match : `type`, `subtype` « Essai »/« Pénalité »…, `club` home/away, `period`, `minute`, `additionalMinute`, `score`, `player`), `lineups-updated` (remplacements), `timer-updated` (**horodatages réels** `firstPeriodStartDate`, `firstPeriodEndDate`, `secondPeriodStartDate`, `secondPeriodEndDate`). Vérifié le 10/10 sur 4 matchs.
- État initial : les pages `https://top14.lnr.fr/feuille-de-match/{saison}/{journée}/{id}-{slug}` embarquent le même JSON dans des attributs (`:match`, `:timer`, `:game-facts`, compositions). La page `calendrier-et-resultats` liste les matchs (`:matches`).
- La LNR a aussi corrigé des scores en direct (`9-14` → `6-14`, `14-12` → `14-7` le 10/10).

### EPCR — Champions Cup et Challenge Cup (flux InCrowd / RugbyViz-Opta)

- `GET https://rugby-union-feeds.incrowdsports.com/v1/matches?clientId=EPCR&provider=rugbyviz&compId={1008|1026}&season={202601}` : liste des matchs (1008 = Champions Cup, 1026 = Challenge Cup ; `season` 202601 = 2026-27).
- `GET .../v1/matches/{id}?clientId=EPCR&provider=rugbyviz&images=true` : `status` (`fixture`, `result`…), `minute`, `second`, `timerRunning`, `timerTimestamp`, `events[]` avec **horodatage réel** (`timestamp`), `type` (`Try`, `Conversion`, `Missed conversion`, `Penalty`, `Yellow card`, `Sub On`/`Sub Off`, `First Half Start`/`End`…), `playerId`, `teamId` ; `homeTeam/awayTeam.players` (compositions) et `.stats` (~100 stats Opta : possession, plaquages, mètres, touches…) ; `kickingCompScore`, `extraFTScore`.
- `GET .../v1/matches/{id}/commentary?...` : commentaire texte.
- Vérifié le 10/10 sur la finale 2025-26 (`288423`) et un match à venir (`293317`). **Comportement en direct non vérifié** (pas de match ce jour-là).

### Sources écartées

- Sofascore : HTTP 403 sur les requêtes automatiques.
- API payantes bon marché (API-Sports, Highlightly, TheSportsDB) : score seul, sans fil d'événements. Goalserve 150 $/mois, Sportradar/Opta en direct : tarifs professionnels.

### Pièges rencontrés

- **`status.displayClock` est faux en direct** : `"1'"` en 2ᵉ mi-temps alors que le dernier événement était à 53'. Le minute du match doit venir des plays (ou d'une estimation depuis le coup d'envoi), jamais de ce champ.
- `sequenceNumber` vaut `"0"` partout et `modified` est identique pour tous les plays (heure d'ingestion) : **inutilisables pour dédupliquer ou mesurer la latence**. Mesurer la latence en notant l'heure à laquelle HA voit le play pour la première fois (`observed_at`). Pour la déduplication, voir les corrections ci-dessus : l'`id` ne suffit pas.
- Les abréviations d'équipe sont parfois fausses (Perpignan ressort `USA`, Stade Français `STA` comme La Rochelle). **Toujours utiliser l'ID d'équipe.**
- Les logos d'équipe suivent `https://a.espncdn.com/i/teamlogos/rugby/teams/500/{teamId}.png`, mais certains (Perpignan, Vannes) pointent vers un logo « pays » erroné : prévoir un repli.
- `athlete.$ref` du participant pointe vers `athletes/{id}` (sans ligue) : c'est le bon chemin.

### IDs d'équipes Top 14 observés

Stade Français 25921, Montpellier 25918, Perpignan 25920, Vannes 289337, Lyon 143736, La Rochelle 119318, Pau 270567, Castres 25916, Toulon 25986, Racing 92 99855, Clermont 25917, Bordeaux-Bègles 143737. Gloucester (Champions Cup) 25900.

## NON vérifié — à tester avant de coder en dur

1. **Challenge Cup `272073`** : couverture play-by-play en direct.
2. **Statuts restants** : report, annulation, prolongations (les statuts courants sont relevés ci-dessus).
3. **Essai de pénalité** : probablement un `try` de 7 points sans transformation ; vérifier par le delta de score.
4. ~~Annulations (TMO)~~ : **vérifié** (plays supprimés ou recréés, voir plus haut). Reste à voir si une annulation après la fin du match arrive.
5. **Prolongations / séance de tirs** en phase finale de coupe d'Europe (`period.number` > 2).
6. **Plage de dates** : `dates=YYYYMMDD-YYYYMMDD` fonctionne-t-il (utile pour le calendrier) ?
7. ~~ETag~~ : **vérifié**, non supporté (cache CDN de 1 à 4 s).
8. **Latence par rapport à la TV de David (myCanal sur box)** : ESPN a ~40–65 s de retard sur le terrain (voir plus haut) ; le retard de l'image myCanal reste à mesurer au jalon M6.
9. **Limites de débit** : inconnues. Rester sous ~1 requête/s globale.
10. **Fin de carton jaune** : aucun événement ; la durée (10 minutes de jeu) est à calculer côté intégration. Vérifier aussi le « bunker » (jaune transformé en rouge après revue) et le rouge de 20 min selon la compétition.
11. **EPCR en direct** : fréquence de mise à jour du flux InCrowd, présence d'un push.
