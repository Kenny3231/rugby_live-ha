// Demo engine of the site: replays a real match and turns it into the `hass` object the
// real Lovelace cards read (same entities, translation keys and attributes as the
// integration). The cards on this site are the bundle served by Home Assistant.

// ---- Home Assistant element stubs: the cards render inside <ha-card>, icons in <ha-icon> ----
const define = (tag, cls) => customElements.get(tag) || customElements.define(tag, cls);
define('ha-card', class extends HTMLElement {
  constructor() {
    super();
    // :host rules lose to the card's own `ha-card { ... }` rules, as in Home Assistant.
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>:host{display:block;color:var(--primary-text-color);
      background:var(--card-background-color);border-radius:var(--ha-card-border-radius,12px);
      border:1px solid var(--divider-color)}</style><slot></slot>`;
  }
});
const circled = (n, box) => `${box ? '<rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor"/>'
  : '<circle cx="12" cy="12" r="10" fill="currentColor"/>'}<text x="12" y="16.6" font-size="13" font-weight="800"
  font-family="system-ui,sans-serif" text-anchor="middle" fill="var(--card-background-color,#111)">${n}</text>`;
const ICONS = {
  'mdi:rugby': `<ellipse cx="12" cy="12" rx="10.5" ry="6.3" transform="rotate(-40 12 12)" fill="currentColor"/>
    <path d="M8.6 15.4 15.4 8.6M10.4 11.6l2 2M12 10l2 2" stroke="var(--card-background-color,#111)" stroke-width="1.3"/>`,
  'mdi:numeric-2-circle': circled(2),
  'mdi:numeric-3-circle': circled(3),
  'mdi:numeric-3-box': circled(3, true),
  'mdi:card': '<rect x="6" y="2.5" width="12" height="19" rx="2" fill="currentColor"/>',
  'mdi:swap-horizontal': '<path d="M3 8h15l-4-4M21 16H6l4 4" fill="none" stroke="currentColor" stroke-width="2.2"/>',
};
define('ha-icon', class extends HTMLElement {
  static observedAttributes = ['icon'];
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  attributeChangedCallback() {
    this.shadowRoot.innerHTML = `<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}
      svg{width:100%;height:100%}</style><svg viewBox="0 0 24 24">${ICONS[this.getAttribute('icon')]
      || '<circle cx="12" cy="12" r="3" fill="currentColor"/>'}</svg>`;
  }
});

// ---- Real data: Top 14 final 2025, recorded from ESPN (event 599792, Stade de France) ----
// Names as ESPN sends them; club colours (api.CLUB_COLORS) and LNR logos, as the integration shows them.
const LNR = (slug) => `https://cdn.lnr.fr/club/${slug}/photo/logo.006973c3fdaf23345d4c26b914dcca87e8ef842a`;
const team = (id, name, color, slug) => ({ id, name, color, logo: LNR(slug) });
const TEAMS = Object.fromEntries([
  team('25922', 'Stade Toulousain', '#C8102E', 'toulouse'), team('143737', 'Bordeaux Begles', '#7A1E3D', 'bordeaux-begles'),
  team('25912', 'Bayonne', '#2B8FD0', 'bayonne'), team('25917', 'Clermont Auvergne', '#FFC20E', 'clermont'),
  team('25986', 'Toulon', '#E2001A', 'toulon'), team('25916', 'Castres Olympique', '#0047AB', 'castres'),
].map((t) => [t.id, t]));
// The replayed match: Stade Toulousain 39 - 33 Bordeaux Begles after extra time.
// [period, minute, type, side, player]; ESPN puts extra time in period 0.
const MATCH = { home: '25922', away: '143737', venue: 'Stade de France', channel: 'Canal+' };
const EVENTS = [
  [1, 3, 'penalty_goal', 'a', 'Maxime Lucu'], [1, 5, 'penalty_goal', 'h', 'Thomas Ramos'],
  [1, 9, 'penalty_goal', 'a', 'Maxime Lucu'], [1, 21, 'penalty_goal', 'h', 'Thomas Ramos'],
  [1, 27, 'penalty_goal', 'a', 'Maxime Lucu'], [1, 30, 'yellow_card', 'a', 'Guido Petti'],
  [1, 31, 'try', 'h', 'Anthony Jelonch'], [1, 32, 'conversion', 'h', 'Thomas Ramos'],
  [1, 35, 'try', 'a', 'Damian Penaud'], [1, 36, 'conversion', 'a', 'Maxime Lucu'],
  [1, 39, 'try', 'h', 'Jack Willis'], [1, 40, 'conversion', 'h', 'Thomas Ramos'],
  [2, 42, 'try', 'a', 'Matthieu Jalibert'], [2, 43, 'conversion', 'a', 'Maxime Lucu'],
  [2, 45, 'try', 'h', 'Jack Willis'], [2, 46, 'conversion', 'h', 'Thomas Ramos'],
  [2, 55, 'yellow_card', 'a', 'Pierre Bochaton'], [2, 56, 'penalty_goal', 'h', 'Thomas Ramos'],
  [2, 64, 'penalty_goal', 'h', 'Thomas Ramos'], [2, 70, 'try', 'a', 'Guido Petti'], [2, 70, 'conversion', 'a', 'Maxime Lucu'],
  [2, 80, 'penalty_goal', 'a', 'Maxime Lucu'], [0, 95, 'penalty_goal', 'h', 'Thomas Ramos'],
  [0, 100, 'penalty_goal', 'h', 'Thomas Ramos'],
];
// Players offered by the manual buttons: the scorers of the match.
const SCORERS = {
  h: ['Thomas Ramos', 'Anthony Jelonch', 'Jack Willis'],
  a: ['Maxime Lucu', 'Damian Penaud', 'Matthieu Jalibert', 'Guido Petti', 'Pierre Bochaton'],
};
// The play-offs before the final: [home, away, kickoff (UTC), home score, away score].
// Dates are moved so that the replayed final is today.
const REAL_DAY = Date.UTC(2025, 5, 28);
const ROUND = [
  ['25912', '25917', '2025-06-13T19:05:00Z', 20, 3], ['25986', '25916', '2025-06-14T19:05:00Z', 52, 23],
  ['25922', '25912', '2025-06-20T19:05:00Z', 32, 25], ['143737', '25986', '2025-06-21T19:05:00Z', 39, 24],
];

// Cut-out photos of the LNR players index, matched by the integration's own player_photo().
// Guido Petti is no longer in it: as in Home Assistant, his animations show the club logo.
const PHOTO = (path) => `https://cdn.lnr.fr/joueur/${path}`;
const PHOTOS = {
  'Thomas Ramos': PHOTO('2450-thomas-ramos/photo/photoFull-m-2x.b74ab496f94d12765b348b3047522f4447040371'),
  'Anthony Jelonch': PHOTO('2454-anthony-jelonch/photo/photoFull-m-2x.1ab83b2feada67fc422f7d9aa09b7cc4f574b32a'),
  'Jack Willis': PHOTO('2425-jack-willis/photo/photoFull-m-2x.10e04286462c2b2995cb2ff4b2403ed1b91df294'),
  'Maxime Lucu': PHOTO('331-maxime-lucu/photo/photoFull-m-2x.97464dd8bce347c500bb0327ee7e46545e92cbdf'),
  'Damian Penaud': PHOTO('695-damian-penaud/photo/photoFull-m-2x.09a2771fdef0456c36071c98be2370f579765f39'),
  'Matthieu Jalibert': PHOTO('339-matthieu-jalibert/photo/photoFull-m-2x.578d2e07452aa11dfd4aa763abb1258bb53547ac'),
  'Pierre Bochaton': PHOTO('279-pierre-bochaton/photo/photoFull-m-2x.09a2771fdef0456c36071c98be2370f579765f39'),
};

// Clock in match minutes: half-time break between 40 and 45 on the clock, break before
// extra time between 85 and 90, extra time (81' to 100') from 90.
const clockAt = (period, minute) => (period === 1 ? Math.min(minute, 40) - 0.5 : period === 2 ? minute + 4.5 : minute + 9.5);
const SCRIPT = [
  [0, 'kickoff'], [40, 'half_time'], [45, 'second_half'], [87, 'extra_time'], [111, 'full_time'],
  ...EVENTS.map(([period, minute, type, s, player]) => [clockAt(period, minute), type, s, player]),
].sort((x, y) => x[0] - y[0]);

const POINTS = { try: 5, conversion: 2, penalty_goal: 3, drop_goal: 3 };
const CARDS = ['yellow_card', 'red_card'];
const LIVE = ['first_half', 'half_time', 'second_half', 'extra_time'];
const LABEL = {
  try: 'Essai', conversion: 'Transformation', penalty_goal: 'Pénalité', drop_goal: 'Drop',
  yellow_card: 'Carton jaune', red_card: 'Carton rouge', kickoff: "Coup d'envoi", half_time: 'Mi-temps',
  second_half: 'Reprise', extra_time: 'Prolongations', full_time: 'Fin du match', revoked: 'Action annulée',
};
const PHASE = { kickoff: 'first_half', half_time: 'half_time', second_half: 'second_half', extra_time: 'extra_time',
  full_time: 'finished' };
// Integration defaults (options "Fond des animations"): tries rays + beams, kicks rays, info none.
const BG_DEFAULT = { try: ['rays', 'beams'], conversion: ['rays'], penalty_goal: ['rays'], drop_goal: ['rays'] };

const minuteOf = (c) => (c < 40 ? Math.floor(c) + 1 : c < 45 ? 40 : c < 85 ? Math.floor(c - 5) + 1 : c < 90 ? 80
  : Math.floor(c - 10) + 1);
const phaseOf = (c) => (c < 0 ? 'scheduled' : c < 40 ? 'first_half' : c < 45 ? 'half_time' : c < 87 ? 'second_half'
  : c < 111 ? 'extra_time' : 'finished');
/** "23'", "mi-temps"… for a clock value (demo status line). */
export const clockLabel = (c) => ({ scheduled: 'avant-match', half_time: 'mi-temps', finished: 'fin' })[phaseOf(c)]
  ?? `${minuteOf(c)}'`;
const iso = (ms) => new Date(ms).toISOString();
const side = (p, t) => ({ [`${p}_id`]: t.id, [`${p}_name`]: t.name, [`${p}_color`]: t.color, [`${p}_logo`]: t.logo });
const fixture = (id, h, a, kickoff, status = 'scheduled', hs = 0, as = 0, extra = {}) => ({
  match_id: id, competition: 'top14', kickoff, status, home_score: hs, away_score: as,
  ...side('home', TEAMS[h]), ...side('away', TEAMS[a]), ...extra,
});

const ENTITIES = Object.fromEntries([
  ['sensor.match_suivi_statut_du_match', 'follow', 'match_status'], ['sensor.match_suivi_score', 'follow', 'score'],
  ['sensor.match_suivi_minute', 'follow', 'minute'], ['sensor.match_suivi_dernier_evenement', 'follow', 'last_event'],
  ['sensor.match_suivi_animation', 'follow', 'animation'],
  ['sensor.stade_toulousain_statut_du_match', 'fav', 'match_status'], ['sensor.stade_toulousain_score', 'fav', 'score'],
  ['sensor.stade_toulousain_minute', 'fav', 'minute'], ['sensor.stade_toulousain_dernier_evenement', 'fav', 'last_event'],
  ['sensor.stade_toulousain_prochain_match', 'fav', 'next_match'],
  ['sensor.top_14_matchs_en_direct', 'top14', 'live_matches'], ['sensor.top_14_prochain_match', 'top14', 'next_match'],
].map(([id, device_id, translation_key]) => [id, { entity_id: id, device_id, translation_key, platform: 'rugby_live' }]));

export class Sim {
  constructor(opts = {}) {
    // speed: match minutes per real second (1 = x60). delay and duration: real seconds.
    Object.assign(this, { speed: 1, delay: 0, duration: 8, background: 'default', loop: false, onEvent() {} }, opts);
    this.reset();
  }

  reset() {
    const now = Date.now();
    Object.assign(this, { clock: -4, next: 0, seq: 0, raw: [], queue: [], anim: null, paused: false,
      samples: [[now, -4]], last: now, prev: {}, endedAt: 0 });
    this.kickoff = now + 4000 / this.speed;
    // Real calendar moved by whole days so that the replayed match is today.
    const today = new Date();
    this.shift = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - REAL_DAY;
  }

  /** Advance real time: the clock stops while an animation plays (demo pacing). */
  tick(now = Date.now()) {
    const dt = (now - this.last) / 1000;
    this.last = now;
    if (!this.paused && !this.anim && this.clock < 115) this.clock += dt * this.speed;
    while (this.next < SCRIPT.length && SCRIPT[this.next][0] <= this.clock) this._emit(...SCRIPT[this.next++]);
    // What you see = what the integration saw `delay` seconds ago (anti-spoil queue).
    this.samples.push([now, this.clock]);
    const cut = now - this.delay * 1000;
    while (this.samples.length > 1 && this.samples[1][0] <= cut) this.samples.shift();
    for (const e of this.raw) {
      if (e.visible || now < e.rawAt + this.delay * 1000) continue;
      e.visible = now;
      this.onEvent('rugby_live_event', e, this._score(e));
      this.queue.push(e);
    }
    if (this.anim && now - this.anim.start >= this.duration * 1000) this.anim = null;
    if (!this.anim && this.queue.length) this.anim = { ev: this.queue.shift(), start: now };
    if (this.loop && this.status() === 'finished' && !this.anim) {
      this.endedAt ||= now;
      if (now - this.endedAt > 12000) this.reset();
    }
  }

  /** Jump straight to a clock value, everything already visible (screenshots). */
  seek(clock) {
    const old = Date.now() - 600000;
    this.clock = clock;
    while (this.next < SCRIPT.length && SCRIPT[this.next][0] <= clock) this._emit(...SCRIPT[this.next++]);
    for (const e of this.raw) e.rawAt = e.visible = old;
    Object.assign(this, { samples: [[old, clock]], queue: [], anim: null, paused: true });
  }

  /** Manual action from the demo controls, at the current minute ('h' or 'a' side). */
  inject(type, s) {
    if (type === 'revoked') return this._emit(Math.max(this.clock, 0), type);
    this._emit(Math.max(this.clock, 0), type, s, SCORERS[s][this.seq % SCORERS[s].length]);
  }

  pending() {
    return this.raw.filter((e) => !e.visible).length;
  }

  /** Clock as shown on screen, i.e. `delay` seconds behind the integration's. */
  shownClock() {
    return this.samples[0][1];
  }

  _emit(clock, type, s, player) {
    const e = { id: ++this.seq, type, side: s, player, minute: PHASE[type] ? null : minuteOf(clock), rawAt: Date.now() };
    if (type === 'revoked') {
      // ESPN takes back a try: the integration drops it and says so.
      const t = [...this.raw].reverse().find((x) => x.type === 'try' && !x.revokedBy);
      if (!t) return;
      t.revokedBy = e;
      Object.assign(e, { side: t.side, player: t.player, minute: t.minute, revokedType: t.type });
    }
    this.raw.push(e);
    this.onEvent('rugby_live_event_raw', e);
  }

  teamOf(e) {
    return e.side ? TEAMS[e.side === 'h' ? MATCH.home : MATCH.away] : null;
  }

  _visible() {
    return this.raw.filter((e) => e.visible && !(e.revokedBy && e.revokedBy.visible));
  }

  status() {
    const ph = this._visible().filter((e) => PHASE[e.type]).pop();
    return ph ? PHASE[ph.type] : 'scheduled';
  }

  /** Score once `upTo` is visible (all visible events by default). */
  _score(upTo) {
    const s = { home: 0, away: 0 };
    for (const e of this._visible()) {
      if (POINTS[e.type]) s[e.side === 'h' ? 'home' : 'away'] += POINTS[e.type];
      if (e === upTo) break;
    }
    return s;
  }

  /** The `hass` object of this instant; unchanged entities keep their object (cards skip them). */
  hass() {
    const vis = this._visible();
    const status = this.status();
    const vclock = this.shownClock();
    const minute = status === 'scheduled' ? null : minuteOf(vclock);
    const display = status === 'half_time' ? 'MT' : minute == null ? null : `${minute}'`;
    const H = TEAMS[MATCH.home];
    const A = TEAMS[MATCH.away];
    const sideOf = (e) => (e.side === 'h' ? 'home' : 'away');

    const counters = { home: {}, away: {} };
    for (const e of vis) {
      if (POINTS[e.type] || CARDS.includes(e.type)) counters[sideOf(e)][e.type] = (counters[sideOf(e)][e.type] || 0) + 1;
    }
    const { home: hs, away: as } = this._score();
    const score = { ...side('home', H), ...side('away', A), home_score: hs, away_score: as,
      team_score: hs, opponent_score: as, provisional: false, counters };

    const actions = vis.filter((e) => POINTS[e.type] || CARDS.includes(e.type));
    const events = actions.map((e) => ({ key: String(e.id), type: e.type, label: LABEL[e.type], side: sideOf(e),
      team: this.teamOf(e).name, player: e.player, minute: e.minute }));
    const lastEv = actions[actions.length - 1];
    const lastEvent = lastEv
      ? { state: `${LABEL[lastEv.type]} — ${lastEv.player} (${lastEv.minute}')`, last_changed: iso(lastEv.visible),
        attributes: { type: lastEv.type, side: sideOf(lastEv), player: lastEv.player, minute: lastEv.minute, events } }
      : { state: 'unknown', attributes: { events: [] } };

    const statusAttrs = { competition: 'top14', kickoff: iso(this.kickoff), venue: MATCH.venue, channel: MATCH.channel,
      home_away: 'home', team_id: H.id, team_name: H.name, opponent_name: A.name };

    let anim = { state: 'idle', attributes: {} };
    if (this.anim) {
      const { ev: e, start } = this.anim;
      const info = !POINTS[e.type] && !CARDS.includes(e.type);
      const t = this.teamOf(e);
      const bg = this.background === 'default' ? BG_DEFAULT[e.type] || []
        : !POINTS[e.type] || this.background === 'none' ? []
        : this.background === 'all' ? ['rays', 'rings', 'beams', 'confetti'] : [this.background];
      const s = this._score(e);
      anim = { state: e.type, attributes: { team_id: info ? null : t?.id, team_name: info ? null : t?.name,
        side: e.side ? sideOf(e) : null, player: e.player ?? null,
        player_photo: info ? null : PHOTOS[e.player] ?? null, revoked_type: e.revokedType ?? null,
        background: bg, minute: e.minute, score_home: s.home, score_away: s.away, home_name: H.name, away_name: A.name,
        favorite: e.side === 'h', started_at: iso(start), ends_at: iso(start + this.duration * 1000),
        duration: this.duration, queued: this.queue.length } };
    }

    // A final is the only match of the day; the play-offs are the recent results. Nothing
    // scheduled after it: the season is over.
    const playoffs = ROUND.map(([h, a, ko, rhs, ras], i) => fixture(`r${i}`, h, a, iso(Date.parse(ko) + this.shift),
      'finished', rhs, ras));
    const ours = fixture('live', MATCH.home, MATCH.away, iso(this.kickoff), status, hs, as,
      { minute: display, channel: MATCH.channel, last_event: lastEv ? lastEvent.state : null });
    const today = [ours];
    const fixtures = [...playoffs, ours];
    const nextFavState = { state: 'unknown', attributes: { team_id: H.id, team_name: H.name } };

    const minuteState = { state: minute == null ? 'unknown' : String(minute), attributes: { display } };
    const next = {
      'sensor.match_suivi_statut_du_match': { state: status, attributes: statusAttrs },
      'sensor.match_suivi_score': { state: `${hs} - ${as}`, attributes: score },
      'sensor.match_suivi_minute': minuteState,
      'sensor.match_suivi_dernier_evenement': lastEvent,
      'sensor.match_suivi_animation': anim,
      'sensor.stade_toulousain_statut_du_match': { state: status, attributes: statusAttrs },
      'sensor.stade_toulousain_score': { state: `${hs} - ${as}`, attributes: score },
      'sensor.stade_toulousain_minute': minuteState,
      'sensor.stade_toulousain_dernier_evenement': lastEvent,
      'sensor.stade_toulousain_prochain_match': nextFavState,
      'sensor.top_14_matchs_en_direct': { state: String(today.filter((m) => LIVE.includes(m.status)).length),
        attributes: { matches: today } },
      'sensor.top_14_prochain_match': { state: 'unknown', attributes: { fixtures } },
    };
    const states = {};
    for (const [id, s] of Object.entries(next)) {
      const json = JSON.stringify(s);
      states[id] = this.prev[id]?.json === json ? this.prev[id].obj : { entity_id: id, ...s };
      this.prev[id] = { json, obj: states[id] };
    }
    return { entities: ENTITIES, states };
  }
}

/** Create a card the way a dashboard does. */
export function mount(parent, tag, config = {}) {
  const el = document.createElement(tag);
  el.setConfig({ type: `custom:${tag}`, ...config });
  parent.append(el);
  return el;
}

/** Feed the cards 4 times a second. */
export function run(sim, cards, after) {
  const step = () => {
    sim.tick();
    const h = sim.hass();
    for (const c of cards) c.hass = h;
    after?.();
  };
  step();
  return setInterval(step, 250);
}
