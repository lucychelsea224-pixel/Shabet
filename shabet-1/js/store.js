import { buildInitialFixtures, buildInitialPlayers, buildInitialScorers, buildInitialCards, buildDefaultCustomMarkets, defaultCustomMarketTemplate } from './data.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { showToast } from './toast.js';

const STORAGE_KEY = 'shabet_state_v1';
const DRAFT_KEY = 'shabet_draft_slip_v1';
const BACKUP_KEY = 'shabet_pre_supabase_backup_v1';

// Supabase (via PostgREST) does NOT return an error when a row-level
// security policy blocks an update or delete — it just reports success
// with zero rows affected. Left unchecked, that looks exactly like "it
// saved" until the next reload re-fetches the real (unchanged) data. This
// helper treats "no error, but nothing came back" as a failure too, and
// surfaces it immediately instead of letting it revert silently later.
// Returns 'ok', 'permission' (0 rows affected, no error — almost always
// an RLS policy silently blocking the write, which retrying won't fix),
// or 'error' (a real failure, usually a dropped connection — this IS
// worth retrying, so every caller below queues it via queueWrite() when
// they see 'error' come back).
function reportIfWriteFailed(action, { data, error }) {
  if (error) {
    console.warn(`Supabase: ${action} failed`, error);
    showToast(`"${action}" didn't reach the database yet: ${error.message}. Saved on this device — it'll keep retrying automatically.`);
    return 'error';
  }
  if (Array.isArray(data) && data.length === 0) {
    console.warn(`Supabase: ${action} affected 0 rows — likely blocked by a permissions policy.`);
    showToast(
      `"${action}" didn't save — this account may not have admin permissions yet. ` +
      `If admin access was just granted, sign out and back in for it to take effect.`
    );
    return 'permission';
  }
  return 'ok';
}

const listeners = new Set();

// One-time safety net: the very first time this runs, whatever is already
// sitting in localStorage (from before Supabase was wired up, or from any
// session that never successfully synced) gets copied into a key that is
// never written to again. Without this, the first successful Supabase
// fetch below overwrites STORAGE_KEY with live (possibly empty) server
// data, silently discarding anything that was only ever local — like a
// Sunday's worth of results entered before the database was connected.
(function snapshotPreSupabaseDataOnce() {
  try {
    if (localStorage.getItem(BACKUP_KEY)) return; // already snapshotted, never touch again
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) localStorage.setItem(BACKUP_KEY, existing);
  } catch (e) {
    console.warn('Could not snapshot pre-Supabase local data.', e);
  }
})();

export function getLocalBackup() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Could not read local backup.', e);
    return null;
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

// =======================================================================
// Local (localStorage) persistence — used as the offline cache in every
// mode, and as the ONLY backend when Supabase isn't configured (see
// supabaseClient.js). Everything in this section is unchanged from the
// original local-only build.
// =======================================================================

let ticketCounter = 1;
let scorerCounter = 1;
let cardCounter = 1;
let customMarketCounter = 1;
let tempIdCounter = 1; // guarantees uniqueness even for several optimistic inserts in the same tick

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged = {
        league: { name: 'PIPELINE LEAGUE', payment_bank_name: '', payment_account_number: '', payment_account_name: '' },
        scorers: [],
        cards: [],
        profiles: [],
        ...parsed,
      };
      if (!Array.isArray(merged.profiles)) merged.profiles = [];
      merged.league = {
        payment_bank_name: '', payment_account_number: '', payment_account_name: '',
        ...merged.league,
      };
      if (!merged.scorers || merged.scorers.length === 0) {
        merged.scorers = buildInitialScorers();
      }
      if (!merged.cards || merged.cards.length === 0) {
        merged.cards = buildInitialCards();
      }
      if (Array.isArray(merged.fixtures)) {
        merged.fixtures = merged.fixtures.map((f) => (
          f.custom_markets ? f : { ...f, custom_markets: buildDefaultCustomMarkets(), custom_markets_won: f.custom_markets_won || [] }
        ));
      }
      return merged;
    }
  } catch (e) {
    console.warn('Failed to load saved state, starting fresh.', e);
  }
  return {
    league: { name: 'PIPELINE LEAGUE', payment_bank_name: '', payment_account_number: '', payment_account_name: '' },
    fixtures: buildInitialFixtures(),
    players: buildInitialPlayers(),
    scorers: buildInitialScorers(),
    cards: buildInitialCards(),
    tickets: [],
    profiles: [],
  };
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not load draft slip.', e);
  }
  return { customerName: '', stake: '', selections: [] };
}

function persistLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store.state));
  } catch (e) {
    console.warn('Could not persist state to localStorage.', e);
  }
}

function persistDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(store.draftSlip));
  } catch (e) {
    console.warn('Could not persist draft slip.', e);
  }
}

function seedCountersFrom(state) {
  const maxTicketNum = (state.tickets || []).reduce((max, t) => {
    const n = parseInt(String(t.id).replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  ticketCounter = maxTicketNum + 1;

  const maxScorerNum = (state.scorers || []).reduce((max, sc) => {
    const n = parseInt(String(sc.id).replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  scorerCounter = maxScorerNum + 1;

  const maxCardNum = (state.cards || []).reduce((max, cd) => {
    const n = parseInt(String(cd.id).replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  cardCounter = maxCardNum + 1;

  const maxCustomMarketNum = (state.fixtures || []).reduce((max, f) => {
    const fixtureMax = (f.custom_markets || []).reduce((m, cm) => {
      const n = parseInt(String(cm.id).replace(/\D/g, ''), 10);
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0);
    return Math.max(max, fixtureMax);
  }, 0);
  customMarketCounter = maxCustomMarketNum + 1;
}

// =======================================================================
// Shared state + pure helpers (used regardless of which backend populated
// store.state)
// =======================================================================

export const store = {
  state: loadLocalState(), // instant render from cache/defaults; replaced by live Supabase data below if configured
  draftSlip: loadDraft(),
};
seedCountersFrom(store.state);

export function setState(patch) {
  store.state = typeof patch === 'function' ? patch(store.state) : { ...store.state, ...patch };
  persistLocal(); // always keep a local cache, even in Supabase mode, for offline resilience
  notify();
}

export function setDraftSlip(patch) {
  store.draftSlip = typeof patch === 'function' ? patch(store.draftSlip) : { ...store.draftSlip, ...patch };
  persistDraft();
  notify();
}

export function clearDraftSlip() {
  setDraftSlip({ customerName: '', stake: '', selections: [] });
}

function evaluateSelection(sel, fixture) {
  if (fixture.status !== 'completed' || fixture.home_score == null || fixture.away_score == null) {
    return 'pending';
  }
  const h = fixture.home_score;
  const a = fixture.away_score;
  switch (sel.market) {
    case '1': return h > a ? 'won' : 'lost';
    case 'X': return h === a ? 'won' : 'lost';
    case '2': return a > h ? 'won' : 'lost';
    case 'OVER_2_5': return h + a > 2.5 ? 'won' : 'lost';
    case 'OVER_3_5': return h + a > 3.5 ? 'won' : 'lost';
    case 'BTTS': return h > 0 && a > 0 ? 'won' : 'lost';
    case 'SCORER': return (fixture.scorers_confirmed || []).includes(sel.player_id) ? 'won' : 'lost';
    case 'CARD': return (fixture.cards_confirmed || []).includes(sel.card_id) ? 'won' : 'lost';
    case 'CUSTOM': return (fixture.custom_markets_won || []).includes(sel.custom_market_id) ? 'won' : 'lost';
    default: return 'pending';
  }
}

function settleFixtureLocally(state, fixtureId, homeScore, awayScore, scorerIds, customMarketWinIds, cardIds = []) {
  const fixtures = state.fixtures.map((f) =>
    f.id === fixtureId
      ? { ...f, status: 'completed', home_score: homeScore, away_score: awayScore, scorers_confirmed: scorerIds, custom_markets_won: customMarketWinIds, cards_confirmed: cardIds }
      : f
  );
  const updatedFixture = fixtures.find((f) => f.id === fixtureId);

  const tickets = state.tickets.map((ticket) => {
    const touchesFixture = ticket.selections.some((sel) => sel.fixture_id === fixtureId);
    if (!touchesFixture) return ticket;

    const selections = ticket.selections.map((sel) =>
      sel.fixture_id === fixtureId ? { ...sel, result: evaluateSelection(sel, updatedFixture) } : sel
    );
    const anyLost = selections.some((sel) => sel.result === 'lost');
    const allDecided = selections.every((sel) => sel.result === 'won' || sel.result === 'lost');
    let status = 'pending';
    if (anyLost) status = 'lost';
    else if (allDecided) status = 'won';

    return { ...ticket, selections, status };
  });

  return { ...state, fixtures, tickets };
}

export function scorersForFixture(fixture) {
  return (store.state.scorers || []).filter(
    (sc) => !sc.team || sc.team === fixture.home_team || sc.team === fixture.away_team
  );
}

export function cardsForFixture(fixture) {
  return (store.state.cards || []).filter(
    (cd) => !cd.team || cd.team === fixture.home_team || cd.team === fixture.away_team
  );
}

export function getFinancials() {
  const tickets = store.state.tickets;
  const totalStakes = tickets.reduce((sum, t) => sum + t.stake_amount, 0);
  const totalPayoutsDue = tickets.filter((t) => t.status === 'won').reduce((sum, t) => sum + t.potential_return, 0);
  const pendingLiability = tickets.filter((t) => t.status === 'pending').reduce((sum, t) => sum + t.potential_return, 0);
  return { totalStakes, totalPayoutsDue, pendingLiability, netProfit: totalStakes - totalPayoutsDue };
}

// Admin "Users" tab: one row per self-service customer (profiles), with
// their full ticket history and running totals joined in from `tickets`.
// Agent-booked tickets have no user_id and never show up here — this is
// specifically the self-service customer directory, since the agent/admin
// accounts are shared logins, not individual "users" to list or delete.
export function getUserDirectory() {
  const tickets = store.state.tickets;
  return (store.state.profiles || []).map((p) => {
    const userTickets = tickets
      .filter((t) => t.user_id === p.id)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    const totalStaked = userTickets.reduce((sum, t) => sum + t.stake_amount, 0);
    const potentialPayout = userTickets
      .filter((t) => t.status === 'pending')
      .reduce((sum, t) => sum + t.potential_return, 0);
    const wonPayout = userTickets
      .filter((t) => t.status === 'won')
      .reduce((sum, t) => sum + t.potential_return, 0);
    return {
      id: p.id,
      fullName: p.full_name || '(no name given)',
      phone: p.phone || '',
      email: p.email || '',
      createdAt: p.created_at,
      ticketCount: userTickets.length,
      totalStaked,
      potentialPayout,
      wonPayout,
      tickets: userTickets,
    };
  }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

// Deletes a customer's login (via the admin_delete_user RPC, which checks
// the caller is actually an admin server-side). Their past tickets are
// kept for the record — only the user_id link and the login itself are
// removed (see the RPC's comment in schema.sql).
export async function deleteUserAccount(userId) {
  if (!isSupabaseConfigured) {
    showToast('Connect Supabase to manage real customer accounts.');
    return false;
  }
  const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
  if (error) {
    console.warn('Supabase: admin_delete_user failed', error);
    showToast(`Couldn't delete account: ${error.message}`);
    return false;
  }
  // Optimistic local update — realtime DELETE on profiles will also
  // reconcile this, but don't make the admin wait for it.
  setState((s) => ({
    ...s,
    profiles: s.profiles.filter((p) => p.id !== userId),
    tickets: s.tickets.map((t) => (t.user_id === userId ? { ...t, user_id: null } : t)),
  }));
  showToast('Customer account deleted.');
  return true;
}

export function computeStandings() {
  const table = new Map();
  for (const p of store.state.players) {
    table.set(p.player_name, { team: p.player_name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
  }
  function ensureRow(name) {
    if (!table.has(name)) table.set(name, { team: name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
    return table.get(name);
  }
  for (const fx of store.state.fixtures) {
    if (fx.status !== 'completed' || fx.home_score == null || fx.away_score == null) continue;
    const home = ensureRow(fx.home_team);
    const away = ensureRow(fx.away_team);
    home.played += 1; away.played += 1;
    home.goalsFor += fx.home_score; home.goalsAgainst += fx.away_score;
    away.goalsFor += fx.away_score; away.goalsAgainst += fx.home_score;
    if (fx.home_score > fx.away_score) { home.won += 1; home.points += 3; away.lost += 1; }
    else if (fx.away_score > fx.home_score) { away.won += 1; away.points += 3; home.lost += 1; }
    else { home.drawn += 1; home.points += 1; away.drawn += 1; away.points += 1; }
  }
  return Array.from(table.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst, gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
}

// =======================================================================
// Migrating pre-Supabase local data into the live database
// Matches each locally-generated fixture (ids like "F001") to its live
// Supabase counterpart by matchday + team names, since the two never
// share the same id scheme.
//
// Recommended order: import match results first, then tickets. A ticket
// import never triggers re-settlement (it inserts the ticket's status and
// per-selection results exactly as they were already computed locally),
// so importing tickets after results avoids any chance of the
// settle_fixture RPC sweeping over — and re-evaluating — a ticket that
// was just imported.
// =======================================================================

function localFixtureIdMap(backup) {
  const map = {};
  for (const f of backup.fixtures || []) {
    if (!/^F\d+$/.test(f.id)) continue; // only locally-generated ids need remapping
    const live = store.state.fixtures.find(
      (lf) => lf.matchday === f.matchday && lf.home_team === f.home_team && lf.away_team === f.away_team
    );
    if (live) map[f.id] = live.id;
  }
  return map;
}

export function findMigratableFixtureResults() {
  const backup = getLocalBackup();
  if (!backup) return [];
  const idMap = localFixtureIdMap(backup);
  return (backup.fixtures || [])
    .filter((f) => /^F\d+$/.test(f.id) && f.status !== 'open' && f.home_score != null && f.away_score != null)
    .map((f) => {
      const liveId = idMap[f.id] || null;
      const liveFixture = liveId ? store.state.fixtures.find((lf) => lf.id === liveId) : null;
      return {
        localId: f.id,
        matchday: f.matchday,
        home_team: f.home_team,
        away_team: f.away_team,
        home_score: f.home_score,
        away_score: f.away_score,
        liveId,
        alreadySettled: Boolean(liveFixture && liveFixture.status === 'completed'),
      };
    });
}

export function importFixtureResult(liveFixtureId, homeScore, awayScore) {
  // Reuses the normal settlement path — same optimistic update + RPC call
  // as settling a fixture the regular way through Admin > Settlement.
  settleFixture(liveFixtureId, homeScore, awayScore, [], []);
}

export function findMigratableCustomMarkets() {
  const backup = getLocalBackup();
  if (!backup) return [];
  const idMap = localFixtureIdMap(backup);

  const out = [];
  for (const f of backup.fixtures || []) {
    if (!/^F\d+$/.test(f.id)) continue; // only locally-generated fixtures need migrating
    const liveId = idMap[f.id] || null;
    const liveFixture = liveId ? store.state.fixtures.find((lf) => lf.id === liveId) : null;
    const liveLabels = new Set((liveFixture?.custom_markets || []).map((cm) => cm.label.trim().toLowerCase()));

    for (const cm of f.custom_markets || []) {
      // Skip the default template markets every fixture starts with — only
      // surface ones that look like something the admin actually typed in.
      out.push({
        localFixtureId: f.id,
        customMarketLocalId: cm.id,
        matchday: f.matchday,
        home_team: f.home_team,
        away_team: f.away_team,
        label: cm.label,
        odds: cm.odds,
        liveId,
        alreadyExists: liveLabels.has(cm.label.trim().toLowerCase()),
      });
    }
  }
  return out;
}

export function importCustomMarket(liveFixtureId, label, odds) {
  addCustomMarket(liveFixtureId, label, odds);
}

export function findMigratableTickets() {
  const backup = getLocalBackup();
  if (!backup) return [];
  const idMap = localFixtureIdMap(backup);
  const existingIds = new Set(store.state.tickets.map((t) => t.id));

  return (backup.tickets || [])
    .filter((t) => !existingIds.has(t.id))
    .map((t) => ({
      ticket: t,
      importable: t.selections.every((sel) => Boolean(idMap[sel.fixture_id])),
      idMap,
    }));
}

export function importTicket(backupTicket, idMap) {
  const remapped = {
    ...backupTicket,
    selections: backupTicket.selections.map((sel) => ({ ...sel, fixture_id: idMap[sel.fixture_id] || sel.fixture_id })),
  };

  // Inserted with its status and per-selection results exactly as they
  // were already computed by the local settlement that Sunday — this does
  // NOT re-run settlement logic, by design (see note above).
  setState((s) => ({ ...s, tickets: [remapped, ...s.tickets] }));

  if (isSupabaseConfigured) {
    const baseRow = {
      league_id: store.state.league.id,
      league_name: remapped.league_name,
      customer_name: remapped.customer_name,
      stake_amount: remapped.stake_amount,
      total_odds: remapped.total_odds,
      potential_return: remapped.potential_return,
      status: remapped.status,
      selections: remapped.selections,
    };
    // Try to keep the original reference number (it may already be on a
    // printed receipt) — but if a ticket booked after this backup was
    // taken has since claimed that same number from the live sequence,
    // fall back to letting the database assign a fresh one rather than
    // losing the whole ticket to a duplicate-key error.
    supabase.from('tickets').insert({ ...baseRow, display_id: remapped.id }).select().single()
      .then(({ data, error }) => {
        if (!error) return;
        if (error.code === '23505') {
          console.warn(`Supabase: import ticket ${remapped.id} — original reference already taken, requesting a new one`, error);
          supabase.from('tickets').insert(baseRow).select().single()
            .then(({ data: data2, error: error2 }) => {
              if (error2) {
                console.warn('Supabase: failed to import ticket even with a fresh reference', error2);
                showToast(`Couldn't import ticket ${remapped.id}: ${error2.message}`);
                return;
              }
              setState((s) => ({ ...s, tickets: s.tickets.map((t) => (t === remapped ? { ...remapped, id: data2.display_id } : t)) }));
              showToast(`Imported as ${data2.display_id} — its original reference ${remapped.id} was already taken by a newer ticket.`);
            });
          return;
        }
        console.warn('Supabase: failed to import ticket', error);
        showToast(`Couldn't import ticket ${remapped.id}: ${error.message}`);
      });
  }
}

// =======================================================================
// Mutating actions — each applies an optimistic local update immediately
// (so the UI never waits on a network round trip), then — in remote mode
// — fires the actual database write in the background. Realtime (below)
// brings in whatever the *other* device did.
// =======================================================================

export function updateLeagueName(name) {
  setState((s) => ({ ...s, league: { ...s.league, name } }));
  if (isSupabaseConfigured && store.state.league.id) {
    const leagueId = store.state.league.id;
    supabase.from('leagues').update({ name }).eq('id', leagueId).select()
      .then((res) => {
        if (reportIfWriteFailed('rename league', res) === 'error') queueWrite('update_league', { leagueId, patch: { name } });
      });
  }
}

// The account details the operator wants customers/agents to pay bookings
// into. Deliberately just display text stored on the league row — Shabet
// never processes this payment itself, it only shows it (see the Privacy
// Policy / README "How money works" section for why). Stored per-field so
// a partial edit (e.g. just fixing a typo in the account name) doesn't
// require re-typing the rest.
export function updatePaymentAccount(patch) {
  setState((s) => ({ ...s, league: { ...s.league, ...patch } }));
  if (isSupabaseConfigured && store.state.league.id) {
    const leagueId = store.state.league.id;
    supabase.from('leagues').update(patch).eq('id', leagueId).select()
      .then((res) => {
        if (reportIfWriteFailed('update payment account', res) === 'error') queueWrite('update_league', { leagueId, patch });
      });
  }
}

export function updateFixture(fixtureId, patch) {
  setState((s) => ({ ...s, fixtures: s.fixtures.map((f) => (f.id === fixtureId ? { ...f, ...patch } : f)) }));
  if (isSupabaseConfigured) {
    // custom_markets lives on the fixture object locally but is a separate
    // table server-side — never try to write it as a fixtures column.
    const { custom_markets, ...fixtureColumns } = patch;
    if (Object.keys(fixtureColumns).length > 0) {
      supabase.from('fixtures').update(fixtureColumns).eq('id', fixtureId).select()
        .then((res) => {
          if (reportIfWriteFailed('update fixture', res) === 'error') queueWrite('update_fixture', { fixtureId, patch: fixtureColumns });
        });
    }
  }
}

export function updatePlayer(playerId, patch) {
  setState((s) => ({ ...s, players: s.players.map((p) => (p.id === playerId ? { ...p, ...patch } : p)) }));
  if (isSupabaseConfigured) {
    supabase.from('players').update(patch).eq('id', playerId).select()
      .then((res) => {
        if (reportIfWriteFailed('update team', res) === 'error') queueWrite('update_player', { playerId, patch });
      });
  }
}

export function addScorer(team, name, odds) {
  if (isSupabaseConfigured) {
    const teamId = store.state.players.find((p) => p.player_name === team)?.id || null;
    const tempId = `pending-${Date.now()}-${tempIdCounter++}`;
    const optimistic = { id: tempId, team, name, odds };
    setState((s) => ({ ...s, scorers: [...(s.scorers || []), optimistic] }));

    supabase.from('scorers').insert({ league_id: store.state.league.id, team_id: teamId, name, odds }).select().single()
      .then(({ data, error }) => {
        if (error) {
          console.warn('Supabase: failed to add scorer', error);
          queueWrite('add_scorer', { tempId, leagueId: store.state.league.id, teamId, team, name, odds });
          showToast(`Couldn't save new player yet: ${error.message}. Saved on this device — it'll keep retrying automatically.`);
          return;
        }
        setState((s) => ({
          ...s,
          scorers: s.scorers.map((sc) => (sc.id === tempId ? { id: data.id, team, name: data.name, odds: data.odds } : sc)),
        }));
      });
    return optimistic;
  }
  const scorer = { id: `SC${String(scorerCounter++).padStart(3, '0')}`, team, name, odds };
  setState((s) => ({ ...s, scorers: [...(s.scorers || []), scorer] }));
  return scorer;
}

export function updateScorer(scorerId, patch) {
  setState((s) => ({ ...s, scorers: (s.scorers || []).map((sc) => (sc.id === scorerId ? { ...sc, ...patch } : sc)) }));
  // A scorer whose add is still in flight (id starts with "pending-") has
  // no real row to update yet — once that insert resolves (or gets queued
  // as its own add_scorer retry), it'll carry this edit's values already,
  // since the local state above already has them.
  if (isSupabaseConfigured && !String(scorerId).startsWith('pending-')) {
    const { team, ...rest } = patch; // team is resolved to team_id server-side, not a real column value here
    const dbPatch = { ...rest };
    if (team !== undefined) {
      dbPatch.team_id = store.state.players.find((p) => p.player_name === team)?.id || null;
    }
    supabase.from('scorers').update(dbPatch).eq('id', scorerId).select()
      .then((res) => {
        if (reportIfWriteFailed('update player odds', res) === 'error') queueWrite('update_scorer', { scorerId, dbPatch });
      });
  }
}

export function removeScorer(scorerId) {
  setState((s) => ({ ...s, scorers: (s.scorers || []).filter((sc) => sc.id !== scorerId) }));
  if (isSupabaseConfigured && !String(scorerId).startsWith('pending-')) {
    supabase.from('scorers').delete().eq('id', scorerId).select()
      .then((res) => {
        if (reportIfWriteFailed('remove player', res) === 'error') queueWrite('remove_scorer', { scorerId });
      });
  }
}

// "Player to be Booked" (Cards) roster — mirrors addScorer/updateScorer/
// removeScorer exactly, just for the `cards` table instead of `scorers`.
// card_type is 'yellow' or 'red'; two entries for the same player (one of
// each type) is how you'd offer both as separate bettable outcomes.
export function addCard(team, name, cardType, odds) {
  if (isSupabaseConfigured) {
    const teamId = store.state.players.find((p) => p.player_name === team)?.id || null;
    const tempId = `pending-${Date.now()}-${tempIdCounter++}`;
    const optimistic = { id: tempId, team, name, card_type: cardType, odds };
    setState((s) => ({ ...s, cards: [...(s.cards || []), optimistic] }));

    supabase.from('cards').insert({ league_id: store.state.league.id, team_id: teamId, name, card_type: cardType, odds }).select().single()
      .then(({ data, error }) => {
        if (error) {
          console.warn('Supabase: failed to add card', error);
          queueWrite('add_card', { tempId, leagueId: store.state.league.id, teamId, team, name, cardType, odds });
          showToast(`Couldn't save new card yet: ${error.message}. Saved on this device — it'll keep retrying automatically.`);
          return;
        }
        setState((s) => ({
          ...s,
          cards: s.cards.map((cd) => (cd.id === tempId ? { id: data.id, team, name: data.name, card_type: data.card_type, odds: data.odds } : cd)),
        }));
      });
    return optimistic;
  }
  const card = { id: `CD${String(cardCounter++).padStart(3, '0')}`, team, name, card_type: cardType, odds };
  setState((s) => ({ ...s, cards: [...(s.cards || []), card] }));
  return card;
}

export function updateCard(cardId, patch) {
  setState((s) => ({ ...s, cards: (s.cards || []).map((cd) => (cd.id === cardId ? { ...cd, ...patch } : cd)) }));
  if (isSupabaseConfigured && !String(cardId).startsWith('pending-')) {
    const { team, ...rest } = patch; // team is resolved to team_id server-side, not a real column value here
    const dbPatch = { ...rest };
    if (team !== undefined) {
      dbPatch.team_id = store.state.players.find((p) => p.player_name === team)?.id || null;
    }
    supabase.from('cards').update(dbPatch).eq('id', cardId).select()
      .then((res) => {
        if (reportIfWriteFailed('update card odds', res) === 'error') queueWrite('update_card', { cardId, dbPatch });
      });
  }
}

export function removeCard(cardId) {
  setState((s) => ({ ...s, cards: (s.cards || []).filter((cd) => cd.id !== cardId) }));
  if (isSupabaseConfigured && !String(cardId).startsWith('pending-')) {
    supabase.from('cards').delete().eq('id', cardId).select()
      .then((res) => {
        if (reportIfWriteFailed('remove card', res) === 'error') queueWrite('remove_card', { cardId });
      });
  }
}

export function addCustomMarket(fixtureId, label, odds) {
  if (isSupabaseConfigured) {
    const tempId = `pending-${Date.now()}-${tempIdCounter++}`;
    const optimistic = { id: tempId, label, odds };
    setState((s) => ({
      ...s,
      fixtures: s.fixtures.map((f) => (f.id === fixtureId ? { ...f, custom_markets: [...(f.custom_markets || []), optimistic] } : f)),
    }));

    supabase.from('custom_markets').insert({ fixture_id: fixtureId, label, odds }).select().single()
      .then(({ data, error }) => {
        if (error) {
          console.warn('Supabase: failed to add custom market', error);
          queueWrite('add_custom_market', { tempId, fixtureId, label, odds });
          showToast(`Couldn't save new market yet: ${error.message}. Saved on this device — it'll keep retrying automatically.`);
          return;
        }
        setState((s) => ({
          ...s,
          fixtures: s.fixtures.map((f) =>
            f.id === fixtureId
              ? { ...f, custom_markets: f.custom_markets.map((cm) => (cm.id === tempId ? { id: data.id, label: data.label, odds: data.odds } : cm)) }
              : f
          ),
        }));
      });
    return optimistic;
  }
  const market = { id: `CM${String(customMarketCounter++).padStart(4, '0')}`, label, odds };
  setState((s) => ({ ...s, fixtures: s.fixtures.map((f) => (f.id === fixtureId ? { ...f, custom_markets: [...(f.custom_markets || []), market] } : f)) }));
  return market;
}

// Adds whichever markets from the shared default template (see data.js)
// this fixture doesn't already have — matched by label, case-insensitive.
// For a fixture that was created before a new market was added to that
// template, this is the quick way to backfill it instead of retyping
// every label/odds pair by hand. Already-present markets are left alone
// (including any odds the admin already customized on them).
export function applyDefaultCustomMarkets(fixtureId) {
  const fixture = store.state.fixtures.find((f) => f.id === fixtureId);
  if (!fixture) return 0;
  const existingLabels = new Set((fixture.custom_markets || []).map((cm) => cm.label.trim().toLowerCase()));
  const missing = defaultCustomMarketTemplate().filter((m) => !existingLabels.has(m.label.trim().toLowerCase()));
  missing.forEach((m) => addCustomMarket(fixtureId, m.label, m.odds));
  return missing.length;
}

// Same, but for every fixture in the current league at once — for
// backfilling markets added to the template after fixtures already
// existed, without visiting each fixture one at a time.
export function applyDefaultCustomMarketsToAllFixtures() {
  let total = 0;
  store.state.fixtures.forEach((f) => { total += applyDefaultCustomMarkets(f.id); });
  return total;
}

export function updateCustomMarket(fixtureId, marketId, patch) {
  setState((s) => ({
    ...s,
    fixtures: s.fixtures.map((f) =>
      f.id === fixtureId ? { ...f, custom_markets: (f.custom_markets || []).map((cm) => (cm.id === marketId ? { ...cm, ...patch } : cm)) } : f
    ),
  }));
  // See the same guard on updateScorer above — a market whose add is
  // still in flight has no real row to patch yet.
  if (isSupabaseConfigured && !String(marketId).startsWith('pending-')) {
    supabase.from('custom_markets').update(patch).eq('id', marketId).select()
      .then((res) => {
        if (reportIfWriteFailed('update market', res) === 'error') queueWrite('update_custom_market', { marketId, patch });
      });
  }
}

export function removeCustomMarket(fixtureId, marketId) {
  setState((s) => ({
    ...s,
    fixtures: s.fixtures.map((f) =>
      f.id === fixtureId ? { ...f, custom_markets: (f.custom_markets || []).filter((cm) => cm.id !== marketId) } : f
    ),
  }));
  if (isSupabaseConfigured && !String(marketId).startsWith('pending-')) {
    supabase.from('custom_markets').delete().eq('id', marketId).select()
      .then((res) => {
        if (reportIfWriteFailed('remove market', res) === 'error') queueWrite('remove_custom_market', { marketId });
      });
  }
}

// Books an agent-side (cash) ticket. Returns a Promise now instead of a
// plain object — see the big comment below for why.
//
// This used to compute the ticket's display_id (T00001, T00002, ...)
// itself, add it to local state, and fire the Supabase insert off
// without waiting. Two devices booking around the same moment could
// both land on the same "next" number; whichever insert lost that race
// got rejected by the unique constraint on display_id, and the ticket
// silently never made it into the database at all — it printed a
// receipt and showed "Ticket Submitted" for a ticket that didn't
// actually exist anywhere durable. Now the database assigns the real
// display_id (see the ticket_display_id_seq trigger in schema.sql,
// which is race-proof because nextval() is atomic), and this function
// waits for that insert to actually succeed before returning anything —
// so a failure can be shown as a failure instead of a false success.
export async function bookTicket(customerName, selections, stakeAmount) {
  const totalOdds = selections.reduce((acc, sel) => acc * sel.odds, 1);
  const base = {
    league_name: store.state.league?.name || 'PIPELINE LEAGUE',
    customer_name: customerName,
    stake_amount: stakeAmount,
    total_odds: Number(totalOdds.toFixed(2)),
    potential_return: Number((totalOdds * stakeAmount).toFixed(2)),
    status: 'pending',
    selections,
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured) {
    // Local-dev mode is always a single device — no race is possible,
    // so the simple local counter is fine here.
    const ticket = { id: `T${String(ticketCounter++).padStart(5, '0')}`, ...base };
    setState((s) => ({ ...s, tickets: [ticket, ...s.tickets] }));
    return ticket;
  }

  const { data, error } = await supabase.from('tickets').insert({
    league_id: store.state.league.id,
    league_name: base.league_name,
    customer_name: base.customer_name,
    stake_amount: base.stake_amount,
    total_odds: base.total_odds,
    potential_return: base.potential_return,
    status: base.status,
    selections: base.selections,
  }).select().single();

  if (error) {
    console.warn('Supabase: failed to save ticket', error);
    showToast(`Couldn't save this ticket: ${error.message}. Nothing was booked — please try again.`);
    return null;
  }

  const ticket = mapTicketRow(data);
  setState((s) => ({ ...s, tickets: [ticket, ...s.tickets] }));
  return ticket;
}

// Self-service ticket submission — a customer, not an agent, builds and
// submits this. It starts life as payment_status 'pending_payment': the
// customer still has to actually send the money (to the account shown by
// paymentInfoBannerHtml) OUTSIDE the app, and an admin has to manually
// confirm it landed (see confirmTicketPayment below) before it's treated
// as a real, active ticket. Nothing here moves or holds money — see
// README "How money works". Returns a Promise — see the comment on
// bookTicket() above for why display_id is no longer assigned here.
export async function submitCustomerTicket(user, selections, stakeAmount) {
  const totalOdds = selections.reduce((acc, sel) => acc * sel.odds, 1);
  const customerName = user?.name || user?.email || 'Customer';
  const base = {
    league_name: store.state.league?.name || 'PIPELINE LEAGUE',
    customer_name: customerName,
    stake_amount: stakeAmount,
    total_odds: Number(totalOdds.toFixed(2)),
    potential_return: Number((totalOdds * stakeAmount).toFixed(2)),
    status: 'pending',
    selections,
    payment_status: 'pending_payment',
    user_id: user?.id || null,
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured) {
    const ticket = { id: `T${String(ticketCounter++).padStart(5, '0')}`, ...base };
    setState((s) => ({ ...s, tickets: [ticket, ...s.tickets] }));
    return ticket;
  }

  const { data, error } = await supabase.from('tickets').insert({
    league_id: store.state.league.id,
    league_name: base.league_name,
    customer_name: base.customer_name,
    stake_amount: base.stake_amount,
    total_odds: base.total_odds,
    potential_return: base.potential_return,
    status: base.status,
    selections: base.selections,
    payment_status: base.payment_status,
    user_id: base.user_id,
  }).select().single();

  if (error) {
    console.warn('Supabase: failed to submit ticket', error);
    showToast(`Couldn't submit this ticket: ${error.message}. Nothing was booked — please try again.`);
    return null;
  }

  const ticket = mapTicketRow(data);
  setState((s) => ({ ...s, tickets: [ticket, ...s.tickets] }));
  return ticket;
}

// Admin action from the Payment Approval Queue: marks a self-service
// ticket's claimed payment as confirmed (it now behaves exactly like an
// agent-booked ticket — eligible for settlement) or rejected.
export function confirmTicketPayment(ticketDisplayId) {
  setState((s) => ({
    ...s,
    tickets: s.tickets.map((t) => (t.id === ticketDisplayId ? { ...t, payment_status: 'confirmed' } : t)),
  }));
  if (isSupabaseConfigured) {
    supabase.from('tickets').update({ payment_status: 'confirmed' }).eq('display_id', ticketDisplayId).select()
      .then((res) => {
        if (reportIfWriteFailed('confirm payment', res) === 'error') queueWrite('confirm_payment', { ticketDisplayId });
      });
  }
}

export function rejectTicketPayment(ticketDisplayId, reason) {
  setState((s) => ({
    ...s,
    tickets: s.tickets.map((t) => (t.id === ticketDisplayId ? { ...t, payment_status: 'rejected', rejection_reason: reason || '' } : t)),
  }));
  if (isSupabaseConfigured) {
    supabase.from('tickets').update({ payment_status: 'rejected', rejection_reason: reason || '' }).eq('display_id', ticketDisplayId).select()
      .then((res) => {
        if (reportIfWriteFailed('reject payment', res) === 'error') queueWrite('reject_payment', { ticketDisplayId, reason });
      });
  }
}

// ---------------------------------------------------------------------
// Pending writes queue — every admin write that fails to reach Supabase
// (almost always "TypeError: Failed to fetch" from a dropped connection,
// not a real rejection) gets remembered here and retried automatically:
// on startup, whenever the browser comes back online, and from the
// "Retry Now" button that shows up in Admin > Settlement whenever this
// queue isn't empty. This used to exist only for settle_fixture — every
// other admin action (editing odds, adding a market, confirming a
// payment, etc.) just showed a toast and otherwise silently lost the
// change on the next refresh, the exact same way settlements used to.
// ---------------------------------------------------------------------
const PENDING_WRITES_KEY = 'shabet_pending_writes_v1';
const LEGACY_PENDING_SETTLEMENTS_KEY = 'shabet_pending_settlements_v1'; // pre-generalization queue, migrated below

function getPendingWrites() {
  try {
    const raw = localStorage.getItem(PENDING_WRITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function savePendingWrites(list) {
  try {
    localStorage.setItem(PENDING_WRITES_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Could not persist pending writes queue.', e);
  }
  notify(); // let the Settlement tab's "pending sync" badge re-render
}

// One-time migration: fold anything left over in the old settlement-only
// queue into the general one, tagged with its kind, then retire the old
// key so this only ever runs once.
(function migrateLegacyPendingSettlements() {
  try {
    const raw = localStorage.getItem(LEGACY_PENDING_SETTLEMENTS_KEY);
    if (!raw) return;
    const legacy = JSON.parse(raw) || [];
    if (legacy.length > 0) {
      const list = getPendingWrites();
      legacy.forEach((entry) => list.push({ kind: 'settle_fixture', payload: entry, queuedAt: entry.queuedAt || new Date().toISOString() }));
      localStorage.setItem(PENDING_WRITES_KEY, JSON.stringify(list));
    }
    localStorage.removeItem(LEGACY_PENDING_SETTLEMENTS_KEY);
  } catch (e) {
    console.warn('Could not migrate legacy pending-settlements queue.', e);
  }
})();

export function getPendingSettlementsCount() {
  return getPendingWrites().length;
}

// Keyed so a second edit to the same thing (e.g. tweaking a fixture's
// odds twice while offline) replaces the queued attempt instead of
// stacking up two retries that would just race each other.
function pendingWriteKey(kind, payload) {
  switch (kind) {
    case 'settle_fixture': return `settle_fixture:${payload.fixtureId}`;
    case 'update_league': return 'update_league';
    case 'update_fixture': return `update_fixture:${payload.fixtureId}`;
    case 'update_player': return `update_player:${payload.playerId}`;
    case 'add_scorer': return `add_scorer:${payload.tempId}`;
    case 'update_scorer': return `update_scorer:${payload.scorerId}`;
    case 'remove_scorer': return `remove_scorer:${payload.scorerId}`;
    case 'add_card': return `add_card:${payload.tempId}`;
    case 'update_card': return `update_card:${payload.cardId}`;
    case 'remove_card': return `remove_card:${payload.cardId}`;
    case 'add_custom_market': return `add_custom_market:${payload.tempId}`;
    case 'update_custom_market': return `update_custom_market:${payload.marketId}`;
    case 'remove_custom_market': return `remove_custom_market:${payload.marketId}`;
    case 'confirm_payment': return `payment:${payload.ticketDisplayId}`;
    case 'reject_payment': return `payment:${payload.ticketDisplayId}`;
    case 'delete_user': return `delete_user:${payload.userId}`;
    default: return `${kind}:${JSON.stringify(payload)}`;
  }
}

function queueWrite(kind, payload) {
  const key = pendingWriteKey(kind, payload);
  const list = getPendingWrites();
  const existingIndex = list.findIndex((w) => pendingWriteKey(w.kind, w.payload) === key);
  if (existingIndex !== -1 && payload.patch && list[existingIndex].payload.patch) {
    // Merge partial patches to the same row instead of one clobbering the
    // other — e.g. renaming the league and separately editing the payment
    // account both queue as 'update_league' and must land together.
    list[existingIndex] = { kind, payload: { ...list[existingIndex].payload, ...payload, patch: { ...list[existingIndex].payload.patch, ...payload.patch } }, queuedAt: new Date().toISOString() };
    savePendingWrites(list);
    return;
  }
  const filtered = list.filter((w) => pendingWriteKey(w.kind, w.payload) !== key);
  filtered.push({ kind, payload, queuedAt: new Date().toISOString() });
  savePendingWrites(filtered);
}

// Actually performs one queued write against Supabase. Returns true on
// success (so the caller removes it from the queue) — false leaves it
// queued for the next retry pass.
async function attemptPendingWrite(entry) {
  const { kind, payload } = entry;
  try {
    switch (kind) {
      case 'settle_fixture': {
        const { error } = await supabase.rpc('settle_fixture', {
          p_fixture_id: payload.fixtureId,
          p_home_score: payload.homeScore,
          p_away_score: payload.awayScore,
          p_scorer_ids: payload.scorerIds || [],
          p_custom_market_win_ids: payload.customMarketWinIds || [],
          p_card_ids: payload.cardIds || [],
        });
        if (error) throw error;
        showToast(`Synced a previously-failed settlement (fixture settled ${payload.homeScore}-${payload.awayScore}).`);
        return true;
      }
      case 'update_league': {
        const { error } = await supabase.from('leagues').update(payload.patch).eq('id', payload.leagueId);
        if (error) throw error;
        return true;
      }
      case 'update_fixture': {
        const { error } = await supabase.from('fixtures').update(payload.patch).eq('id', payload.fixtureId);
        if (error) throw error;
        return true;
      }
      case 'update_player': {
        const { error } = await supabase.from('players').update(payload.patch).eq('id', payload.playerId);
        if (error) throw error;
        return true;
      }
      case 'add_scorer': {
        const { data, error } = await supabase.from('scorers')
          .insert({ league_id: payload.leagueId, team_id: payload.teamId, name: payload.name, odds: payload.odds })
          .select().single();
        if (error) throw error;
        setState((s) => ({
          ...s,
          scorers: (s.scorers || []).map((sc) => (sc.id === payload.tempId ? { id: data.id, team: payload.team, name: data.name, odds: Number(data.odds) } : sc)),
        }));
        return true;
      }
      case 'update_scorer': {
        const { error } = await supabase.from('scorers').update(payload.dbPatch).eq('id', payload.scorerId);
        if (error) throw error;
        return true;
      }
      case 'remove_scorer': {
        const { error } = await supabase.from('scorers').delete().eq('id', payload.scorerId);
        if (error) throw error;
        return true;
      }
      case 'add_card': {
        const { data, error } = await supabase.from('cards')
          .insert({ league_id: payload.leagueId, team_id: payload.teamId, name: payload.name, card_type: payload.cardType, odds: payload.odds })
          .select().single();
        if (error) throw error;
        setState((s) => ({
          ...s,
          cards: (s.cards || []).map((cd) => (cd.id === payload.tempId ? { id: data.id, team: payload.team, name: data.name, card_type: data.card_type, odds: Number(data.odds) } : cd)),
        }));
        return true;
      }
      case 'update_card': {
        const { error } = await supabase.from('cards').update(payload.dbPatch).eq('id', payload.cardId);
        if (error) throw error;
        return true;
      }
      case 'remove_card': {
        const { error } = await supabase.from('cards').delete().eq('id', payload.cardId);
        if (error) throw error;
        return true;
      }
      case 'add_custom_market': {
        const { data, error } = await supabase.from('custom_markets')
          .insert({ fixture_id: payload.fixtureId, label: payload.label, odds: payload.odds })
          .select().single();
        if (error) throw error;
        setState((s) => ({
          ...s,
          fixtures: s.fixtures.map((f) =>
            f.id === payload.fixtureId
              ? { ...f, custom_markets: f.custom_markets.map((cm) => (cm.id === payload.tempId ? { id: data.id, label: data.label, odds: Number(data.odds) } : cm)) }
              : f
          ),
        }));
        return true;
      }
      case 'update_custom_market': {
        const { error } = await supabase.from('custom_markets').update(payload.patch).eq('id', payload.marketId);
        if (error) throw error;
        return true;
      }
      case 'remove_custom_market': {
        const { error } = await supabase.from('custom_markets').delete().eq('id', payload.marketId);
        if (error) throw error;
        return true;
      }
      case 'confirm_payment': {
        const { error } = await supabase.from('tickets').update({ payment_status: 'confirmed' }).eq('display_id', payload.ticketDisplayId);
        if (error) throw error;
        return true;
      }
      case 'reject_payment': {
        const { error } = await supabase.from('tickets').update({ payment_status: 'rejected', rejection_reason: payload.reason || '' }).eq('display_id', payload.ticketDisplayId);
        if (error) throw error;
        return true;
      }
      case 'delete_user': {
        const { error } = await supabase.rpc('admin_delete_user', { p_user_id: payload.userId });
        if (error) throw error;
        return true;
      }
      default:
        console.warn('Unknown pending write kind, dropping it', kind);
        return true; // drop unrecognized entries rather than retry forever
    }
  } catch (error) {
    console.warn(`Supabase: retry of queued ${kind} failed`, payload, error);
    return false;
  }
}

// Retries every write that previously failed to reach Supabase — called
// on startup, whenever the browser comes back online, and from the
// manual "Retry Now" button in Admin > Settlement. Each one that
// succeeds is removed from the queue; failures stay queued for next time.
export async function retryPendingSettlements() {
  const pending = getPendingWrites();
  if (pending.length === 0) return;

  // Re-apply every queued settlement to the local view immediately — a
  // page reload re-fetches the (still-unsettled) server state and would
  // otherwise make these look "open" again while the network retry below
  // is in flight or still failing. Everything else queued (odds tweaks,
  // market edits, payment confirmations, etc.) is already reflected in
  // local state from when it was first attempted, since setState() ran
  // before the failed Supabase call in every write function below.
  setState((s) => pending.reduce(
    (acc, w) => (w.kind === 'settle_fixture'
      ? settleFixtureLocally(acc, w.payload.fixtureId, w.payload.homeScore, w.payload.awayScore, w.payload.scorerIds || [], w.payload.customMarketWinIds || [], w.payload.cardIds || [])
      : acc),
    s
  ));

  if (!isSupabaseConfigured) return;

  const stillPending = [];
  for (const entry of pending) {
    const ok = await attemptPendingWrite(entry);
    if (!ok) stillPending.push(entry);
  }
  savePendingWrites(stillPending);
}

export function settleFixture(fixtureId, homeScore, awayScore, scorerIds = [], customMarketWinIds = [], cardIds = []) {
  setState((s) => settleFixtureLocally(s, fixtureId, homeScore, awayScore, scorerIds, customMarketWinIds, cardIds));
  if (isSupabaseConfigured) {
    supabase.rpc('settle_fixture', {
      p_fixture_id: fixtureId,
      p_home_score: homeScore,
      p_away_score: awayScore,
      p_scorer_ids: scorerIds,
      p_custom_market_win_ids: customMarketWinIds,
      p_card_ids: cardIds,
    }).then(({ error }) => {
      if (error) {
        console.warn('Supabase: failed to settle fixture', error);
        // Remembered in a queue that survives refreshes and auto-retries
        // (on reconnect, and on every app load) — the toast used to warn
        // this would "look open again after a refresh", which is no
        // longer true: the queued entry re-applies itself locally too
        // (see retryPendingSettlements above).
        queueWrite('settle_fixture', { fixtureId, homeScore, awayScore, scorerIds, customMarketWinIds, cardIds });
        showToast(
          `Settlement didn't reach the database yet: ${error.message}. It's saved on this device and ` +
          `will keep retrying automatically — check Admin > Settlement for sync status.`
        );
      }
    }).catch((err) => {
      console.warn('Supabase: settle_fixture request failed to even send', err);
      queueWrite('settle_fixture', { fixtureId, homeScore, awayScore, scorerIds, customMarketWinIds, cardIds });
      showToast(
        `Settlement didn't reach the database yet (${err.message || 'network error'}). It's saved on this ` +
        `device and will keep retrying automatically — check Admin > Settlement for sync status.`
      );
    });
  }
}

// =======================================================================
// Remote (Supabase) initial load + realtime sync
// =======================================================================

function mapCustomMarketRow(row) {
  return { id: row.id, label: row.label, odds: Number(row.odds) };
}

function mapFixtureRow(row, customMarketsByFixture) {
  return {
    id: row.id,
    matchday: row.matchday,
    date_string: row.date_string,
    kickoff_time: row.kickoff_time,
    home_team: row.home_team,
    away_team: row.away_team,
    status: row.status,
    home_score: row.home_score,
    away_score: row.away_score,
    odd_1: Number(row.odd_1),
    odd_x: Number(row.odd_x),
    odd_2: Number(row.odd_2),
    odd_over_2_5: Number(row.odd_over_2_5),
    odd_over_3_5: Number(row.odd_over_3_5),
    odd_btts: Number(row.odd_btts),
    scorers_confirmed: row.scorers_confirmed || [],
    cards_confirmed: row.cards_confirmed || [],
    custom_markets_won: row.custom_markets_won || [],
    custom_markets: (customMarketsByFixture[row.id] || []).map(mapCustomMarketRow),
  };
}

function mapScorerRow(row, playersById) {
  return { id: row.id, team: row.team_id ? (playersById[row.team_id] || '') : '', name: row.name, odds: Number(row.odds) };
}

function mapCardRow(row, playersById) {
  return { id: row.id, team: row.team_id ? (playersById[row.team_id] || '') : '', name: row.name, card_type: row.card_type || 'yellow', odds: Number(row.odds) };
}

function mapProfileRow(row) {
  return { id: row.id, full_name: row.full_name || '', phone: row.phone || '', email: row.email || '', created_at: row.created_at };
}

function mapTicketRow(row) {
  return {
    id: row.display_id,
    league_name: row.league_name,
    customer_name: row.customer_name,
    stake_amount: Number(row.stake_amount),
    total_odds: Number(row.total_odds),
    potential_return: Number(row.potential_return),
    status: row.status,
    selections: row.selections || [],
    payment_status: row.payment_status || null, // null = agent-booked ticket, no payment claim to track
    user_id: row.user_id || null,
    rejection_reason: row.rejection_reason || '',
    created_at: row.created_at,
  };
}

async function fetchAllFromSupabase() {
  const { data: league, error: leagueErr } = await supabase.from('leagues').select('*').eq('is_active', true).order('created_at').limit(1).single();
  if (leagueErr || !league) {
    console.warn('Supabase: no active league found — run supabase/schema.sql and supabase/seed.sql first.', leagueErr);
    return;
  }

  const [{ data: players }, { data: fixtures }, { data: scorers }, { data: cards }, { data: tickets }, { data: profiles }] = await Promise.all([
    supabase.from('players').select('*').eq('league_id', league.id),
    supabase.from('fixtures').select('*').eq('league_id', league.id).order('matchday'),
    supabase.from('scorers').select('*').eq('league_id', league.id),
    supabase.from('cards').select('*').eq('league_id', league.id),
    supabase.from('tickets').select('*').eq('league_id', league.id).order('created_at', { ascending: false }),
    // Not league-scoped (profiles are global to the auth user), and will
    // simply come back empty/RLS-filtered for non-staff accounts.
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
  ]);

  const fixtureIds = (fixtures || []).map((f) => f.id);
  const { data: customMarkets } = fixtureIds.length
    ? await supabase.from('custom_markets').select('*').in('fixture_id', fixtureIds)
    : { data: [] };

  const customMarketsByFixture = {};
  for (const cm of customMarkets || []) {
    (customMarketsByFixture[cm.fixture_id] ||= []).push(cm);
  }

  const playersById = {};
  for (const p of players || []) playersById[p.id] = p.player_name;

  const newState = {
    league: {
      id: league.id,
      name: league.name,
      payment_bank_name: league.payment_bank_name || '',
      payment_account_number: league.payment_account_number || '',
      payment_account_name: league.payment_account_name || '',
    },
    players: (players || []).map((p) => ({ id: p.id, player_name: p.player_name, status: p.status })),
    fixtures: (fixtures || []).map((f) => mapFixtureRow(f, customMarketsByFixture)),
    scorers: (scorers || []).map((sc) => mapScorerRow(sc, playersById)),
    cards: (cards || []).map((cd) => mapCardRow(cd, playersById)),
    tickets: (tickets || []).map(mapTicketRow),
    profiles: (profiles || []).map(mapProfileRow),
  };

  store.state = newState;
  seedCountersFrom(newState);
  persistLocal(); // keep an offline cache of the live data
  notify();
}

function applyRealtimeFixtureChange(payload) {
  setState((s) => {
    if (payload.eventType === 'DELETE') {
      return { ...s, fixtures: s.fixtures.filter((f) => f.id !== payload.old.id) };
    }
    const existing = s.fixtures.find((f) => f.id === payload.new.id);
    const merged = mapFixtureRow(payload.new, { [payload.new.id]: (existing?.custom_markets || []).map((cm) => ({ id: cm.id, label: cm.label, odds: cm.odds })) });
    const found = s.fixtures.some((f) => f.id === payload.new.id);
    return {
      ...s,
      fixtures: found ? s.fixtures.map((f) => (f.id === payload.new.id ? merged : f)) : [...s.fixtures, merged],
    };
  });
}

function applyRealtimeCustomMarketChange(payload) {
  const fixtureId = payload.new?.fixture_id || payload.old?.fixture_id;
  if (!fixtureId) return;
  setState((s) => ({
    ...s,
    fixtures: s.fixtures.map((f) => {
      if (f.id !== fixtureId) return f;
      if (payload.eventType === 'DELETE') {
        return { ...f, custom_markets: (f.custom_markets || []).filter((cm) => cm.id !== payload.old.id) };
      }
      const mapped = mapCustomMarketRow(payload.new);
      const exists = (f.custom_markets || []).some((cm) => cm.id === mapped.id);
      return {
        ...f,
        custom_markets: exists
          ? f.custom_markets.map((cm) => (cm.id === mapped.id ? mapped : cm))
          : [...(f.custom_markets || []), mapped],
      };
    }),
  }));
}

function applyRealtimePlayerChange(payload) {
  setState((s) => {
    if (payload.eventType === 'DELETE') return { ...s, players: s.players.filter((p) => p.id !== payload.old.id) };
    const mapped = { id: payload.new.id, player_name: payload.new.player_name, status: payload.new.status };
    const exists = s.players.some((p) => p.id === mapped.id);
    return { ...s, players: exists ? s.players.map((p) => (p.id === mapped.id ? mapped : p)) : [...s.players, mapped] };
  });
}

function applyRealtimeScorerChange(payload) {
  setState((s) => {
    const playersById = {};
    for (const p of s.players) playersById[p.id] = p.player_name;
    if (payload.eventType === 'DELETE') return { ...s, scorers: s.scorers.filter((sc) => sc.id !== payload.old.id) };
    const mapped = mapScorerRow(payload.new, playersById);
    const exists = s.scorers.some((sc) => sc.id === mapped.id);
    return { ...s, scorers: exists ? s.scorers.map((sc) => (sc.id === mapped.id ? mapped : sc)) : [...s.scorers, mapped] };
  });
}

function applyRealtimeCardChange(payload) {
  setState((s) => {
    const playersById = {};
    for (const p of s.players) playersById[p.id] = p.player_name;
    if (payload.eventType === 'DELETE') return { ...s, cards: (s.cards || []).filter((cd) => cd.id !== payload.old.id) };
    const mapped = mapCardRow(payload.new, playersById);
    const exists = (s.cards || []).some((cd) => cd.id === mapped.id);
    return { ...s, cards: exists ? s.cards.map((cd) => (cd.id === mapped.id ? mapped : cd)) : [...(s.cards || []), mapped] };
  });
}

function applyRealtimeTicketChange(payload) {
  setState((s) => {
    if (payload.eventType === 'DELETE') return { ...s, tickets: s.tickets.filter((t) => t.id !== payload.old.display_id) };
    const mapped = mapTicketRow(payload.new);
    const exists = s.tickets.some((t) => t.id === mapped.id);
    return { ...s, tickets: exists ? s.tickets.map((t) => (t.id === mapped.id ? mapped : t)) : [mapped, ...s.tickets] };
  });
}

function applyRealtimeLeagueChange(payload) {
  if (payload.eventType === 'DELETE') return;
  setState((s) => (s.league.id === payload.new.id ? {
    ...s,
    league: {
      id: payload.new.id,
      name: payload.new.name,
      payment_bank_name: payload.new.payment_bank_name || '',
      payment_account_number: payload.new.payment_account_number || '',
      payment_account_name: payload.new.payment_account_name || '',
    },
  } : s));
}

function applyRealtimeProfileChange(payload) {
  setState((s) => {
    if (payload.eventType === 'DELETE') return { ...s, profiles: s.profiles.filter((p) => p.id !== payload.old.id) };
    const mapped = mapProfileRow(payload.new);
    const exists = s.profiles.some((p) => p.id === mapped.id);
    return { ...s, profiles: exists ? s.profiles.map((p) => (p.id === mapped.id ? mapped : p)) : [mapped, ...s.profiles] };
  });
}

function startRealtimeSync() {
  supabase
    .channel('shabet-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, applyRealtimeFixtureChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_markets' }, applyRealtimeCustomMarketChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, applyRealtimePlayerChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scorers' }, applyRealtimeScorerChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, applyRealtimeCardChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, applyRealtimeTicketChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leagues' }, applyRealtimeLeagueChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, applyRealtimeProfileChange)
    .subscribe();
}

if (isSupabaseConfigured) {
  fetchAllFromSupabase()
    .then(startRealtimeSync)
    .then(retryPendingSettlements)
    .catch((e) => console.warn('Supabase: initial load failed, staying on cached/local data.', e));
} else {
  retryPendingSettlements();
}

// Whenever the device's connection comes back (e.g. the shop's wifi drops
// mid-settlement and reconnects a minute later), immediately try to flush
// anything still queued instead of waiting for the next page load.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { retryPendingSettlements(); });
}
