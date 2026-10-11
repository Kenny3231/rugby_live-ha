# 05 — Animations d'événements (écran, panneau LED, lumières)

Objectif (David, 10/10/2026) : une ambiance « studio » façon ConnectedRoom Sports. À chaque action du **match suivi**, une grosse animation à l'écran, sur le panneau LED et avec les lumières. Animations **spéciales** pour le Stade Toulousain (essai, transformation, pénalité, drop) et **classiques** pour les autres équipes et pour les cartons.

## Comment c'est branché

| Couche | Déclencheur | État |
|---|---|---|
| **Écran** (vue « Direct » du dashboard) | `sensor.match_suivi_animation` | ✅ Animation CSS intégrée (voir ci-dessous). Une **vidéo de fond** est jouée si le fichier existe. |
| **Panneau LED** (WLED, 32×8) | même entité, par automatisation | ⏳ 2ᵉ temps |
| **Lumières** | même entité ou événement `rugby_live_event` | ⏳ 2ᵉ temps |

Tout passe après le **retard réglé** : avec myCanal, l'animation tombe au moment où l'action passe à la TV, une fois le retard calibré.

## Animation à l'écran (vue « Direct »)

| Action | Ce qui s'affiche |
|---|---|
| Essai, transformation, pénalité, drop | **Photo détourée du joueur** (site LNR) qui entre par la gauche, logo du club, titre, nom du joueur dans un bandeau aux couleurs du club, club et minute. Sans photo (joueur hors Top 14) : logo, titre, joueur et minute au centre. |
| Carton jaune ou rouge | Coup de **sifflet** (ondes sonores), puis le **carton** tombe en tournoyant sur l'épaule du joueur (ou au centre sans photo), pourtour jaune ou rouge qui pulse lentement. |
| Coup d'envoi, mi-temps, reprise, prolongations, fin, action annulée | Information seule : titre et ligne de détail (pour une action annulée : « Essai • joueur • minute »), fond neutre. |

**Fond au choix** dans les options de l'intégration (Paramètres → Appareils et services → Rugby Live → Configurer), par type d'action : rayons, ondes, projecteurs, confettis. Par défaut : essais = rayons + projecteurs ; transformations, pénalités, drops = rayons ; informations = aucun. Les cartons ont leur propre scène.

**Photos des joueurs** : l'intégration charge une fois par jour la liste des joueurs du Top 14 sur le site de la LNR et met l'adresse de la photo dans l'attribut `player_photo`. Rien n'est copié : la photo est affichée depuis le site de la LNR.

**Tableau de score** (vue « Direct », match en cours ou terminé) : panneaux aux couleurs des clubs, score, chrono (minute et période), détail des points sous chaque équipe (essais, transformations, pénalités, drops). Le chiffre qui change grossit une fois l'animation terminée. En **Top 14**, badge **bonus offensif** (vainqueur avec au moins 3 essais de plus) ou **bonus défensif** (défaite de 5 points ou moins) : en pointillés pendant le match, plein à la fin.

**Tester sans match** : ouvrir `tools/animation_preview.html` dans un navigateur (F11 pour le plein écran), choisir l'action, l'équipe, le joueur et les fonds, puis « Jouer ».

**Animations réduites** : si le système de l'écran demande de réduire les animations (Windows : Paramètres → Accessibilité → Effets visuels → « Effets d'animation » désactivé), le navigateur coupe les mouvements et l'animation s'affiche fixe.

## Fichiers attendus (écran)

Dépose les vidéos dans `/config/www/rugby_live/anim/` (servies sous `/local/rugby_live/anim/`). Un fichier absent ne pose aucun problème : l'animation CSS seule s'affiche.

| Fichier | Quand |
|---|---|
| `try_toulouse.mp4` | Essai du Stade Toulousain |
| `conversion_toulouse.mp4` | Transformation réussie du Stade Toulousain |
| `penalty_goal_toulouse.mp4` | Pénalité réussie du Stade Toulousain |
| `drop_goal_toulouse.mp4` | Drop réussi du Stade Toulousain |
| `try.mp4`, `conversion.mp4`, `penalty_goal.mp4`, `drop_goal.mp4` | Mêmes actions, autres équipes |
| `yellow_card.mp4`, `red_card.mp4` | Cartons (toutes équipes) |
| `kickoff.mp4`, `half_time.mp4`, `second_half.mp4`, `full_time.mp4` | Facultatif |

**Format :** MP4 H.264, 1920×1080, 30 i/s, **5 à 6 s**, sans son (lecture automatique muette), moins de 8 Mo. La vidéo sert de **fond** : le dashboard dessine par-dessus le logo officiel, le texte et le nom du joueur. Les prompts demandent donc **ni texte, ni logo** : les générateurs IA déforment les logos et le texte, et reproduire un blason pose un problème de droits. On garde les **couleurs** du club (rouge et noir pour Toulouse).

Pour réduire une vidéo trop lourde :

```bash
ffmpeg -i entree.mp4 -t 6 -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30" -an -c:v libx264 -crf 24 -preset slow try_toulouse.mp4
```

## Outils conseillés

Image-vers-vidéo ou texte-vers-vidéo : **Kling, Veo, Seedance** (par exemple via Higgsfield), Runway ou Sora. Pour garder un style cohérent sur toute la série, génère d'abord une **image de départ** (prompt « Image » ci-dessous), puis anime-la avec le prompt « Vidéo ». Les prompts sont en anglais : les générateurs les comprennent mieux.

---

## Série spéciale Stade Toulousain (rouge et noir)

Charte commune à ajouter à chaque prompt de la série :

> Color palette strictly deep red (#C8102E) and black with white highlights, premium sports-broadcast look, cinematic lighting, volumetric light, high contrast, 16:9, no text, no letters, no logos, no crest, no watermark.

### `try_toulouse.mp4` — Essai

- **Image :** `A stylized rugby player in a red and black jersey diving over the try line, ball grounded, explosion of red and black confetti and sparks, packed stadium at night in deep red light, low dramatic camera angle, motion blur, epic sports-broadcast style, centre of frame kept darker and clear for an overlay.`
- **Vidéo :** `Slow-motion dive over the try line, the ball touches the grass and a shockwave of red light bursts outward, red and black confetti and fireworks explode from the stands, camera pushes in then shakes on impact, light beams sweep the stadium, crowd silhouettes jump, 5 seconds, ends on a glowing red pulse, seamless dark edges.`

### `conversion_toulouse.mp4` — Transformation réussie

- **Image :** `Close-up of a rugby ball on a kicking tee in a night stadium bathed in red light, rugby posts glowing red and black in the background, sparks in the air, cinematic sports-broadcast style.`
- **Vidéo :** `The ball is kicked from the tee, follows a glowing red comet trail and passes between the posts, the posts light up in red and black with a flash, fireworks burst above the crossbar, camera follows the ball then cranes up to the posts, 5 seconds, ends on a red glow.`

### `penalty_goal_toulouse.mp4` — Pénalité réussie

- **Image :** `Rugby posts seen from behind the kicker at night, red and black stadium lights, tension, focused atmosphere, light haze, cinematic.`
- **Vidéo :** `Moment of silence then the kick: the ball spins in slow motion through the posts leaving a red light trail, the scoreboard area flashes red, three bright red pulses ripple across the stadium like "+3", red and black sparks fall, 5 seconds.`

### `drop_goal_toulouse.mp4` — Drop réussi

- **Vidéo :** `In open play a ball is drop-kicked and arcs high through the posts trailing red and black flames, sudden stadium-wide red flash, confetti cannons fire in red and black, fast dynamic camera move, 5 seconds.`

---

## Série classique (toutes les autres équipes)

Le dashboard teinte déjà le fond avec la **couleur de l'équipe** qui marque. Les vidéos classiques restent donc **neutres** (blanc, argent, or) pour aller avec n'importe quel club.

Charte commune :

> Neutral palette white, silver and warm gold, clean modern sports-broadcast graphics, dark background, high contrast, 16:9, no text, no letters, no logos, no team colors, no watermark.

| Fichier | Prompt vidéo |
|---|---|
| `try.mp4` | `A rugby ball slams onto the try line in slow motion, a ring of white light expands, gold sparks and a short burst of light beams, camera dolly-in, 5 seconds, ends on dark.` |
| `conversion.mp4` | `A rugby ball flies between glowing white posts leaving a silver trail, soft gold flash on the crossbar, 5 seconds.` |
| `penalty_goal.mp4` | `Top-down view of a ball spinning through the posts, three clean white light pulses ripple outward, minimal broadcast style, 5 seconds.` |
| `drop_goal.mp4` | `Fast drop kick arcing through the posts with a white streak, quick gold flash, dynamic camera, 5 seconds.` |
| `yellow_card.mp4` | `A glowing yellow card spins in the air in slow motion against a dark background, warning-yellow light pulses and a ticking clock feeling, tense, 5 seconds, no text.` |
| `red_card.mp4` | `A glowing red card snaps into frame, harsh red strobe and shockwave, dark and dramatic, 5 seconds, no text.` |
| `kickoff.mp4` | `Stadium floodlights switch on one after another, the ball is kicked high into the night sky, light sweep, 5 seconds.` |
| `half_time.mp4` | `Calm wide shot of an empty pitch at night, slow light sweep, players silhouettes walking off, 5 seconds.` |
| `full_time.mp4` | `Final whistle moment: stadium lights flash, slow confetti rain in white and gold, wide celebratory shot, 5 seconds.` |

---

## Panneau LED 32×8 (2ᵉ temps)

À 32×8 pixels, un générateur IA ne produit rien d'exploitable : il faut du **pixel art exact**. Deux options :

1. **Recommandé : générées par code** (Python/Pillow) dans ton projet `wled animation`. Résultat net au pixel près, facile à décliner (rouge et noir pour Toulouse, couleur du club sinon) et à maintenir. Exemples :
   - `try_toulouse` : texte « ESSAI » qui défile en rouge sur noir, flash plein rouge, ballon qui rebondit ;
   - `conversion_toulouse` : ballon qui traverse des poteaux en H, puis « +2 » ;
   - `penalty_goal_toulouse` : « +3 » qui clignote, rouge et noir ;
   - cartons : rectangle jaune ou rouge qui pulse, avec le numéro de minute.
2. **IA puis réduction** : générer en 512×128 avec le prompt `pixel art, 32x8 grid, LED matrix style, bold blocky shapes, red and black, black background, rugby ball and goal posts, no anti-aliasing`, puis réduire sans lissage :

   ```bash
   ffmpeg -i grand.gif -vf "scale=32:8:flags=neighbor" -r 12 try_toulouse_32x8.gif
   ```

## Lumières (2ᵉ temps)

Une automatisation sur `event.match_suivi_evenement_du_match` ou sur `rugby_live_event` déclenche une scène selon le `type` et le `team_id`. Par exemple, essai de Toulouse (`team_id: "25922"`) : flash rouge et noir pendant 8 s, puis retour à la scène précédente (`scene.create` avant, `scene.turn_on` après).
