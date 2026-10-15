// Shared by the cards: entity lookup, labels, formatting, base styles.
import { css, html, type TemplateResult } from 'lit';
import type { Hass, HassEntity, HassEntityEntry } from './hass';

export type Attrs = Record<string, any>;
export type Counters = Record<string, number>;

export const COMP: Record<string, string> = { top14: 'TOP 14', champions_cup: 'CHAMPIONS CUP', challenge_cup: 'CHALLENGE CUP' };
export const STATUS: Record<string, string> = {
  scheduled: 'À venir', first_half: '1re mi-temps', half_time: 'Mi-temps', second_half: '2e mi-temps',
  extra_time: 'Prolongations', finished: 'Terminé', postponed: 'Reporté', cancelled: 'Annulé', unknown: '',
};
export const LIVE = ['first_half', 'half_time', 'second_half', 'extra_time'];
export const BREAKDOWN: [string, string, string][] = [
  ['try', 'essai', 'essais'], ['conversion', 'transfo', 'transfos'],
  ['penalty_goal', 'pénalité', 'pénalités'], ['drop_goal', 'drop', 'drops'],
];

export const hhmm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
export const longDate = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
export const hide = (e: Event) => ((e.target as HTMLElement).style.display = 'none');
export const usable = (e?: HassEntity) => !!e && !['unknown', 'unavailable'].includes(e.state);

/** "dans 2 h 15", "dans 12 min", else the date. */
export function untilKickoff(kickoff: Date, now = new Date()): string {
  const min = Math.round((kickoff.getTime() - now.getTime()) / 60000);
  if (min <= 0) return `Coup d'envoi ${hhmm(kickoff)}`;
  if (min < 60) return `Coup d'envoi dans ${min} min`;
  if (min < 12 * 60) return `Coup d'envoi dans ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
  return `${longDate(kickoff)} • ${hhmm(kickoff)}`;
}

/** Text colour readable on a team colour: dark on yellow or sky blue, white otherwise. */
export function ink(color: string | null | undefined): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color || '');
  if (!m) return '#fff';
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#0b1220' : '#fff';
}

export function logo(url: string | null | undefined, name: string | undefined, color: string | undefined, cls = 'rl-logo'): TemplateResult {
  return url
    ? html`<img class=${cls} src=${url} alt="" @error=${hide} />`
    : html`<div class="${cls} rl-init" style="background:${color || '#334155'};color:${ink(color)}">${(name || '?').slice(0, 3).toUpperCase()}</div>`;
}

/** One line per team: logo, full name (wraps, never cut), score once the match started. */
export function teamLine(m: Attrs, p: 'home' | 'away', fav: Set<string | undefined>): TemplateResult {
  const o = p === 'home' ? 'away' : 'home';
  const lose = m.status === 'finished' && m[`${p}_score`] < m[`${o}_score`];
  return html`<div class="rl-t ${fav.has(m[`${p}_id`]) ? 'rl-fav' : ''} ${lose ? 'rl-lose' : ''}">
    ${logo(m[`${p}_logo`], m[`${p}_name`], m[`${p}_color`])}<span>${m[`${p}_name`]}</span>
    <b class=${m.provisional ? 'rl-prov' : ''}>${m.status === 'scheduled' ? '' : m[`${p}_score`]}</b></div>`;
}

export const teamLineStyles = css`
  .rl-ts { display: grid; gap: 4px; min-width: 0; }
  .rl-t { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 14px; line-height: 1.2; }
  .rl-t span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .rl-t b { font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums; min-width: 24px; text-align: right; }
  .rl-t .rl-logo { width: 24px; height: 24px; }
  .rl-t .rl-init { font-size: 9px; }
  .rl-lose { color: var(--secondary-text-color); }
  .rl-prov { color: var(--warning-color, #f59e0b); }
`;

/** Integration entities, found by translation key (works whatever the language or names). */
export class RugbyEntities {
  readonly all: HassEntityEntry[];

  constructor(readonly hass: Hass) {
    this.all = Object.values(hass.entities ?? {}).filter((e) => e.platform === 'rugby_live');
  }

  /** Device from a card option: an id, or "followed" / "favorite" (handy in YAML). */
  resolve(device: string | null | undefined): string | undefined {
    if (device === 'followed') return this.followed();
    if (device === 'favorite') return this.teams()[0];
    return device || undefined;
  }

  pick(device: string | null | undefined, key: string): string | undefined {
    const dev = this.resolve(device);
    return dev ? this.all.find((e) => e.device_id === dev && e.translation_key === key)?.entity_id : undefined;
  }

  state(device: string | null | undefined, key: string): HassEntity | undefined {
    const id = this.pick(device, key);
    return id ? this.hass.states[id] : undefined;
  }

  devicesWith(key: string): string[] {
    return [...new Set(this.all.filter((e) => e.translation_key === key).map((e) => e.device_id || ''))].filter(Boolean);
  }

  /** "Match suivi" device: the one with the animation sensor. */
  followed(): string | undefined {
    return this.devicesWith('animation')[0];
  }

  /** Favourite team devices: a next match sensor and a score sensor, not the followed one. */
  teams(): string[] {
    const scores = new Set(this.devicesWith('score'));
    const followed = this.followed();
    return this.devicesWith('next_match').filter((d) => scores.has(d) && d !== followed);
  }

  /** Competition devices: the ones with a live matches sensor. */
  competitions(): string[] {
    return this.devicesWith('live_matches');
  }

  /** ESPN team id of a favourite team device (from its status or next match sensor). */
  teamId(device?: string): string | undefined {
    return this.state(device, 'match_status')?.attributes.team_id ?? this.state(device, 'next_match')?.attributes.team_id;
  }
}

/** Re-render only when one of the watched entities changed. */
export function watchedChanged(oldHass: Hass | undefined, hass: Hass | undefined, ids: (string | undefined)[]): boolean {
  if (!oldHass || !hass || oldHass.entities !== hass.entities) return true;
  return ids.some((id) => id && oldHass.states[id] !== hass.states[id]);
}

export const deviceSelector = { device: { filter: { integration: 'rugby_live' } } };
/** Favourite teams and "Match suivi": the only devices with binary sensors. */
export const teamSelector = { device: { entity: { integration: 'rugby_live', domain: 'binary_sensor' } } };

// Theme-aware base for the small cards (HA variables: light and dark themes).
export const baseStyles = css`
  :host { display: block; }
  ha-card { padding: 16px; overflow: hidden; position: relative; }
  .rl-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px;
    font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--secondary-text-color); }
  .rl-live { display: inline-block; background: #dc2626; color: #fff; border-radius: 999px; padding: 1px 8px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.05em; animation: rl-pulse 1.4s infinite; }
  @keyframes rl-pulse { 50% { opacity: 0.45; } }
  .rl-logo { width: 40px; height: 40px; object-fit: contain; flex: none; }
  .rl-init { border-radius: 50%; display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 800; font-size: 12px; }
  .rl-empty { color: var(--secondary-text-color); text-align: center; padding: 8px 0; }
  .rl-muted { color: var(--secondary-text-color); }
  .rl-fav { font-weight: 700; }
  @media (prefers-reduced-motion: reduce) { .rl-live, .rl-flash { animation: none; } }
`;
