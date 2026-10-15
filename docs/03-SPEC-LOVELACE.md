# 03 — Spécification phase 2 : cartes Lovelace

À démarrer **seulement après validation de la phase 1** sur un match réel (jalon M6).

## Principes

- Les cartes ne consomment **que des entités Home Assistant** (donc déjà soumises au retard). Aucune carte n'appelle d'API de données. Exception assumée : les **logos** sont des URL d'images (CDN ESPN ou LNR) chargées par le navigateur.
- Distribution : bundle JS servi par l'intégration (chemin statique + enregistrement automatique de la ressource Lovelace), comme l'intégration TigerTag. Pas de dépendance externe/CDN.
- Source dans `frontend/` (TypeScript + Lit, build Vite → `custom_components/rugby_live/frontend/rugby-live-cards.js`). Le bundle compilé est committé pour que HACS fonctionne sans étape de build.
- Compatibilité : vue **Sections** (`getGridOptions`), thèmes sombres/clairs via variables CSS HA, rendu cohérent avec **Mushroom Square Shadow** et **Bubble Card**.
- Éditeur visuel complet pour chaque carte (`getConfigElement`, `getStubConfig`), sélecteurs d'entités natifs HA.
- i18n fr/en, accessibilité (contrastes, `aria-live` poli sur les nouveaux événements, `prefers-reduced-motion` respecté).

## Cartes

### 0. `rugby-live-direct-card` (faite le 11/10, demande de David)

- Vue « Direct » plein écran (vue Panneau) ou en 16:9 dans une section : bandeau des matchs, tableau de score façon TV, détail des points, bonus Top 14, animations des actions (photos LNR, fonds choisis dans les options de l'intégration, scène des cartons).
- Retrouve ses entités par leur clé de traduction sur l'appareil choisi (`device` : une équipe favorite — son match du moment, sinon son prochain match, toutes compétitions — ou « Match suivi » ; défaut : première équipe favorite). Les animations (appareil « Match suivi ») ne s'affichent que si elles concernent le match affiché (`match_id`). Demande de David du 15/10 : un seul choix au lieu de deux appareils.
- Options (éditeur visuel `getConfigForm`) : `ticker`, `watermark`, `breakdown`, `bonus`, `animations`, `force_motion`.
- Textes en français seulement pour l'instant.

**État au 11/10** : cartes 0, 1, 1 bis, 2 et 3 faites (`frontend/src/`), servies par l'intégration. Écarts à la spec : animation du score déclenchée par le capteur « dernier événement » (pas par le bus, réservé aux admins côté frontend) ; pas de score après chaque action dans la frise (non exposé) ; données du calendrier = attribut `fixtures` des capteurs « prochain match » de compétition ; option `device` acceptant aussi `followed` / `favorite`. Restent : i18n anglaise, tests Vitest / captures Playwright, cartes 4 et 5 (sous condition).

### 1. `rugby-live-scoreboard-card`

- Deux équipes avec logo (URL ESPN `.../teamlogos/rugby/teams/500/{teamId}.png`, repli sur initiales colorées si 404 ou logo « pays » erroné), score en grand, statut (badge **LIVE** animé, MT, Terminé, coup d'envoi dans …), minute.
- Pastilles **cartons** (jaune/rouge) sous chaque équipe, indicateur de **carton jaune en cours** avec minute de retour.
- Mini-compteurs essais / transformations / pénalités.
- Animation brève à chaque nouvel événement (flash de la couleur de l'équipe), déclenchée par l'événement du bus `rugby_live_event` (donc déjà retardé).
- Config : `team` (appareil de l'équipe favorite, ses entités sont stables), `show_logos`, `show_counters`, `compact`.
- Affiche le match en cours de l'équipe, sinon son prochain match.

### 1 bis. `rugby-live-multiplex-card`

- **Tous les scores en direct** d'une ou plusieurs compétitions (attribut `matches` de `sensor.<comp>_live_matches`) : une ligne par match avec logos, score, minute, statut et dernier événement ; l'équipe favorite en surbrillance.
- Config : `competitions`, `show_finished`, `compact`.

### 2. `rugby-live-timeline-card`

- Frise verticale des événements du match, plus récent en haut : icône par type (essai, transformation, pénalité, drop, carton jaune, carton rouge, remplacement), minute, joueur, score après l'événement, couleur de l'équipe.
- Filtres : afficher/masquer remplacements ; limite d'éléments.
- Source : attribut `events` de `sensor.<team>_last_event` (liste plafonnée des événements visibles, prévue en phase 1).

### 3. `rugby-live-fixtures-card`

- Prochains matchs et derniers résultats d'une compétition (ou de l'équipe favorite), groupés par jour, avec heure locale.
- Config : `competition`, `team`, `count_upcoming`, `count_results`.

### 4. `rugby-live-delay-card` (en dernier, facultative)

- Une carte Mushroom number + un bouton natif font déjà l'essentiel ; cette carte n'est faite que si les cartes natives ne suffisent pas à l'usage.
- Affiche le retard courant, boutons **−5 s / −1 s / +1 s / +5 s**, curseur, bouton **Calibrer** (appelle `button.rugby_live_calibrate`), bouton **Remettre à 0**.
- Texte d'aide : « Appuie sur Calibrer quand tu vois à la TV le dernier événement affiché ».

### 5. (option) `rugby-live-match-center`

Carte composite scoreboard + timeline + retard pour un popup Bubble Card ou une vue dédiée. À ne faire que si David le demande.

## Qualité et livraison

- Tests : Vitest sur la logique pure ; captures d'écran de référence (Playwright) des états : avant match, direct, mi-temps, carton jaune en cours, fin de match, erreur/indisponible.
- Dossier `docs/screenshots/` pour le README HACS.
- Versionnement SemVer aligné sur l'intégration ; les cartes ne cassent pas si l'entité est `unavailable` (état « données indisponibles »).
