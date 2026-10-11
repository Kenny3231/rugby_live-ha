// Entry point of the bundle served by the integration: registers the cards.
import { RugbyLiveDirectCard } from './direct-card';

declare global {
  interface Window {
    customCards?: { type: string; name: string; description: string; preview?: boolean; documentationURL?: string }[];
  }
}

const CARDS: [string, CustomElementConstructor, string, string][] = [
  ['rugby-live-direct-card', RugbyLiveDirectCard, 'Rugby Live – Direct',
    'Tableau de score plein écran, bandeau des matchs et animations des actions (essais, cartons…).'],
];

for (const [tag, cls, name, description] of CARDS) {
  if (!customElements.get(tag)) customElements.define(tag, cls);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === tag)) {
    window.customCards.push({ type: tag, name, description, documentationURL: 'https://github.com/Kenny3231/rugby_live-ha' });
  }
}
