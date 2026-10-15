// rugby-live-scoreboard-card: compact score of a favourite team (or of the followed match):
// current match, else next match; counters, cards, sin bin, colour flash on each new event.
import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import type { Hass, HassEntity } from './hass';
import {
  BREAKDOWN, COMP, LIVE, RugbyEntities, baseStyles, deviceSelector, logo, untilKickoff, usable, watchedChanged,
  type Attrs, type Counters,
} from './common';

interface ScoreboardConfig {
  type: string;
  device?: string;
  show_logos?: boolean;
  show_counters?: boolean;
  compact?: boolean;
}

const KEYS = ['match_status', 'score', 'minute', 'last_event', 'sin_bin', 'next_match'];

export class RugbyLiveScoreboardCard extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true } };
  hass?: Hass;
  private _config: ScoreboardConfig = { type: 'custom:rugby-live-scoreboard-card' };

  setConfig(config: ScoreboardConfig) {
    this._config = config;
  }

  // Explicit defaults: the visual editor shows a missing boolean as off.
  static getStubConfig() {
    return { show_logos: true, show_counters: true };
  }

  static getConfigForm() {
    const labels: Record<string, string> = {
      device: 'Équipe (appareil)', show_logos: 'Logos', show_counters: 'Compteurs (essais, cartons…)', compact: 'Compact',
    };
    return {
      schema: [
        { name: 'device', selector: deviceSelector },
        { type: 'grid', name: '', schema: ['show_logos', 'show_counters', 'compact'].map((name) => ({ name, selector: { boolean: {} } })) },
      ],
      computeLabel: (s: { name: string }) => labels[s.name],
      computeHelper: (s: { name: string }) => (s.name === 'device' ? 'Vide : première équipe favorite.' : undefined),
    };
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  private _device(ents: RugbyEntities) {
    return this._config.device || ents.teams()[0] || ents.followed();
  }

  protected shouldUpdate(changed: PropertyValues<this>) {
    if (!changed.has('hass') || changed.size > 1 || !this.hass) return true;
    const ents = new RugbyEntities(this.hass);
    const dev = this._device(ents);
    return watchedChanged(changed.get('hass') as Hass | undefined, this.hass, KEYS.map((k) => ents.pick(dev, k)));
  }

  protected render() {
    if (!this.hass) return nothing;
    const cfg = { show_logos: true, show_counters: true, compact: false, ...this._config };
    const ents = new RugbyEntities(this.hass);
    const dev = this._device(ents);
    const status = ents.state(dev, 'match_status');
    const s = status?.state ?? 'no_match';
    const card = (body: unknown) => html`<ha-card class=${cfg.compact ? 'rl-compact' : ''}>${body}</ha-card>`;

    if (!status || s === 'no_match' || s === 'unavailable') {
      const next = ents.state(dev, 'next_match');
      if (!usable(next)) return card(html`<div class="rl-empty">Aucun match prévu</div>`);
      const n = next!.attributes;
      const home = n.home_away === 'home';
      const [h, w] = home ? ['team', 'opponent'] : ['opponent', 'team'];
      return card(html`<div class="rl-h"><span>Prochain match • ${COMP[n.competition] || ''}</span></div>
        ${this._row(cfg.show_logos, n[`${h}_logo`], n[`${h}_name`], n[`${h}_color`], html`<span class="rl-vs">VS</span>`, n[`${w}_logo`], n[`${w}_name`], n[`${w}_color`])}
        <div class="rl-foot">${untilKickoff(new Date(next!.state))}${n.channel ? ` • 📺 ${n.channel}` : ''}</div>`);
    }

    const sa: Attrs = status.attributes;
    const a: Attrs = ents.state(dev, 'score')?.attributes ?? {};
    const minute: string = ents.state(dev, 'minute')?.attributes.display ?? '';
    const live = LIVE.includes(s);
    const badge = s === 'half_time' ? html`<span class="rl-badge">MI-TEMPS</span>`
      : live ? html`<span class="rl-live">LIVE</span> <b class="rl-min">${minute}</b>`
      : s === 'finished' ? html`<span class="rl-badge">TERMINÉ</span>`
      : s === 'scheduled' ? html`<span>${untilKickoff(new Date(sa.kickoff))}</span>` : html`<span>${s}</span>`;
    const score = s === 'scheduled'
      ? html`<span class="rl-vs">VS</span>`
      : html`<span class=${a.provisional ? 'rl-prov' : ''}>${a.home_score ?? 0}<span class="rl-dash">-</span>${a.away_score ?? 0}</span>`;
    const cnt: { home?: Counters; away?: Counters } = a.counters ?? {};
    const sinbin = this._sinbin(ents.state(dev, 'sin_bin'), sa.home_away);
    const counters = cfg.show_counters && s !== 'scheduled'
      ? html`<div class="rl-cnt"><div>${this._counters(cnt.home)}</div><div></div><div>${this._counters(cnt.away)}</div></div>`
      : nothing;
    return card(html`${this._flash(ents.state(dev, 'last_event'), a, sa.home_away)}
      <div class="rl-h"><span>${COMP[sa.competition] || ''}</span><span>${badge}</span></div>
      ${this._row(cfg.show_logos, a.home_logo, a.home_name, a.home_color, score, a.away_logo, a.away_name, a.away_color)}
      ${counters}
      ${sinbin.length ? html`<div class="rl-sinbin">${sinbin.map((p) => html`<span><i class="rl-yc"></i>${p}</span>`)}</div>` : nothing}
      ${s === 'scheduled' && (sa.venue || sa.channel)
        ? html`<div class="rl-foot">${[sa.venue, sa.channel && `📺 ${sa.channel}`].filter(Boolean).join(' • ')}</div>`
        : nothing}`);
  }

  private _row(logos: boolean, hl: string, hn: string, hc: string, mid: unknown, al: string, an: string, ac: string) {
    return html`<div class="rl-row">
      <div class="rl-team">${logos ? logo(hl, hn, hc) : nothing}<span>${hn || ''}</span></div>
      <div class="rl-score">${mid}</div>
      <div class="rl-team rl-away"><span>${an || ''}</span>${logos ? logo(al, an, ac) : nothing}</div>
    </div>`;
  }

  private _counters(c?: Counters) {
    const parts = BREAKDOWN.filter(([k]) => c?.[k]).map(([k, one, many]) => html`<span><b>${c![k]}</b> ${c![k] > 1 ? many : one}</span>`);
    const cards = [
      ...Array.from({ length: c?.yellow_card ?? 0 }, () => html`<i class="rl-yc" title="Carton jaune"></i>`),
      ...Array.from({ length: c?.red_card ?? 0 }, () => html`<i class="rl-rc" title="Carton rouge"></i>`),
    ];
    return html`${parts}${cards.length ? html`<span class="rl-cards">${cards}</span>` : nothing}`;
  }

  /** Players in the sin bin, home side first: "Dupont → 52'". */
  private _sinbin(sb: HassEntity | undefined, homeAway?: string): string[] {
    if (!sb || sb.state !== 'on') return [];
    const at = sb.attributes;
    const fmt = (p: Attrs) => `${p.name || 'Joueur'} → ${p.until_minute}'`;
    if (at.home_players || at.away_players) return [...(at.home_players ?? []), ...(at.away_players ?? [])].map(fmt);
    const [first, second] = homeAway === 'away' ? ['opponent_players', 'players'] : ['players', 'opponent_players'];
    return [...(at[first] ?? []), ...(at[second] ?? [])].map(fmt);
  }

  /** Colour flash for a new event (only while it is fresh, not on page load). */
  private _flash(le: HassEntity | undefined, a: Attrs, homeAway?: string) {
    if (!le?.last_changed || Date.now() - Date.parse(le.last_changed) > 4000) return nothing;
    const side = le.attributes.side;
    const home = side === 'home' || (side === 'team' && homeAway !== 'away') || (side === 'opponent' && homeAway === 'away');
    const color = side ? (home ? a.home_color : a.away_color) : null;
    return keyed(le.last_changed, html`<div class="rl-flash" style="--c:${color || 'var(--primary-color)'}"></div>`);
  }

  static styles = [baseStyles, css`
    .rl-row { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 12px; }
    .rl-team { display: flex; align-items: center; gap: 10px; min-width: 0; font-weight: 700; font-size: 15px; }
    .rl-team span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rl-away { justify-content: flex-end; text-align: right; }
    .rl-score { font-size: 34px; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; line-height: 1; }
    .rl-dash { color: var(--secondary-text-color); margin: 0 6px; }
    .rl-vs { color: var(--secondary-text-color); font-size: 20px; }
    .rl-prov { color: var(--warning-color, #f59e0b); }
    .rl-min { color: var(--primary-text-color); margin-left: 4px; }
    .rl-badge { background: var(--secondary-background-color); border-radius: 999px; padding: 1px 8px; }
    .rl-cnt { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 12px; margin-top: 10px;
      font-size: 12px; color: var(--secondary-text-color); }
    .rl-cnt > div { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; }
    .rl-cnt > div:last-child { justify-content: flex-end; }
    .rl-cnt b { color: var(--primary-text-color); }
    .rl-cards { display: inline-flex; gap: 3px; }
    .rl-yc, .rl-rc { display: inline-block; width: 9px; height: 13px; border-radius: 2px; background: #eab308; vertical-align: -2px; margin-right: 4px; }
    .rl-rc { background: #dc2626; }
    .rl-sinbin { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 8px; font-size: 13px; }
    .rl-foot { margin-top: 10px; font-size: 13px; color: var(--secondary-text-color); text-align: center; }
    .rl-flash { position: absolute; inset: 0; pointer-events: none; background: var(--c); opacity: 0; animation: rl-flash 1.6s ease-out; }
    @keyframes rl-flash { 15% { opacity: 0.35; } 100% { opacity: 0; } }
    .rl-compact { padding: 10px 12px; }
    .rl-compact .rl-logo { width: 28px; height: 28px; }
    .rl-compact .rl-score { font-size: 26px; }
    .rl-compact .rl-team { font-size: 13px; }
  `];
}
