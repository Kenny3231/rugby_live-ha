# Kit de démarrage — rugby_live (Home Assistant)

Ce dossier contient tout ce qu'il faut donner à Claude Code pour construire l'intégration HACS, puis les cartes Lovelace. **Il ne contient pas le code de l'intégration** : Claude Code le produira par jalons, avec ta validation à chaque étape.

| Fichier | Rôle |
|---|---|
| `CLAUDE.md` | Instructions permanentes du projet (périmètre, règles de travail, architecture) |
| `PROMPT_CLAUDE_CODE.md` | Le premier message à coller dans Claude Code |
| `docs/01-API-FINDINGS.md` | Ce qui a été testé sur l'API ESPN (et ce qui ne l'a pas été) |
| `docs/02-SPEC-INTEGRATION.md` | Spécification de l'intégration (entités, retard, polling) |
| `docs/03-SPEC-LOVELACE.md` | Spécification des cartes |
| `docs/04-ROADMAP-AND-VALIDATION.md` | Jalons M0–M12 et protocole de test sur match réel |
| `fixtures/` | Données réelles tronquées (Top 14) + cartons synthétiques pour les tests |

## À savoir

- Le **dossier de suivi** du projet est séparé : `TRACKING_DIR` sur ton PC, jamais dans le dépôt. Claude Code te demandera le chemin.
- Les fixtures de cartons sont **synthétiques** (aucun carton dans le match échantillonné) : leur structure suit celle des autres plays, mais elle est à confirmer sur un vrai carton.
- La Challenge Cup (`272073`) n'a pas été testée sur le play-by-play.
