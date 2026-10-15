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

function register() {
  for (const [tag, cls, name, description] of CARDS) {
    if (!customElements.get(tag)) customElements.define(tag, cls);
    window.customCards = window.customCards || [];
    if (!window.customCards.some((c) => c.type === tag)) {
      window.customCards.push({ type: tag, name, description, documentationURL: 'https://github.com/Kenny3231/rugby_live-ha' });
    }
  }
}

// HA imports this module next to its own app, which swaps window.customElements for its
// own registry: cards defined before the swap stay invisible to HA ("Custom element doesn't
// exist", seen on cold page loads on 15/10). Inside HA, wait until HA has defined its root
// element (the swap is done by then); elsewhere (the website demo), register at once.
const ready = () => !document.querySelector('home-assistant') || !!customElements.get('home-assistant');
if (ready()) register();
else {
  const timer = setInterval(() => {
    if (!ready()) return;
    clearInterval(timer);
    register();
  }, 50);
}
