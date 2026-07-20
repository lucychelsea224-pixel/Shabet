import { store, subscribe, updateFixture, updatePlayer, updateLeagueName, settleFixture, getFinancials } from './store.js';

const ODDS_FIELDS = [
  { key: 'odd_1', label: '1' },
  { key: 'odd_x', label: 'X' },
  { key: 'odd_2', label: '2' },
  { key: 'odd_over_2_5', label: 'O2.5' },
  { key: 'odd_over_3_5', label: 'O3.5' },
  { key: 'odd_btts', label: 'BTTS' },
];
const STATUS_OPTIONS = ['open', 'live', 'completed', 'postponed'];
const TABS = [
  { key: 'fixtures', label: 'Fixtures & Odds' },
  { key: 'settlement', label: 'Settlement' },
  { key: 'teams', label: 'Teams' },
  { key: 'financials', label: 'Financials' },
];

let ui = { tab: 'fixtures' };
let unsubscribe = null;

export function mountAdminView(root) {
  render(root);
  unsubscribe = subscribe(() => render(root));
}

export function unmountAdminView() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
}

function render(root) {
  root.innerHTML = `
    <div class="admin-wrap">
      <div class="tabs pill">
        ${TABS.map((t) => `<button class="pill-tab ${ui.tab === t.key ? 'active' : ''}" data-tab="${t.key}">${t.label}</button>`).join('')}
      </div>
      <div style="margin-top:16px;">
        ${ui.tab === 'fixtures' ? fixtureConfiguratorHtml() : ''}
        ${ui.tab === 'settlement' ? settlementHtml() : ''}
        ${ui.tab === 'teams' ? teamsHtml() : ''}
        ${ui.tab === 'financials' ? financialsHtml() : ''}
      </div>
    </div>
  `;
  bindEvents(root);
}

function fixtureConfiguratorHtml() {
  const fixtures = store.state.fixtures;
  const matchdays = [...new Set(fixtures.map((f) => f.matchday))].sort((a, b) => a - b);

  return `
    <h2 class="admin-heading font-display">Live Odds &amp; Fixture Configurator</h2>

    <div class="settings-card">
      <label class="field-label">League Name</label>
      <input type="text" id="league-name-input" class="text-input tap-target font-display"
        style="font-weight:700;" value="${escapeHtml(store.state.league.name)}" />
      <p class="admin-subtext" style="margin-top:8px;">
        Shown in the app header and printed on every betslip receipt. Change this any time you
        reuse Shabet for a different tournament.
      </p>
    </div>

    <p class="admin-subtext">
      Match status is fully manual — matches never lock automatically based on the clock. Set a match to
      <strong>live</strong> the moment it actually kicks off (African Time friendly).
    </p>

    ${matchdays.map((md) => `
      <div class="matchday-heading">Matchday ${md}</div>
      ${fixtures.filter((f) => f.matchday === md).map(fixtureEditCardHtml).join('')}
    `).join('')}
  `;
}

function fixtureEditCardHtml(fx) {
  return `
    <div class="admin-card" data-fixture-card="${fx.id}">
      <div class="fixture-edit-grid">
        <input class="text-input tap-target" data-field="date_string" data-fixture="${fx.id}" value="${escapeHtml(fx.date_string)}" placeholder="Date string" />
        <input class="text-input tap-target" data-field="kickoff_time" data-fixture="${fx.id}" value="${escapeHtml(fx.kickoff_time)}" placeholder="Kickoff time" />
        <input class="text-input tap-target" data-field="home_team" data-fixture="${fx.id}" value="${escapeHtml(fx.home_team)}" />
        <input class="text-input tap-target" data-field="away_team" data-fixture="${fx.id}" value="${escapeHtml(fx.away_team)}" />
      </div>

      <div class="odds-grid">
        ${ODDS_FIELDS.map((f) => `
          <label class="odds-field">
            <span>${f.label}</span>
            <input type="number" step="0.01" class="number-input tap-target"
              data-field="${f.key}" data-fixture="${fx.id}" data-numeric="true" value="${fx[f.key]}" />
          </label>
        `).join('')}
      </div>

      <div class="status-row">
        <span class="field-label">Match Status</span>
        <select class="select-input tap-target" data-field="status" data-fixture="${fx.id}">
          ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${fx.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
  `;
}

function settlementHtml() {
  const settleable = store.state.fixtures.filter((f) => f.status === 'live' || f.status === 'completed');

  return `
    <h2 class="admin-heading font-display">Ticket Settlement Engine</h2>
    <p class="admin-subtext">
      Set the final score for any live or completed match. Submitting instantly re-evaluates every
      ticket that touched this fixture to Won or Lost.
    </p>

    ${settleable.length === 0
      ? '<p style="text-align:center;color:var(--gray-400);padding:24px 0;">No matches are live or completed yet. Set a fixture to "live" or "completed" in the Fixtures tab first.</p>'
      : settleable.map((fx) => `
        <div class="settle-item">
          <div class="settle-title">${escapeHtml(fx.home_team)} vs ${escapeHtml(fx.away_team)}
            <span class="settle-status">${fx.status}</span>
          </div>
          <div class="settle-row">
            <input type="number" min="0" class="score-input tap-target" data-score="home" data-fixture="${fx.id}" value="${fx.home_score ?? ''}" placeholder="H" />
            <span style="color:var(--gray-400);">—</span>
            <input type="number" min="0" class="score-input tap-target" data-score="away" data-fixture="${fx.id}" value="${fx.away_score ?? ''}" placeholder="A" />
            <button class="btn-secondary tap-target" style="margin-left:auto;" data-action="settle" data-fixture="${fx.id}">Settle</button>
          </div>
        </div>
      `).join('')
    }
  `;
}

function teamsHtml() {
  return `
    <h2 class="admin-heading font-display">Player / Team Registry</h2>
    ${store.state.players.map((p) => `
      <div class="registry-item">
        <input class="registry-name-input text-input tap-target" data-field="player_name" data-player="${p.id}" value="${escapeHtml(p.player_name)}" />
        <button class="status-toggle tap-target ${p.status === 'active' ? 'active' : 'eliminated'}" data-action="toggle-player-status" data-player="${p.id}">
          ${p.status === 'active' ? 'Active' : 'Eliminated'}
        </button>
      </div>
    `).join('')}
  `;
}

function financialsHtml() {
  const f = getFinancials();
  const cards = [
    { label: 'Total Cash Stakes Collected', value: f.totalStakes, bg: 'var(--pitch-700)' },
    { label: 'Total Cash Payouts Due (Won)', value: f.totalPayoutsDue, bg: 'var(--clay)' },
    { label: 'Pending Liability', value: f.pendingLiability, bg: '#eab308' },
    { label: 'Net Profit', value: f.netProfit, bg: f.netProfit >= 0 ? '#16a34a' : '#dc2626' },
  ];
  return `
    <h2 class="admin-heading font-display">Financial Tracker</h2>
    <div class="fin-grid">
      ${cards.map((c) => `
        <div class="fin-card" style="background:${c.bg};">
          <div class="fin-label">${c.label}</div>
          <div class="fin-value">${c.value.toFixed(2)}</div>
        </div>
      `).join('')}
    </div>
    <p class="admin-subtext" style="margin-top:12px;">
      Based on ${store.state.tickets.length} booked ticket${store.state.tickets.length === 1 ? '' : 's'} across all matchdays.
    </p>
  `;
}

function bindEvents(root) {
  root.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => { ui.tab = btn.dataset.tab; render(root); });
  });

  const leagueInput = root.querySelector('#league-name-input');
  if (leagueInput) {
    leagueInput.addEventListener('change', () => updateLeagueName(leagueInput.value.toUpperCase()));
  }

  // Fixture edit fields use 'change' (fires on blur / Enter) rather than
  // 'input', so re-rendering the whole list doesn't yank focus mid-keystroke.
  root.querySelectorAll('[data-fixture][data-field]').forEach((el) => {
    el.addEventListener('change', () => {
      const fixtureId = el.dataset.fixture;
      const field = el.dataset.field;
      const value = el.dataset.numeric ? (parseFloat(el.value) || 0) : el.value;
      updateFixture(fixtureId, { [field]: value });
    });
  });

  root.querySelectorAll('[data-action="settle"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fixtureId = btn.dataset.fixture;
      const card = btn.closest('.settle-item');
      const home = parseInt(card.querySelector('[data-score="home"]').value || '0', 10);
      const away = parseInt(card.querySelector('[data-score="away"]').value || '0', 10);
      settleFixture(fixtureId, home, away);
    });
  });

  root.querySelectorAll('[data-player][data-field="player_name"]').forEach((el) => {
    el.addEventListener('change', () => updatePlayer(el.dataset.player, { player_name: el.value }));
  });

  root.querySelectorAll('[data-action="toggle-player-status"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const player = store.state.players.find((p) => p.id === btn.dataset.player);
      if (!player) return;
      updatePlayer(player.id, { status: player.status === 'active' ? 'eliminated' : 'active' });
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
