# Fixtures

| Fichier | Nature | Usage |
|---|---|---|
| `top14_604399_plays.json` | **Réel**, tronqué (10 plays marqueurs + 1 remplacement sur 38) | Tests du parseur `api.py`, du moteur de retard, serveur de rejeu |
| `top14_scoreboard_2026-10-10.json` | **Réel**, tronqué (2 matchs sur 6, champs utiles) | Tests du scoreboard : match `in` avec `details`, match `pre` sans play-by-play |
| `synthetic_cards.json` | **Synthétique** (cartons jaune/rouge, drop goal) | Cartons jaunes (durée 10 min), compteurs ; **à remplacer par une capture réelle au jalon M6** |

Points à garder en tête :

- Les `$ref` ont été passés en `https://`.
- Aucun athlète n'est résolu dans les fixtures : le nom vient du scoreboard (`details[].athletesInvolved`) ou d'un appel `athletes/{id}` à simuler.
- Dans `top14_604399_plays.json`, les deux premiers essais du Stade Français (18', 28') n'ont **pas** de transformation : transformation ratée = aucun événement.
- Les captures futures (matchs réels, jalon M6) iront dans `TRACKING_DIR/captures/`, pas ici ; seules des versions tronquées et anonymisées de ce qui sert aux tests rejoignent `fixtures/`.
- `synthetic_cards.json` est **autonome** : il réutilise un essai de 53' qui existe aussi (avec un autre `id`) dans `top14_604399_plays.json`, et ses scores ne suivent pas ceux du match réel. Ne jamais combiner les deux fichiers dans un même test.
