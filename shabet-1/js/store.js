import { buildInitialFixtures, buildInitialPlayers, buildInitialScorers, buildDefaultCustomMarkets } from './data.js';
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
function reportIfWriteFailed(action, { data, error }) {
  if (error) {
    console.warn(`Supabase: ${action} failed`, error);
    showToast(`Couldn't save (${action}): ${error.message}`);
    return true;
  }
  if (Array.isArray(data) && data.length === 0) {
    console.warn(`Supabase: ${action} affected 0 rows — likely blocked by a permissions policy.`);
    showToast(
      `"${action}" didn't save — this account may not have admin permissions yet. ` +
      `If admin access was just granted, sign out and back in for it to take effect.`
    );
    return true;
  }
  return false;
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
let customMarketCounter = 1;

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged = { league: { name: 'PIPELINE LEAGUE' }, scorers: [], ...parsed };
      if (!merged.scorers || merged.scorers.length === 0) {
        merged.scorers = buildInitialScorers();
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
    league: { name: 'PIPELINE LEAGUE' },
    fixtures: buildInitialFixtures(),
    players: buildInitialPlayers(),
    scorers: buildInitialScorers(),
    tickets: [],
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
    case 'CUSTOM': return (fixture.custom_markets_won || []).includes(sel.custom_market_id) ? 'won' : 'lost';
    default: return 'pending';
  }
}

function settleFixtureLocally(state, fixtureId, homeScore, awayScore, scorerIds, customMarketWinIds) {
  const fixtures = state.fixtures.map((f) =>
    f.id === fixtureId
      ? { ...f, status: 'completed', home_score: homeScore, away_score: awayScore, scorers_confirmed: scorerIds, custom_markets_won: customMarketWinIds }
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

export function getFinancials() {
  const tickets = store.state.tickets;
  const totalStakes = tickets.reduce((sum, t) => sum + t.stake_amount, 0);
  const totalPayoutsDue = tickets.filter((t) => t.status === 'won').reduce((sum, t) => sum + t.potential_return, 0);
  const pendingLiability = tickets.filter((t) => t.status === 'pending').reduce((sum, t) => sum + t.potential_return, 0);
  return { totalStakes, totalPayoutsDue, pendingLiability, netProfit: totalStakes - totalPayoutsDue };
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
    supabase.from('tickets').insert({
      display_id: remapped.id,
      league_id: store.state.league.id,
      league_name: remapped.league_name,
      customer_name: remapped.customer_name,
      stake_amount: remapped.stake_amount,
      total_odds: remapped.total_odds,
      potential_return: remapped.potential_return,
      status: remapped.status,
      selections: remapped.selections,
    }).then(({ error }) => error && (console.warn('Supabase: failed to import ticket', error), showToast(`Couldn't import ticket ${remapped.id}: ${error.message}`)));
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
    supabase.from('leagues').update({ name }).eq('id', store.state.league.id).select()
      .then((res) => reportIfWriteFailed('rename league', res));
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
        .then((res) => reportIfWriteFailed('update fixture', res));
    }
  }
}

export function updatePlayer(playerId, patch) {
  setState((s) => ({ ...s, players: s.players.map((p) => (p.id === playerId ? { ...p, ...patch } : p)) }));
  if (isSupabaseConfigured) {
    supabase.from('players').update(patch).eq('id', playerId).select()
      .then((res) => reportIfWriteFailed('update team', res));
  }
}

export function addScorer(team, name, odds) {
  if (isSupabaseConfigured) {
    const teamId = store.state.players.find((p) => p.player_name === team)?.id || null;
    const tempId = `pending-${Date.now()}`;
    const optimistic = { id: tempId, team, name, odds };
    setState((s) => ({ ...s, scorers: [...(s.scorers || []), optimistic] }));

    supabase.from('scorers').insert({ league_id: store.state.league.id, team_id: teamId, name, odds }).select().single()
      .then(({ data, error }) => {
        if (error) { console.warn('Supabase: failed to add scorer', error); showToast(`Couldn't save new player: ${error.message}`); return; }
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
  if (isSupabaseConfigured) {
    const { team, ...rest } = patch; // team is resolved to team_id server-side, not a real column value here
    const dbPatch = { ...rest };
    if (team !== undefined) {
      dbPatch.team_id = store.state.players.find((p) => p.player_name === team)?.id || null;
    }
    supabase.from('scorers').update(dbPatch).eq('id', scorerId).select()
      .then((res) => reportIfWriteFailed('update player odds', res));
  }
}

export function removeScorer(scorerId) {
  setState((s) => ({ ...s, scorers: (s.scorers || []).filter((sc) => sc.id !== scorerId) }));
  if (isSupabaseConfigured) {
    supabase.from('scorers').delete().eq('id', scorerId).select()
      .then((res) => reportIfWriteFailed('remove player', res));
  }
}

export function addCustomMarket(fixtureId, label, odds) {
  if (isSupabaseConfigured) {
    const tempId = `pending-${Date.now()}`;
    const optimistic = { id: tempId, label, odds };
    setState((s) => ({
      ...s,
      fixtures: s.fixtures.map((f) => (f.id === fixtureId ? { ...f, custom_markets: [...(f.custom_markets || []), optimistic] } : f)),
    }));

    supabase.from('custom_markets').insert({ fixture_id: fixtureId, label, odds }).select().single()
      .then(({ data, error }) => {
        if (error) { console.warn('Supabase: failed to add custom market', error); showToast(`Couldn't save new market: ${error.message}`); return; }
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

export function updateCustomMarket(fixtureId, marketId, patch) {
  setState((s) => ({
    ...s,
    fixtures: s.fixtures.map((f) =>
      f.id === fixtureId ? { ...f, custom_markets: (f.custom_markets || []).map((cm) => (cm.id === marketId ? { ...cm, ...patch } : cm)) } : f
    ),
  }));
  if (isSupabaseConfigured) {
    supabase.from('custom_markets').update(patch).eq('id', marketId).select()
      .then((res) => reportIfWriteFailed('update market', res));
  }
}

export function removeCustomMarket(fixtureId, marketId) {
  setState((s) => ({
    ...s,
    fixtures: s.fixtures.map((f) =>
      f.id === fixtureId ? { ...f, custom_markets: (f.custom_markets || []).filter((cm) => cm.id !== marketId) } : f
    ),
  }));
  if (isSupabaseConfigured) {
    supabase.from('custom_markets').delete().eq('id', marketId).select()
      .then((res) => reportIfWriteFailed('remove market', res));
  }
}

export function bookTicket(customerName, selections, stakeAmount) {
  const totalOdds = selections.reduce((acc, sel) => acc * sel.odds, 1);
  const ticket = {
    id: `T${String(ticketCounter++).padStart(5, '0')}`,
    league_name: store.state.league?.name || 'PIPELINE LEAGUE',
    customer_name: customerName,
    stake_amount: stakeAmount,
    total_odds: Number(totalOdds.toFixed(2)),
    potential_return: Number((totalOdds * stakeAmount).toFixed(2)),
    status: 'pending',
    selections,
    created_at: new Date().toISOString(),
  };
  setState((s) => ({ ...s, tickets: [ticket, ...s.tickets] }));

  if (isSupabaseConfigured) {
    supabase.from('tickets').insert({
      display_id: ticket.id,
      league_id: store.state.league.id,
      league_name: ticket.league_name,
      customer_name: ticket.customer_name,
      stake_amount: ticket.stake_amount,
      total_odds: ticket.total_odds,
      potential_return: ticket.potential_return,
      status: ticket.status,
      selections: ticket.selections,
    }).then(({ error }) => error && (console.warn('Supabase: failed to save ticket', error), showToast(`This ticket printed but did NOT save to the database: ${error.message}`)));
  }
  return ticket; // returned synchronously — the receipt/print flow depends on this
}

export function settleFixture(fixtureId, homeScore, awayScore, scorerIds = [], customMarketWinIds = []) {
  setState((s) => settleFixtureLocally(s, fixtureId, homeScore, awayScore, scorerIds, customMarketWinIds));
  if (isSupabaseConfigured) {
    supabase.rpc('settle_fixture', {
      p_fixture_id: fixtureId,
      p_home_score: homeScore,
      p_away_score: awayScore,
      p_scorer_ids: scorerIds,
      p_custom_market_win_ids: customMarketWinIds,
    }).then(({ error }) => {
      if (error) {
        console.warn('Supabase: failed to settle fixture', error);
        showToast(`Settlement didn't save to the database: ${error.message}. It will look "open" again after a refresh until this is fixed.`);
      }
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
    custom_markets_won: row.custom_markets_won || [],
    custom_markets: (customMarketsByFixture[row.id] || []).map(mapCustomMarketRow),
  };
}

function mapScorerRow(row, playersById) {
  return { id: row.id, team: row.team_id ? (playersById[row.team_id] || '') : '', name: row.name, odds: Number(row.odds) };
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
    created_at: row.created_at,
  };
}

async function fetchAllFromSupabase() {
  const { data: league, error: leagueErr } = await supabase.from('leagues').select('*').eq('is_active', true).order('created_at').limit(1).single();
  if (leagueErr || !league) {
    console.warn('Supabase: no active league found — run supabase/schema.sql and supabase/seed.sql first.', leagueErr);
    return;
  }

  const [{ data: players }, { data: fixtures }, { data: scorers }, { data: tickets }] = await Promise.all([
    supabase.from('players').select('*').eq('league_id', league.id),
    supabase.from('fixtures').select('*').eq('league_id', league.id).order('matchday'),
    supabase.from('scorers').select('*').eq('league_id', league.id),
    supabase.from('tickets').select('*').eq('league_id', league.id).order('created_at', { ascending: false }),
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
    league: { id: league.id, name: league.name },
    players: (players || []).map((p) => ({ id: p.id, player_name: p.player_name, status: p.status })),
    fixtures: (fixtures || []).map((f) => mapFixtureRow(f, customMarketsByFixture)),
    scorers: (scorers || []).map((sc) => mapScorerRow(sc, playersById)),
    tickets: (tickets || []).map(mapTicketRow),
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
  setState((s) => (s.league.id === payload.new.id ? { ...s, league: { id: payload.new.id, name: payload.new.name } } : s));
}

function startRealtimeSync() {
  supabase
    .channel('shabet-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, applyRealtimeFixtureChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_markets' }, applyRealtimeCustomMarketChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, applyRealtimePlayerChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scorers' }, applyRealtimeScorerChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, applyRealtimeTicketChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leagues' }, applyRealtimeLeagueChange)
    .subscribe();
}

if (isSupabaseConfigured) {
  fetchAllFromSupabase()
    .then(startRealtimeSync)
    .catch((e) => console.warn('Supabase: initial load failed, staying on cached/local data.', e));
}
