// rugby-live-direct-card: full-screen "Direct" view (scoreboard, ticker, event animations).
// Port of the button-card template of examples/dashboard.yaml; entities are found by their
// translation key on the chosen device (a favourite team, or "Match suivi"), so the card
// works whatever the language or names.
import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { directStyles } from './styles';
import type { Hass, HassEntity } from './hass';
import {
  BREAKDOWN, COMP, LIVE, RugbyEntities, STATUS, hhmm, hide, ink, logo, longDate, teamSelector, usable,
  type Attrs, type Counters,
} from './common';

export interface DirectConfig {
  type: string;
  device?: string; // favourite team or "Match suivi" device (default: first favourite team)
  ticker?: boolean;
  watermark?: boolean;
  breakdown?: boolean;
  bonus?: boolean;
  animations?: boolean;
  force_motion?: boolean; // play animations even when the device asks to reduce motion
}

const DEFAULTS = { ticker: true, watermark: true, breakdown: true, bonus: true, animations: true, force_motion: false };
const WM: Record<string, string> = { top14: 'Top 14', champions_cup: 'Champions Cup', challenge_cup: 'Challenge Cup' };
const PERIOD: Record<string, string> = { first_half: '1re MT', second_half: '2e MT', extra_time: 'PROLONG.' };
const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const TITLE: Record<string, string> = {
  try: 'ESSAI !', conversion: 'TRANSFORMATION', penalty_goal: 'PÉNALITÉ', drop_goal: 'DROP !',
  yellow_card: 'CARTON JAUNE', red_card: 'CARTON ROUGE', kickoff: "COUP D'ENVOI", half_time: 'MI-TEMPS',
  second_half: 'REPRISE', extra_time: 'PROLONGATIONS', full_time: 'FIN DU MATCH', revoked: 'ACTION ANNULÉE',
};
const KIND: Record<string, string> = {
  try: 'Essai', conversion: 'Transformation', penalty_goal: 'Pénalité', drop_goal: 'Drop',
  yellow_card: 'Carton jaune', red_card: 'Carton rouge',
};
const SCORING = ['try', 'conversion', 'penalty_goal', 'drop_goal'];

export class RugbyLiveDirectCard extends LitElement {
  static styles = directStyles;
  static properties = {
    hass: { attribute: false },
    isPanel: { attribute: false },
    _config: { state: true },
  };

  hass?: Hass;
  isPanel = false;
  private _config: DirectConfig = { type: 'custom:rugby-live-direct-card' };
  // Score bump: remembered between renders, deferred while an animation covers the board.
  private _score = { key: '', h: 0, a: 0, ph: false, pa: false, bh: 0, ba: 0 };
  // Animation timing on this screen's clock (see _overlay).
  private _born = Date.now();
  private _seen = { key: '', t0: 0 };

  setConfig(config: DirectConfig) {
    if (!config) throw new Error('Configuration invalide');
    this._config = config;
  }

  // Explicit defaults: the visual editor shows a missing boolean as off.
  static getStubConfig() {
    return { ...DEFAULTS };
  }

  static getConfigForm() {
    const bool = (name: string) => ({ name, selector: { boolean: {} } });
    const labels: Record<string, string> = {
      device: 'Équipe favorite ou Match suivi',
      ticker: 'Bandeau des autres matchs',
      watermark: 'Logo de la compétition en filigrane',
      breakdown: 'Détail des points (essais, transformations…)',
      bonus: 'Bonus Top 14',
      animations: 'Animations des actions',
      force_motion: "Animer même si l'appareil demande moins d'animations",
    };
    return {
      schema: [
        { name: 'device', selector: teamSelector },
        { type: 'grid', name: '', schema: ['ticker', 'watermark', 'breakdown', 'bonus', 'animations', 'force_motion'].map(bool) },
      ],
      computeLabel: (s: { name: string }) => labels[s.name],
      computeHelper: (s: { name: string }) => s.name === 'device'
        ? "Équipe à afficher : une équipe favorite (son match du moment, sinon son prochain match, toutes compétitions) ou « Match suivi » (le match choisi dans son sélecteur). Vide : première équipe favorite."
        : undefined,
    };
  }

  getCardSize() {
    return 8;
  }

  getGridOptions() {
    return { columns: 'full', min_columns: 6 };
  }

  private get cfg() {
    return { ...DEFAULTS, ...this._config };
  }

  // Entities of the integration, found by translation key on their device. Animations only
  // exist on "Match suivi": a team's screen shows them when they are about its match.
  private _ids() {
    const ents = new RugbyEntities(this.hass!);
    const followed = ents.followed();
    const teams = ents.teams();
    // Older configs could point at any device (a competition): fall back to the default.
    const chosen = ents.resolve(this._config.device);
    const device = chosen && (chosen === followed || teams.includes(chosen)) ? chosen : teams[0] || followed;
    const nextOf = device === followed ? teams[0] : device; // "Match suivi" has no next match
    return {
      status: ents.pick(device, 'match_status'),
      score: ents.pick(device, 'score'),
      minute: ents.pick(device, 'minute'),
      last: ents.pick(device, 'last_event'),
      anim: ents.pick(followed, 'animation'),
      next: ents.pick(nextOf, 'next_match'),
      live: ents.all.filter((e) => e.translation_key === 'live_matches').map((e) => e.entity_id),
    };
  }

  protected shouldUpdate(changed: PropertyValues<this>) {
    if (!changed.has('hass') || changed.size > 1) return true;
    const old = changed.get('hass') as Hass | undefined;
    if (!old || old.entities !== this.hass?.entities) return true;
    const ids = this._ids();
    return [ids.status, ids.score, ids.minute, ids.last, ids.anim, ids.next, ...ids.live]
      .some((id) => id && old.states[id] !== this.hass!.states[id]);
  }

  protected render() {
    if (!this.hass) return nothing;
    const c = this.cfg;
    const ids = this._ids();
    const st = (id?: string) => (id ? this.hass!.states[id] : undefined);
    const status = st(ids.status);
    const s = status ? status.state : 'no_match';
    const sa: Attrs = status?.attributes ?? {};
    const a: Attrs = st(ids.score)?.attributes ?? {};
    const animAll = st(ids.anim);
    const animMatch = animAll?.attributes.match_id;
    const anim = !animMatch || animMatch === sa.match_id ? animAll : undefined;
    const next = st(ids.next);
    const favId: string | undefined = next?.attributes.team_id;
    const wm = c.watermark && WM[sa.competition]
      ? html`<img class="rl-wm" src="/local/images/rugby/competitions/${encodeURIComponent(WM[sa.competition])}.svg" @error=${hide} />`
      : nothing;
    const overlay = c.animations ? this._overlay(anim, a, favId) : nothing;
    return html`<ha-card class=${this.isPanel ? 'rl-panelcard' : ''}>
      <div class="rl-box ${this.isPanel ? 'rl-panel' : ''}">
        <div class="rl-wrap ${c.force_motion ? '' : 'rl-calm'}">
          ${wm}${c.ticker ? this._ticker(sa, ids.live) : nothing}
          <div class="rl-main">${this._main(s, sa, a, next, anim)}</div>
          ${overlay}
        </div>
      </div>
    </ha-card>`;
  }

  private _ticker(sa: Attrs, liveIds: string[]) {
    let pool: Attrs[] = sa.matchday;
    if (!pool) pool = liveIds.flatMap((id) => this.hass!.states[id]?.attributes.matches ?? []);
    if (!pool.length) return nothing;
    const items = pool.map((x) => {
      const k = new Date(x.kickoff);
      return x.status === 'scheduled'
        ? html`${x.home_name} – ${x.away_name} <b>${DAYS[k.getDay()]} ${hhmm(k)}</b>`
        : html`${x.home_name} <b>${x.home_score} - ${x.away_score}</b> ${x.away_name}
            <span style="color:#f87171">${LIVE.includes(x.status) ? x.minute || '' : 'Fin'}</span>`;
    });
    const line = items.map((it, i) => html`${i ? html`&nbsp;&nbsp;•&nbsp;&nbsp;` : nothing}${it}`);
    const dur = Math.max(25, items.length * 7);
    const delay = ((Date.now() / 1000) % dur).toFixed(1);
    return html`<div class="rl-tick"><div class="rl-tick-in" style="animation-duration:${dur}s;animation-delay:-${delay}s">
      ${line} &nbsp;&nbsp;•&nbsp;&nbsp; ${line}</div></div>`;
  }

  private _main(s: string, sa: Attrs, a: Attrs, next: HassEntity | undefined, anim: HassEntity | undefined): TemplateResult {
    const fn = usable(next) ? next!.attributes : null;
    if (s === 'no_match') {
      if (!fn) return html`<div class="rl-state" style="color:#94a3b8">Aucun match pour le moment</div>`;
      const d = new Date(next!.state);
      const home = fn.home_away === 'home';
      const h = home ? [fn.team_logo, fn.team_name, fn.team_color] : [fn.opponent_logo, fn.opponent_name, fn.opponent_color];
      const w = home ? [fn.opponent_logo, fn.opponent_name, fn.opponent_color] : [fn.team_logo, fn.team_name, fn.team_color];
      return html`<div class="rl-comp">PROCHAIN MATCH DE ${(fn.team_name || '').toUpperCase()} • ${COMP[fn.competition] || ''}</div>
        <div class="rl-row">
          <div class="rl-team">${logo(h[0], h[1], h[2])}<div class="rl-name">${h[1] || ''}</div></div>
          <div class="rl-score"><span style="color:#64748b">VS</span></div>
          <div class="rl-team">${logo(w[0], w[1], w[2])}<div class="rl-name">${w[1] || ''}</div></div>
        </div>
        <div class="rl-state" style="color:#4ade80">${longDate(d)} • ${hhmm(d)}</div>
        <div class="rl-last">${fn.venue || ''}</div>
        ${fn.channel ? html`<div class="rl-chan">📺 ${fn.channel}</div>` : nothing}`;
    }

    const live = LIVE.includes(s);
    const ids = this._ids();
    const mn = ids.minute ? this.hass!.states[ids.minute] : undefined;
    const le = ids.last ? this.hass!.states[ids.last] : undefined;
    const minute: string = mn?.attributes.display ?? '';
    const chan = sa.channel && s !== 'finished' ? html`<div class="rl-chan">📺 ${sa.channel}</div>` : nothing;

    if (s === 'scheduled') {
      const ko = new Date(sa.kickoff);
      const today = ko.toDateString() === new Date().toDateString();
      const koText = today ? `Coup d'envoi ${hhmm(ko)}` : `${longDate(ko)} • ${hhmm(ko)}`;
      return html`<div class="rl-comp">${COMP[sa.competition] || ''}</div>
        <div class="rl-row">
          <div class="rl-team">${logo(a.home_logo, a.home_name, a.home_color)}<div class="rl-name">${a.home_name || ''}</div></div>
          <div class="rl-score"><span style="color:#64748b">VS</span></div>
          <div class="rl-team">${logo(a.away_logo, a.away_name, a.away_color)}<div class="rl-name">${a.away_name || ''}</div></div>
        </div>
        <div class="rl-state"><span style="color:#4ade80">${koText}</span></div>${chan}`;
    }

    // Last event line, only while fresh (3 min of play).
    const nowMin = mn && !isNaN(parseInt(mn.state)) ? parseInt(mn.state) : null;
    const evMin = le?.attributes.minute;
    const fresh = live && nowMin !== null && evMin != null && nowMin - evMin <= 3;
    const last = fresh && le && le.state && le.state !== 'unknown' ? html`<div class="rl-last">${le.state}</div>` : nothing;
    const provtag = a.provisional ? html`<div class="rl-provtag">SCORE EN ATTENTE DE VALIDATION</div>` : nothing;
    let nextLine: unknown = nothing;
    if (s === 'finished' && fn) {
      const d = new Date(next!.state);
      const vs = fn.home_away === 'home' ? `${fn.team_name} – ${fn.opponent_name}` : `${fn.opponent_name} – ${fn.team_name}`;
      nextLine = html`<div class="rl-next"><small>PROCHAIN MATCH • ${COMP[fn.competition] || ''}</small><b>${vs}</b><br />
        ${longDate(d)} • ${hhmm(d)}${fn.channel ? ` • 📺 ${fn.channel}` : ''}</div>`;
    }

    const hs: number = a.home_score ?? 0;
    const as: number = a.away_score ?? 0;
    const cnt: { home?: Counters; away?: Counters } = a.counters ?? {};
    const clock = live && s !== 'half_time'
      ? html`<span class="rl-live">LIVE</span><b>${minute}</b><small>${PERIOD[s] || ''}</small>`
      : html`<b>${s === 'half_time' ? 'MT' : s === 'finished' ? 'FIN' : ''}</b>
          <small>${s === 'half_time' ? 'MI-TEMPS' : (STATUS[s] || '').toUpperCase()}</small>`;
    const brk = (x?: Counters) => this.cfg.breakdown
      ? BREAKDOWN.filter(([k]) => x?.[k]).map(([k, one, many]) => html`<span><b>${x![k]}</b> ${x![k] > 1 ? many : one}</span>`)
      : nothing;
    // Top 14 bonus (2025-26 rules): winner with 3+ tries more = offensive, loser by 5 points
    // or less = defensive. Dashed while the match is on (it may still change).
    const bonus = (mine: number, theirs: number, tm: number, tt: number) => {
      if (!this.cfg.bonus || sa.competition !== 'top14') return nothing;
      const b = mine > theirs && tm - tt >= 3 ? 'BONUS OFFENSIF' : mine < theirs && theirs - mine <= 5 ? 'BONUS DÉFENSIF' : '';
      return b ? html`<span class="rl-bon ${s === 'finished' ? '' : 'rl-on'}">${b}</span>` : nothing;
    };
    const tries = (x?: Counters) => x?.try ?? 0;
    const bump = this._bump(`${a.home_id}-${a.away_id}`, hs, as, !!anim && anim.state !== 'idle');
    const prov = a.provisional ? 'rl-prov' : '';
    const scoreBlock = (side: 'h' | 'a', value: number, n: number) =>
      keyed(`${side}${n}`, html`<div class="rl-sbs rl-sbs${side} ${prov} ${n ? 'rl-bump' : ''}">${value}</div>`);
    return html`<div class="rl-comp">${COMP[sa.competition] || ''}</div>
      <div class="rl-sb" style="--hc:${a.home_color || '#334155'};--ac:${a.away_color || '#334155'}">
        <div class="rl-sbt rl-sbh ${ink(a.home_color) === '#fff' ? '' : 'rl-dark'}">${logo(a.home_logo, a.home_name, a.home_color, '')}<span>${a.home_name || ''}</span></div>
        ${scoreBlock('h', hs, bump.h)}
        <div class="rl-clock">${clock}</div>
        ${scoreBlock('a', as, bump.a)}
        <div class="rl-sbt rl-sba ${ink(a.away_color) === '#fff' ? '' : 'rl-dark'}"><span>${a.away_name || ''}</span>${logo(a.away_logo, a.away_name, a.away_color, '')}</div>
        <div class="rl-sbd rl-sbdh"><div>${brk(cnt.home)}</div>${bonus(hs, as, tries(cnt.home), tries(cnt.away))}</div>
        <div class="rl-sbd rl-sbda"><div>${brk(cnt.away)}</div>${bonus(as, hs, tries(cnt.away), tries(cnt.home))}</div>
      </div>
      ${provtag}${last}${chan}${nextLine}`;
  }

  // A changed score bumps once the full-screen animation is over: a new key re-creates
  // the score block with the bump class, so its CSS animation plays exactly once.
  private _bump(key: string, h: number, a: number, animOn: boolean) {
    const m = this._score;
    if (m.key !== key) Object.assign(m, { key, h, a, ph: false, pa: false });
    if (m.h !== h) m.ph = true;
    if (m.a !== a) m.pa = true;
    m.h = h;
    m.a = a;
    if (!animOn && m.ph) { m.bh++; m.ph = false; }
    if (!animOn && m.pa) { m.ba++; m.pa = false; }
    return { h: m.bh, a: m.ba };
  }

  private _overlay(an: HassEntity | undefined, a: Attrs, favId?: string) {
    const t = an ? an.state : 'idle';
    const aa: Attrs = an?.attributes ?? {};
    const durMs = (aa.duration || 20) * 1000;
    if (t === 'idle' || !aa.started_at) return nothing;
    // Age from this screen's own clock: a TV box or tablet clock a second behind HA's gave
    // a negative age, and the animation never showed. A new animation starts when the card
    // receives it; only right after the page load does HA's clock tell how far in it is.
    if (this._seen.key !== aa.started_at) {
      const serverAge = Math.max(0, Date.now() - Date.parse(aa.started_at));
      const live = Date.now() - this._born > 5000;
      this._seen = { key: aa.started_at, t0: Date.now() - (live ? 0 : serverAge) };
    }
    const age = Date.now() - this._seen.t0;
    if (isNaN(age) || age >= durMs) return nothing;
    const tid: string | undefined = aa.team_id;
    const home = !!tid && tid === a.home_id;
    const card = t === 'yellow_card' || t === 'red_card';
    const scoring = SCORING.includes(t);
    const info = !card && !scoring; // kickoff, half time, full time, cancelled event: text only
    const tcolor = home ? a.home_color : tid ? a.away_color : null;
    const tlogo = home ? a.home_logo : tid ? a.away_logo : null;
    const color = t === 'yellow_card' ? '#eab308' : t === 'red_card' ? '#dc2626' : (!info && tcolor) || '#334155';
    const fg = t === 'yellow_card' ? '#111' : ink(color);
    const special = !!favId && tid === favId && scoring;
    const media = `/local/rugby_live/anim/${special ? t + '_toulouse' : t}.mp4#t=${((age / 1000) % 6).toFixed(1)}`;
    const label = TITLE[t] || t;
    const min = aa.minute ? `${aa.minute}'` : '';
    const sec = age / 1000;
    // Background layers picked in the integration options (cards: whistle scene); offsets
    // add to the age, so a first render in the middle of an animation stays in phase.
    const bg: string[] = aa.background ?? [];
    const rings = [0, 0.8, 1.6].map((o) => html`<div class="rl-ring" style="animation-delay:-${(sec + o).toFixed(2)}s"></div>`);
    const cols = [color, '#ffffff', '#fbbf24'];
    const confetti = card || !bg.includes('confetti') ? nothing : Array.from({ length: 36 }, (_, i) =>
      html`<i class="rl-cf" style="left:${(i * 37) % 100}%;width:${(0.6 + (i % 3) * 0.3).toFixed(1)}cqw;background:${cols[i % 3]};animation-duration:${(3 + (i % 5) * 0.6).toFixed(1)}s;animation-delay:-${(sec + i * 0.53).toFixed(2)}s"></i>`);
    const back = card
      ? html`<div class="rl-strobe"></div>${rings}`
      : html`${bg.includes('rays') ? html`<div class="rl-burst" style="animation-duration:${durMs}ms"></div><div class="rl-rays2"></div>` : nothing}
          ${bg.includes('beams') ? html`<div class="rl-beam rl-l"></div><div class="rl-beam rl-r"></div>` : nothing}
          ${bg.includes('rings') ? rings : nothing}`;
    const photo: string | null = !info ? aa.player_photo : null;
    const logoEl = tlogo && !info ? html`<img class="rl-ovlogo" src=${tlogo} @error=${hide} />` : nothing;
    const cardEl = card ? html`<div class="rl-card"></div>` : nothing;
    const title = html`<div class="rl-ovtxt" style="--n:${label.length}">${label}</div>`;
    const line = [t === 'revoked' && KIND[aa.revoked_type], aa.player || aa.team_name, min].filter(Boolean).join(' • ');
    const front = photo
      ? html`<div class="rl-phw"><img class="rl-ph" src=${photo} @error=${hide} />${cardEl}</div>
          <div class="rl-col">${logoEl}${title}
            <div class="rl-band" style="--n:${String(aa.player || '').length}">${aa.player}</div>
            <div class="rl-ovsub">${[aa.team_name, min].filter(Boolean).join(' • ')}</div></div>`
      : html`${card ? cardEl : logoEl}${title}<div class="rl-ovsub">${line}</div>`;
    const whistle = card
      ? html`<svg class="rl-whistle" viewBox="0 0 180 100" aria-hidden="true">
          <circle cx="16" cy="34" r="9" fill="none" stroke="#cbd5e1" stroke-width="4" />
          <rect x="46" y="26" width="92" height="24" rx="6" fill="#e2e8f0" />
          <circle cx="50" cy="60" r="32" fill="#e2e8f0" /><circle cx="50" cy="60" r="11" fill="#475569" />
          <rect x="96" y="30" width="16" height="7" rx="2" fill="#475569" />
          <g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round">
            <path class="rl-wave" d="M148 26 q8 12 0 24" />
            <path class="rl-wave" style="animation-delay:.12s" d="M158 18 q14 20 0 40" />
            <path class="rl-wave" style="animation-delay:.24s" d="M168 10 q20 28 0 56" /></g></svg>`
      : nothing;
    // keyed: each animation gets fresh elements, so its CSS animations start from zero.
    return keyed(aa.started_at, html`<div class="rl-ov ${photo ? 'rl-hasph' : ''} ${card ? 'rl-iscard' : ''}"
      style="--c:${color};--fg:${fg};--age:${age}ms;animation-duration:${durMs}ms;animation-delay:-${age}ms">
      <video class="rl-vid" src=${media} autoplay muted loop playsinline @error=${hide}></video>
      ${back}${front}${confetti}${whistle}</div>`);
  }
}
