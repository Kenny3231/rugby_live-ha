// rugby-live-timeline-card: events of the match, newest first (minute, icon, player, team
// colour). Source: the `events` attribute of the device's last event sensor.
import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import type { Hass } from './hass';
import { COMP, RugbyEntities, baseStyles, teamSelector, watchedChanged, type Attrs } from './common';

interface TimelineConfig {
  type: string;
  device?: string; // default: "Match suivi"
  show_subs?: boolean;
  limit?: number;
}

const ICON: Record<string, string> = {
  try: 'mdi:rugby', conversion: 'mdi:numeric-2-circle', penalty_goal: 'mdi:numeric-3-circle',
  drop_goal: 'mdi:numeric-3-box', yellow_card: 'mdi:card', red_card: 'mdi:card',
  sub_on: 'mdi:swap-horizontal', sub_off: 'mdi:swap-horizontal',
};
const ICON_COLOR: Record<string, string> = { yellow_card: '#eab308', red_card: '#dc2626' };

export class RugbyLiveTimelineCard extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true } };
  hass?: Hass;
  private _config: TimelineConfig = { type: 'custom:rugby-live-timeline-card' };

  setConfig(config: TimelineConfig) {
    this._config = config;
  }

  static getStubConfig() {
    return {};
  }

  static getConfigForm() {
    const labels: Record<string, string> = {
      device: 'Équipe favorite ou Match suivi', show_subs: 'Afficher les remplacements', limit: "Nombre d'actions",
    };
    return {
      schema: [
        { name: 'device', selector: teamSelector },
        { type: 'grid', name: '', schema: [
          { name: 'show_subs', selector: { boolean: {} } },
          { name: 'limit', selector: { number: { min: 3, max: 60, mode: 'box' } } },
        ] },
      ],
      computeLabel: (s: { name: string }) => labels[s.name],
      computeHelper: (s: { name: string }) => (s.name === 'device' ? 'Équipe favorite ou « Match suivi ». Vide : Match suivi.' : undefined),
    };
  }

  getCardSize() {
    return 5;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  private _device(ents: RugbyEntities) {
    return this._config.device || ents.followed();
  }

  protected shouldUpdate(changed: PropertyValues<this>) {
    if (!changed.has('hass') || changed.size > 1 || !this.hass) return true;
    const ents = new RugbyEntities(this.hass);
    const dev = this._device(ents);
    return watchedChanged(changed.get('hass') as Hass | undefined, this.hass, [ents.pick(dev, 'last_event'), ents.pick(dev, 'score')]);
  }

  protected render() {
    if (!this.hass) return nothing;
    const cfg = { show_subs: false, limit: 15, ...this._config };
    const ents = new RugbyEntities(this.hass);
    const dev = this._device(ents);
    const a: Attrs = ents.state(dev, 'score')?.attributes ?? {};
    const sa: Attrs = ents.state(dev, 'match_status')?.attributes ?? {};
    const events = ((ents.state(dev, 'last_event')?.attributes.events ?? []) as Attrs[])
      .filter((e) => cfg.show_subs || !String(e.type).startsWith('sub_'))
      .slice(-cfg.limit)
      .reverse();
    const color = (side?: string) => (side === 'home' ? a.home_color : side === 'away' ? a.away_color : null) || 'var(--divider-color)';
    const title = a.home_name ? `${a.home_name} – ${a.away_name}` : '';
    return html`<ha-card>
      <div class="rl-h"><span>${COMP[sa.competition] ? `${COMP[sa.competition]} • ` : ''}${title}</span></div>
      ${events.length
        ? html`<ol class="rl-list">${events.map((e) => html`<li style="--c:${color(e.side)}">
            <span class="rl-min">${e.minute != null ? `${e.minute}'` : ''}</span>
            <ha-icon icon=${ICON[e.type] || 'mdi:circle-small'} style=${ICON_COLOR[e.type] ? `color:${ICON_COLOR[e.type]}` : ''}></ha-icon>
            <span class="rl-what"><b>${e.label}</b>${e.player ? html` — ${e.player}` : nothing}
              <small>${e.team || ''}</small></span></li>`)}</ol>`
        : html`<div class="rl-empty">Aucune action pour le moment</div>`}
    </ha-card>`;
  }

  static styles = [baseStyles, css`
    .rl-list { list-style: none; margin: 0; padding: 0; }
    .rl-list li { display: grid; grid-template-columns: 36px 24px minmax(0, 1fr); align-items: center; gap: 10px;
      padding: 7px 0 7px 10px; border-left: 4px solid var(--c); border-top: 1px solid var(--divider-color); }
    .rl-list li:first-child { border-top: none; }
    .rl-min { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--secondary-text-color); }
    ha-icon { --mdc-icon-size: 22px; color: var(--primary-text-color); }
    .rl-what { min-width: 0; font-size: 14px; }
    .rl-what small { display: block; color: var(--secondary-text-color); font-size: 12px; }
  `];
}
