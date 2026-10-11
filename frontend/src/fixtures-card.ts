// rugby-live-fixtures-card: upcoming matches and recent results of a competition or of a
// favourite team, grouped by day. Source: the `fixtures` attribute of the competition
// next match sensors.
import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import type { Hass } from './hass';
import { COMP, LIVE, RugbyEntities, baseStyles, deviceSelector, hhmm, logo, longDate, watchedChanged, type Attrs } from './common';

interface FixturesConfig {
  type: string;
  device?: string; // competition or favourite team device (default: first competition)
  count_upcoming?: number;
  count_results?: number;
}

export class RugbyLiveFixturesCard extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true } };
  hass?: Hass;
  private _config: FixturesConfig = { type: 'custom:rugby-live-fixtures-card' };

  setConfig(config: FixturesConfig) {
    this._config = config;
  }

  static getStubConfig() {
    return {};
  }

  static getConfigForm() {
    const labels: Record<string, string> = {
      device: 'Compétition ou équipe (appareil)', count_upcoming: 'Matchs à venir', count_results: 'Derniers résultats',
    };
    return {
      schema: [
        { name: 'device', selector: deviceSelector },
        { type: 'grid', name: '', schema: [
          { name: 'count_upcoming', selector: { number: { min: 0, max: 30, mode: 'box' } } },
          { name: 'count_results', selector: { number: { min: 0, max: 30, mode: 'box' } } },
        ] },
      ],
      computeLabel: (s: { name: string }) => labels[s.name],
      computeHelper: (s: { name: string }) => (s.name === 'device' ? 'Vide : première compétition.' : undefined),
    };
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  private _sources(ents: RugbyEntities) {
    const device = this._config.device || ents.competitions()[0];
    const competition = ents.pick(device, 'live_matches') !== undefined;
    const ids = (competition ? [device] : ents.competitions()).map((d) => ents.pick(d, 'next_match'));
    return { device, competition, ids: ids.filter((id): id is string => !!id) };
  }

  protected shouldUpdate(changed: PropertyValues<this>) {
    if (!changed.has('hass') || changed.size > 1 || !this.hass) return true;
    return watchedChanged(changed.get('hass') as Hass | undefined, this.hass, this._sources(new RugbyEntities(this.hass)).ids);
  }

  protected render() {
    if (!this.hass) return nothing;
    const cfg = { count_upcoming: 6, count_results: 4, ...this._config };
    const ents = new RugbyEntities(this.hass);
    const src = this._sources(ents);
    const team = src.competition ? undefined : ents.teamId(src.device);
    const fav = new Set(ents.teams().map((d) => ents.teamId(d)).filter(Boolean));
    const seen = new Set<string>();
    const all = src.ids
      .flatMap((id) => (this.hass!.states[id]?.attributes.fixtures ?? []) as Attrs[])
      .filter((m) => !team || m.home_id === team || m.away_id === team)
      .filter((m) => !seen.has(m.match_id) && !!seen.add(m.match_id))
      .sort((x, y) => Date.parse(x.kickoff) - Date.parse(y.kickoff));
    const live = all.filter((m) => LIVE.includes(m.status));
    const upcoming = all.filter((m) => m.status === 'scheduled').slice(0, cfg.count_upcoming);
    const results = all.filter((m) => m.status === 'finished').slice(-cfg.count_results).reverse();
    const title = src.competition
      ? COMP[all[0]?.competition] || 'Calendrier'
      : this.hass.states[ents.pick(src.device, 'next_match') ?? '']?.attributes.team_name || 'Calendrier';
    const section = (label: string, ms: Attrs[]) => (ms.length
      ? html`<div class="rl-sec">${label}</div>${this._days(ms, fav, !src.competition)}` : nothing);
    return html`<ha-card>
      <div class="rl-h"><span>${title}</span>${live.length ? html`<span class="rl-live">LIVE</span>` : nothing}</div>
      ${all.length ? html`${section('En direct', live)}${section('À venir', upcoming)}${section('Résultats', results)}`
        : html`<div class="rl-empty">Aucun match dans les prochains jours</div>`}
    </ha-card>`;
  }

  private _days(ms: Attrs[], fav: Set<string | undefined>, showComp: boolean) {
    let day = '';
    return ms.map((m) => {
      const d = new Date(m.kickoff);
      const label = longDate(d);
      const header = label !== day ? html`<div class="rl-day">${label}</div>` : nothing;
      day = label;
      const mid = m.status === 'scheduled' ? hhmm(d) : `${m.home_score} - ${m.away_score}`;
      return html`${header}<div class="rl-m">
        <div class="rl-t ${fav.has(m.home_id) ? 'rl-fav' : ''}">${logo(m.home_logo, m.home_name, m.home_color)}<span>${m.home_name}</span></div>
        <div class="rl-mid ${m.status === 'scheduled' ? 'rl-time' : ''} ${LIVE.includes(m.status) ? 'rl-red' : ''}">${mid}</div>
        <div class="rl-t rl-r ${fav.has(m.away_id) ? 'rl-fav' : ''}"><span>${m.away_name}</span>${logo(m.away_logo, m.away_name, m.away_color)}</div>
        ${(showComp && m.competition) || (m.status === 'scheduled' && m.channel)
          ? html`<div class="rl-sub">${[showComp && COMP[m.competition], m.status === 'scheduled' && m.channel && `📺 ${m.channel}`].filter(Boolean).join(' • ')}</div>`
          : nothing}
      </div>`;
    });
  }

  static styles = [baseStyles, css`
    .rl-sec { margin: 12px 0 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--primary-color); }
    .rl-sec:first-of-type { margin-top: 0; }
    .rl-day { margin-top: 6px; font-size: 12px; color: var(--secondary-text-color); }
    .rl-day::first-letter { text-transform: uppercase; }
    .rl-m { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 2px 10px;
      padding: 6px 0; border-bottom: 1px solid var(--divider-color); }
    .rl-t { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 14px; }
    .rl-t span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rl-r { justify-content: flex-end; text-align: right; }
    .rl-t .rl-logo { width: 24px; height: 24px; }
    .rl-t .rl-init { font-size: 9px; }
    .rl-mid { font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; text-align: center; min-width: 52px; }
    .rl-time { font-weight: 600; color: var(--secondary-text-color); }
    .rl-red { color: #dc2626; }
    .rl-sub { grid-column: 1 / -1; text-align: center; font-size: 12px; color: var(--secondary-text-color); }
  `];
}
