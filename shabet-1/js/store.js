import { buildInitialFixtures, buildInitialPlayers } from './data.js';

const STORAGE_KEY = 'shabet_state_v1';
const DRAFT_KEY = 'shabet_draft_slip_v1';

let ticketCounter = 1;
const listeners = new Set();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { league: { name: 'PIPELINE LEAGUE' }, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load saved state, starting fresh.', e);
  }
  return {
    league: { name: 'PIPELINE LEAGUE' },
    fixtures: buildInitialFixtures(),
    players: buildInitialPlayers(),
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

export const store = {
  state: loadState(),
  draftSlip: loadDraft(),
};

// Seed the running ticket counter from anything already saved.
(function seedCounter() {
  const maxNum = store.state.tickets.reduce((max, t) => {
    const n = parseInt(String(t.id).replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  ticketCounter = maxNum + 1;
})();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function persist() {
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

function notify() {
  listeners.forEach((fn) => fn());
}

export function setState(patch) {
  store.state = typeof patch === 'function' ? patch(store.state) : { ...store.state, ...patch };
  persist();
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

export function updateLeagueName(name) {
  setState((s) => ({ ...s, league: { ...s.league, name } }));
}

export function updateFixture(fixtureId, patch) {
  setState((s) => ({
    ...s,
    fixtures: s.fixtures.map((f) => (f.id === fixtureId ? { ...f, ...patch } : f)),
  }));
}

export function updatePlayer(playerId, patch) {
  setState((s) => ({
    ...s,
    players: s.players.map((p) => (p.id === playerId ? { ...p, ...patch } : p)),
  }));
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
    status: 'pending', // 'pending' | 'won' | 'lost'
    selections,
    created_at: new Date().toISOString(),
  };
  setState((s) => ({ ...s, tickets: [ticket, ...s.tickets] }));
  return ticket;
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
    case 'SCORER': return 'pending';
    default: return 'pending';
  }
}

// Settlement engine: called after admin sets a final score on a fixture.
// Re-evaluates every ticket that touched that fixture.
export function settleFixture(fixtureId, homeScore, awayScore) {
  setState((s) => {
    const fixtures = s.fixtures.map((f) =>
      f.id === fixtureId
        ? { ...f, status: 'completed', home_score: homeScore, away_score: awayScore }
        : f
    );
    const updatedFixture = fixtures.find((f) => f.id === fixtureId);

    const tickets = s.tickets.map((ticket) => {
      const touchesFixture = ticket.selections.some((sel) => sel.fixture_id === fixtureId);
      if (!touchesFixture) return ticket;

      const selections = ticket.selections.map((sel) =>
        sel.fixture_id === fixtureId
          ? { ...sel, result: evaluateSelection(sel, updatedFixture) }
          : sel
      );

      const anyLost = selections.some((sel) => sel.result === 'lost');
      const allDecided = selections.every((sel) => sel.result === 'won' || sel.result === 'lost');

      let status = 'pending';
      if (anyLost) status = 'lost';
      else if (allDecided) status = 'won';

      return { ...ticket, selections, status };
    });

    return { ...s, fixtures, tickets };
  });
}

export function getFinancials() {
  const tickets = store.state.tickets;
  const totalStakes = tickets.reduce((sum, t) => sum + t.stake_amount, 0);
  const totalPayoutsDue = tickets.filter((t) => t.status === 'won').reduce((sum, t) => sum + t.potential_return, 0);
  const pendingLiability = tickets.filter((t) => t.status === 'pending').reduce((sum, t) => sum + t.potential_return, 0);
  return {
    totalStakes,
    totalPayoutsDue,
    pendingLiability,
    netProfit: totalStakes - totalPayoutsDue,
  };
}
