// Entry point of the bundle served by the integration: registers the cards.
import { RugbyLiveDirectCard } from './direct-card';
import { RugbyLiveFixturesCard } from './fixtures-card';
import { RugbyLiveMultiplexCard } from './multiplex-card';
import { RugbyLiveScoreboardCard } from './scoreboard-card';
import { RugbyLiveTimelineCard } from './timeline-card';

declare global {
  interface Window {
    customCards?: { type: string; name: string; description: string; preview?: boolean; documentationURL?: string }[];
  }
}

const CARDS: [string, CustomElementConstructor, string, string][] = [
  ['rugby-live-direct-card', RugbyLiveDirectCard, 'Rugby Live – Direct',
    'Tableau de score plein écran, bandeau des matchs et animations des actions (essais, cartons…).'],
  ['rugby-live-scoreboard-card', RugbyLiveScoreboardCard, 'Rugby Live – Score',
    "Score d'une équipe favorite : match en cours ou prochain match, compteurs, cartons."],
  ['rugby-live-multiplex-card', RugbyLiveMultiplexCard, 'Rugby Live – Multiplex',
    'Tous les matchs du jour en direct, une ou plusieurs compétitions.'],
  ['rugby-live-timeline-card', RugbyLiveTimelineCard, 'Rugby Live – Fil du match',
    'Frise des actions du match, la plus récente en haut.'],
  ['rugby-live-fixtures-card', RugbyLiveFixturesCard, 'Rugby Live – Calendrier',
    "Prochains matchs et derniers résultats d'une compétition ou d'une équipe."],
];

for (const [tag, cls, name, description] of CARDS) {
  if (!customElements.get(tag)) customElements.define(tag, cls);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === tag)) {
    window.customCards.push({ type: tag, name, description, documentationURL: 'https://github.com/Kenny3231/rugby_live-ha' });
  }
}
