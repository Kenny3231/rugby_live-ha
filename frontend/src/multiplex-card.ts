// rugby-live-multiplex-card: every match of the day of one or more competitions, live
// scores, minute, last event; favourite teams in bold.
import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import type { Hass } from './hass';
import { COMP, LIVE, RugbyEntities, baseStyles, deviceSelector, hhmm, logo, watchedChanged, type Attrs } from './common';

interface MultiplexConfig {
  type: string;
  devices?: string[]; // competition devices (default: all)
  show_finished?: boolean;
  compact?: boolean;
}

export class RugbyLiveMultiplexCard extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true } };
  hass?: Hass;
  private _config: MultiplexConfig = { type: 'custom:rugby-live-multiplex-card' };

  setConfig(config: MultiplexConfig) {
    this._config = config;
  }

  // Explicit defaults: the visual editor shows a missing boolean as off.
  static getStubConfig() {
    return { show_finished: true };
  }

  static getConfigForm() {
    const labels: Record<string, string> = {
      devices: 'Compétitions (appareils)', show_finished: 'Afficher les matchs terminés', compact: 'Compact',
    };
    return {
      schema: [
        { name: 'devices', selector: { device: { ...deviceSelector.device, multiple: true } } },
        { type: 'grid', name: '', schema: ['show_finished', 'compact'].map((name) => ({ name, selector: { boolean: {} } })) },
      ],
      computeLabel: (s: { name: string }) => labels[s.name],
      computeHelper: (s: { name: string }) => (s.name === 'devices' ? 'Vide : toutes les compétitions.' : undefined),
    };
  }

  getCardSize() {
    return 5;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  private _ids(ents: RugbyEntities) {
    const devices = this._config.devices?.length ? this._config.devices : ents.competitions();
    return devices.map((d) => ents.pick(d, 'live_matches')).filter((id): id is string => !!id);
  }

  protected shouldUpdate(changed: PropertyValues<this>) {
    if (!changed.has('hass') || changed.size > 1 || !this.hass) return true;
    return watchedChanged(changed.get('hass') as Hass | undefined, this.hass, this._ids(new RugbyEntities(this.hass)));
  }

  protected render() {
    if (!this.hass) return nothing;
    const cfg = { show_finished: true, compact: false, ...this._config };
    const ents = new RugbyEntities(this.hass);
    const fav = new Set(ents.teams().map((d) => ents.teamId(d)).filter(Boolean));
    const groups = this._ids(ents)
      .map((id) => (this.hass!.states[id]?.attributes.matches ?? []) as Attrs[])
      .map((ms) => ms.filter((m) => cfg.show_finished || m.status !== 'finished'))
      .filter((ms) => ms.length);
    const body = groups.length
      ? groups.map((ms) => html`<div class="rl-group">
          <div class="rl-h"><span>${COMP[ms[0].competition] || ''}</span>
            <span>${ms.some((m) => LIVE.includes(m.status)) ? html`<span class="rl-live">LIVE</span>` : nothing}</span></div>
          ${ms.map((m) => this._match(m, fav))}</div>`)
      : html`<div class="rl-empty">Aucun match aujourd'hui</div>`;
    return html`<ha-card class=${cfg.compact ? 'rl-compact' : ''}>${body}</ha-card>`;
  }

  private _match(m: Attrs, fav: Set<string | undefined>) {
    const live = LIVE.includes(m.status);
    const when = m.status === 'half_time' ? 'MT'
      : live ? m.minute || ''
      : m.status === 'finished' ? 'Fin'
      : m.status === 'scheduled' ? hhmm(new Date(m.kickoff)) : '';
    const score = m.status === 'scheduled' ? html`<span class="rl-muted">-</span>` : html`${m.home_score} - ${m.away_score}`;
    return html`<div class="rl-match ${live ? 'rl-on' : ''}">
      <div class="rl-when ${live ? 'rl-red' : ''}">${when}</div>
      <div class="rl-t ${fav.has(m.home_id) ? 'rl-fav' : ''}">${logo(m.home_logo, m.home_name, m.home_color)}<span>${m.home_name}</span></div>
      <div class="rl-sc ${m.provisional ? 'rl-prov' : ''}">${score}</div>
      <div class="rl-t rl-r ${fav.has(m.away_id) ? 'rl-fav' : ''}"><span>${m.away_name}</span>${logo(m.away_logo, m.away_name, m.away_color)}</div>
      ${live && m.last_event ? html`<div class="rl-ev">${m.last_event}</div>` : nothing}
      ${m.status === 'scheduled' && m.channel ? html`<div class="rl-ev">📺 ${m.channel}</div>` : nothing}
    </div>`;
  }

  static styles = [baseStyles, css`
    .rl-group + .rl-group { margin-top: 16px; }
    .rl-match { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto minmax(0, 1fr); align-items: center;
      gap: 4px 10px; padding: 8px 0; border-top: 1px solid var(--divider-color); }
    .rl-when { font-size: 12px; font-weight: 700; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; }
    .rl-red { color: #dc2626; }
    .rl-t { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 14px; }
    .rl-t span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rl-r { justify-content: flex-end; text-align: right; }
    .rl-t .rl-logo { width: 26px; height: 26px; }
    .rl-t .rl-init { font-size: 9px; }
    .rl-sc { font-weight: 800; font-size: 17px; font-variant-numeric: tabular-nums; white-space: nowrap; text-align: center; min-width: 52px; }
    .rl-prov { color: var(--warning-color, #f59e0b); }
    .rl-ev { grid-column: 2 / -1; font-size: 12px; color: var(--secondary-text-color); text-align: center; }
    .rl-compact .rl-match { padding: 5px 0; }
    .rl-compact .rl-t .rl-logo { width: 20px; height: 20px; }
  `];
}
