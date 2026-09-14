import {
  store, subscribe, updateFixture, updatePlayer, updateLeagueName, updatePaymentAccount, settleFixture, getFinancials,
  addScorer, updateScorer, removeScorer, scorersForFixture,
  addCustomMarket, updateCustomMarket, removeCustomMarket,
  getLocalBackup, findMigratableFixtureResults, importFixtureResult, findMigratableTickets, importTicket,
  findMigratableCustomMarkets, importCustomMarket,
} from './store.js';

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
  { key: 'payment', label: 'Payment Account' },
  { key: 'settlement', label: 'Settlement' },
  { key: 'teams', label: 'Teams' },
  { key: 'scorers', label: 'Anytime Scorer' },
  { key: 'migrate', label: 'Migrate Local Data' },
  { key: 'financials', label: 'Financials' },
];

let ui = { tab: 'fixtures' };
let expandedCustomMarkets = new Set(); // fixture ids whose custom-markets editor is open
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
        ${ui.tab === 'payment' ? paymentAccountHtml() : ''}
        ${ui.tab === 'settlement' ? settlementHtml() : ''}
        ${ui.tab === 'teams' ? teamsHtml() : ''}
        ${ui.tab === 'scorers' ? scorersHtml() : ''}
        ${ui.tab === 'migrate' ? migrateHtml() : ''}
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

function paymentAccountHtml() {
  const l = store.state.league;
  const hasDetails = l.payment_bank_name || l.payment_account_number || l.payment_account_name;

  return `
    <h2 class="admin-heading font-display">Payment Account</h2>
    <p class="admin-subtext">
      This is the bank account customers and agents are told to pay bookings into.
      Shabet only displays this text on the user side — it never processes the transfer
      itself. Update it any time the account changes; it reflects on the user side
      immediately.
    </p>

    <div class="settings-card">
      <label class="field-label">Bank Name</label>
      <input type="text" id="payment-bank-name-input" class="text-input tap-target"
        placeholder="e.g. GTBank" value="${escapeHtml(l.payment_bank_name || '')}" />

      <label class="field-label" style="margin-top:12px;">Account Number</label>
      <input type="text" id="payment-account-number-input" class="text-input tap-target"
        inputmode="numeric" placeholder="e.g. 0123456789" value="${escapeHtml(l.payment_account_number || '')}" />

      <label class="field-label" style="margin-top:12px;">Account Name</label>
      <input type="text" id="payment-account-name-input" class="text-input tap-target"
        placeholder="e.g. Shabet Enterprises" value="${escapeHtml(l.payment_account_name || '')}" />

      <p class="admin-subtext" style="margin-top:8px;">
        Fields save automatically as soon as you leave each one (no separate Save button needed).
      </p>
    </div>

    <div class="settings-card" style="margin-top:16px;">
      <p class="field-label" style="margin-bottom:8px;">Preview — what the user side shows</p>
      ${hasDetails ? `
        <div class="payment-preview-card">
          <p style="margin:0 0 4px;"><strong>${escapeHtml(l.payment_bank_name || '—')}</strong></p>
          <p style="margin:0 0 4px;font-family:monospace;font-size:15px;">${escapeHtml(l.payment_account_number || '—')}</p>
          <p style="margin:0;color:var(--gray-500);">${escapeHtml(l.payment_account_name || '—')}</p>
        </div>
      ` : `<p class="admin-subtext" style="margin:0;">No payment account set yet — fill in the fields above.</p>`}
    </div>
  `;
}

function fixtureEditCardHtml(fx) {
  const customMarkets = fx.custom_markets || [];
  const expanded = expandedCustomMarkets.has(fx.id);

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

      <button class="more-markets-toggle tap-target" data-action="toggle-custom-admin" data-fixture="${fx.id}">
        Custom Markets (${customMarkets.length}) <span style="margin-left:4px;">${expanded ? '▲' : '▼'}</span>
      </button>

      ${expanded ? `
        <div class="custom-market-admin-list">
          ${customMarkets.map((cm) => `
            <div class="custom-market-admin-row" data-fixture="${fx.id}" data-custom-market="${cm.id}">
              <input class="text-input tap-target cm-label-input" value="${escapeHtml(cm.label)}" placeholder="Market name" />
              <input type="number" step="0.01" min="1" class="number-input tap-target cm-odds-input" style="max-width:80px;" value="${cm.odds}" />
              <button class="remove-btn tap-target" data-action="remove-custom-market" data-fixture="${fx.id}" data-custom-market="${cm.id}" aria-label="Remove market">&times;</button>
            </div>
          `).join('')}
          <div class="custom-market-admin-row custom-market-add-row" data-fixture="${fx.id}">
            <input class="text-input tap-target new-cm-label" placeholder="New market, e.g. Double Chance: 1X" />
            <input type="number" step="0.01" min="1" class="number-input tap-target new-cm-odds" style="max-width:80px;" placeholder="Odds" value="2.00" />
            <button class="btn-secondary tap-target" data-action="add-custom-market" data-fixture="${fx.id}">Add</button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function settlementHtml() {
  const settleable = store.state.fixtures.filter((f) => f.status === 'live' || f.status === 'completed');

  return `
    <h2 class="admin-heading font-display">Ticket Settlement Engine</h2>
    <p class="admin-subtext">
      Set the final score for any live or completed match. Submitting instantly re-evaluates every
      ticket that touched this fixture to Won or Lost — including any Anytime Scorer or Custom
      Market picks, based on what you check off below.
    </p>

    ${settleable.length === 0
      ? '<p style="text-align:center;color:var(--gray-400);padding:24px 0;">No matches are live or completed yet. Set a fixture to "live" or "completed" in the Fixtures tab first.</p>'
      : settleable.map((fx) => {
          const eligibleScorers = scorersForFixture(fx);
          const confirmed = fx.scorers_confirmed || [];
          return `
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
              ${eligibleScorers.length > 0 ? `
                <div class="scorer-confirm-box">
                  <span class="field-label">Who scored anytime in this match?</span>
                  <div class="scorer-confirm-list">
                    ${eligibleScorers.map((sc) => `
                      <label class="scorer-checkbox">
                        <input type="checkbox" data-scorer-confirm="${fx.id}" value="${sc.id}" ${confirmed.includes(sc.id) ? 'checked' : ''} />
                        ${escapeHtml(sc.name)}
                      </label>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              ${(fx.custom_markets || []).length > 0 ? `
                <div class="scorer-confirm-box">
                  <span class="field-label">Which custom markets hit?</span>
                  <div class="scorer-confirm-list">
                    ${(fx.custom_markets || []).map((cm) => `
                      <label class="scorer-checkbox">
                        <input type="checkbox" data-custom-confirm="${fx.id}" value="${cm.id}" ${(fx.custom_markets_won || []).includes(cm.id) ? 'checked' : ''} />
                        ${escapeHtml(cm.label)}
                      </label>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')
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

function scorersHtml() {
  const scorers = store.state.scorers || [];
  const teams = store.state.players.map((p) => p.player_name);

  return `
    <h2 class="admin-heading font-display">Anytime Scorer Roster</h2>
    <p class="admin-subtext">
      These are the exact names agents see in the Anytime Scorer dropdown when booking a ticket —
      customers pick from this list, nothing is typed freely. Add as many players as you need;
      there's no limit. Team is optional — leave it blank to offer a player on every fixture, or
      assign a team so they only show up on that team's matches.
    </p>

    <div class="settings-card">
      <div class="scorer-add-grid">
        <input type="text" id="new-scorer-name" class="text-input tap-target" placeholder="Player name" />
        <select id="new-scorer-team" class="select-input tap-target">
          <option value="">No team (show on all fixtures)</option>
          ${teams.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}
        </select>
        <input type="number" step="0.01" min="1" id="new-scorer-odds" class="number-input tap-target" placeholder="Odds" value="3.25" />
        <button class="btn-secondary tap-target" id="add-scorer-btn">Add Player</button>
      </div>
    </div>

    ${scorers.length === 0
      ? '<p style="text-align:center;color:var(--gray-400);padding:24px 0;">No players yet — add one above.</p>'
      : scorers.map((sc) => `
        <div class="registry-item scorer-item">
          <input class="registry-name-input text-input tap-target" data-scorer-field="name" data-scorer="${sc.id}" value="${escapeHtml(sc.name)}" />
          <select class="select-input tap-target" data-scorer-field="team" data-scorer="${sc.id}" style="max-width:140px;">
            <option value="" ${!sc.team ? 'selected' : ''}>No team</option>
            ${teams.map((t) => `<option value="${escapeHtml(t)}" ${sc.team === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
          </select>
          <input type="number" step="0.01" min="1" class="number-input tap-target" style="max-width:80px;" data-scorer-field="odds" data-scorer="${sc.id}" value="${sc.odds}" />
          <button class="remove-btn tap-target" data-action="remove-scorer" data-scorer="${sc.id}" aria-label="Remove player">&times;</button>
        </div>
      `).join('')
    }
  `;
}

let selectedFixtureImports = new Set();
let selectedTicketImports = new Set();
let selectedCustomMarketImports = new Set();

function migrateHtml() {
  const backup = getLocalBackup();

  if (!backup) {
    return `
      <h2 class="admin-heading font-display">Migrate Local Data</h2>
      <p class="admin-subtext">
        No pre-Supabase local data was found on this device. This tab only ever shows data that
        was sitting in this browser's local storage before it was connected to the database — if
        this device never had any, there's nothing to migrate here.
      </p>
    `;
  }

  const fixtureResults = findMigratableFixtureResults();
  const customMarketMigrations = findMigratableCustomMarkets().filter((cm) => !cm.alreadyExists);
  const ticketMigrations = findMigratableTickets();

  return `
    <h2 class="admin-heading font-display">Migrate Local Data</h2>
    <p class="admin-subtext">
      This is a one-time backup of whatever was on this device before it connected to the database.
      Import match results first, then custom markets, then tickets — importing a result re-settles
      every ticket tied to that match, so doing it after tickets are already imported could reset an
      Anytime Scorer or Custom Market leg that was already correctly won.
    </p>

    <div class="settings-card">
      <h3 style="margin:0 0 8px;font-size:15px;color:var(--pitch-800);">Step 1 — Match Results</h3>
      ${fixtureResults.length === 0
        ? '<p class="admin-subtext" style="margin:0;">No local match results found to import.</p>'
        : `
          <ul style="list-style:none;padding:0;margin:0;">
            ${fixtureResults.map((f) => `
              <li class="migrate-row">
                <input type="checkbox" class="migrate-fixture-check" value="${f.localId}"
                  ${f.liveId ? '' : 'disabled'} ${f.alreadySettled ? 'disabled' : ''}
                  ${selectedFixtureImports.has(f.localId) ? 'checked' : ''} />
                <span class="migrate-desc">
                  MD${f.matchday}: ${escapeHtml(f.home_team)} ${f.home_score}-${f.away_score} ${escapeHtml(f.away_team)}
                </span>
                <span class="migrate-status">
                  ${f.alreadySettled ? 'Already in database' : f.liveId ? 'Ready' : 'No matching fixture found'}
                </span>
              </li>
            `).join('')}
          </ul>
          <button class="btn-secondary tap-target" style="margin-top:10px;" data-action="import-selected-fixtures">
            Import Selected Results
          </button>
        `
      }
    </div>

    <div class="settings-card">
      <h3 style="margin:0 0 8px;font-size:15px;color:var(--pitch-800);">Step 2 — Custom Markets</h3>
      <p class="admin-subtext" style="margin:0 0 8px;">
        Extra betting options (e.g. "Double Chance: 1X") you added to matches on this device before
        the database was connected. The default starter markets every fixture already has aren't
        listed here — only ones that look new.
      </p>
      ${customMarketMigrations.length === 0
        ? '<p class="admin-subtext" style="margin:0;">No new local custom markets found to import.</p>'
        : `
          <ul style="list-style:none;padding:0;margin:0;">
            ${customMarketMigrations.map((cm) => `
              <li class="migrate-row">
                <input type="checkbox" class="migrate-custom-market-check" value="${cm.customMarketLocalId}"
                  ${cm.liveId ? '' : 'disabled'} />
                <span class="migrate-desc">
                  MD${cm.matchday}: ${escapeHtml(cm.home_team)} vs ${escapeHtml(cm.away_team)} — ${escapeHtml(cm.label)} @ ${cm.odds}
                </span>
                <span class="migrate-status">${cm.liveId ? 'Ready' : 'No matching fixture found'}</span>
              </li>
            `).join('')}
          </ul>
          <button class="btn-secondary tap-target" style="margin-top:10px;" data-action="import-selected-custom-markets">
            Import Selected Markets
          </button>
        `
      }
    </div>

    <div class="settings-card">
      <h3 style="margin:0 0 8px;font-size:15px;color:var(--pitch-800);">Step 3 — Booked Tickets</h3>
      ${ticketMigrations.length === 0
        ? '<p class="admin-subtext" style="margin:0;">No local tickets found to import (or they\'re already in the database).</p>'
        : `
          <ul style="list-style:none;padding:0;margin:0;">
            ${ticketMigrations.map(({ ticket, importable }) => `
              <li class="migrate-row">
                <input type="checkbox" class="migrate-ticket-check" value="${ticket.id}"
                  ${importable ? '' : 'disabled'}
                  ${selectedTicketImports.has(ticket.id) ? 'checked' : ''} />
                <span class="migrate-desc">
                  ${ticket.id} — ${escapeHtml(ticket.customer_name)} — stake ${ticket.stake_amount.toFixed(2)} — ${ticket.status}
                </span>
                <span class="migrate-status">${importable ? 'Ready' : 'Missing fixture match'}</span>
              </li>
            `).join('')}
          </ul>
          <button class="btn-secondary tap-target" style="margin-top:10px;" data-action="import-selected-tickets">
            Import Selected Tickets
          </button>
        `
      }
    </div>
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

  const bankNameInput = root.querySelector('#payment-bank-name-input');
  if (bankNameInput) {
    bankNameInput.addEventListener('change', () => updatePaymentAccount({ payment_bank_name: bankNameInput.value.trim() }));
  }
  const accountNumberInput = root.querySelector('#payment-account-number-input');
  if (accountNumberInput) {
    accountNumberInput.addEventListener('change', () => updatePaymentAccount({ payment_account_number: accountNumberInput.value.trim() }));
  }
  const accountNameInput = root.querySelector('#payment-account-name-input');
  if (accountNameInput) {
    accountNameInput.addEventListener('change', () => updatePaymentAccount({ payment_account_name: accountNameInput.value.trim() }));
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
      const scorerIds = Array.from(card.querySelectorAll(`[data-scorer-confirm="${fixtureId}"]:checked`)).map((cb) => cb.value);
      const customMarketWinIds = Array.from(card.querySelectorAll(`[data-custom-confirm="${fixtureId}"]:checked`)).map((cb) => cb.value);
      settleFixture(fixtureId, home, away, scorerIds, customMarketWinIds);
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

  // --- Anytime Scorer roster ---
  const addScorerBtn = root.querySelector('#add-scorer-btn');
  if (addScorerBtn) {
    addScorerBtn.addEventListener('click', () => {
      const nameEl = root.querySelector('#new-scorer-name');
      const teamEl = root.querySelector('#new-scorer-team');
      const oddsEl = root.querySelector('#new-scorer-odds');
      const name = nameEl.value.trim();
      if (!name) { nameEl.focus(); return; }
      const odds = parseFloat(oddsEl.value) || 3.25;
      addScorer(teamEl.value, name, odds);
    });
  }

  root.querySelectorAll('[data-scorer][data-scorer-field]').forEach((el) => {
    el.addEventListener('change', () => {
      const scorerId = el.dataset.scorer;
      const field = el.dataset.scorerField;
      const value = field === 'odds' ? (parseFloat(el.value) || 0) : el.value;
      updateScorer(scorerId, { [field]: value });
    });
  });

  root.querySelectorAll('[data-action="remove-scorer"]').forEach((btn) => {
    btn.addEventListener('click', () => removeScorer(btn.dataset.scorer));
  });

  // --- Custom markets (per fixture) ---
  root.querySelectorAll('[data-action="toggle-custom-admin"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fixtureId = btn.dataset.fixture;
      if (expandedCustomMarkets.has(fixtureId)) expandedCustomMarkets.delete(fixtureId);
      else expandedCustomMarkets.add(fixtureId);
      render(root);
    });
  });

  root.querySelectorAll('[data-action="add-custom-market"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fixtureId = btn.dataset.fixture;
      const row = btn.closest('.custom-market-add-row');
      const labelEl = row.querySelector('.new-cm-label');
      const oddsEl = row.querySelector('.new-cm-odds');
      const label = labelEl.value.trim();
      if (!label) { labelEl.focus(); return; }
      const odds = parseFloat(oddsEl.value) || 2.0;
      addCustomMarket(fixtureId, label, odds);
    });
  });

  root.querySelectorAll('.custom-market-admin-row[data-custom-market]').forEach((row) => {
    const fixtureId = row.dataset.fixture;
    const marketId = row.dataset.customMarket;

    row.querySelector('.cm-label-input')?.addEventListener('change', (e) => {
      updateCustomMarket(fixtureId, marketId, { label: e.target.value });
    });
    row.querySelector('.cm-odds-input')?.addEventListener('change', (e) => {
      updateCustomMarket(fixtureId, marketId, { odds: parseFloat(e.target.value) || 0 });
    });
  });

  root.querySelectorAll('[data-action="remove-custom-market"]').forEach((btn) => {
    btn.addEventListener('click', () => removeCustomMarket(btn.dataset.fixture, btn.dataset.customMarket));
  });

  // --- Migrate local data ---
  root.querySelectorAll('.migrate-fixture-check').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedFixtureImports.add(cb.value);
      else selectedFixtureImports.delete(cb.value);
    });
  });

  root.querySelectorAll('.migrate-ticket-check').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedTicketImports.add(cb.value);
      else selectedTicketImports.delete(cb.value);
    });
  });

  root.querySelectorAll('.migrate-custom-market-check').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedCustomMarketImports.add(cb.value);
      else selectedCustomMarketImports.delete(cb.value);
    });
  });

  root.querySelectorAll('[data-action="import-selected-custom-markets"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const migrations = findMigratableCustomMarkets();
      for (const localId of selectedCustomMarketImports) {
        const match = migrations.find((m) => m.customMarketLocalId === localId);
        if (match && match.liveId) importCustomMarket(match.liveId, match.label, match.odds);
      }
      selectedCustomMarketImports.clear();
      render(root);
    });
  });

  root.querySelectorAll('[data-action="import-selected-fixtures"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const results = findMigratableFixtureResults();
      for (const localId of selectedFixtureImports) {
        const match = results.find((f) => f.localId === localId);
        if (match && match.liveId) importFixtureResult(match.liveId, match.home_score, match.away_score);
      }
      selectedFixtureImports.clear();
      render(root);
    });
  });

  root.querySelectorAll('[data-action="import-selected-tickets"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const migrations = findMigratableTickets();
      for (const ticketId of selectedTicketImports) {
        const match = migrations.find((m) => m.ticket.id === ticketId);
        if (match && match.importable) importTicket(match.ticket, match.idMap);
      }
      selectedTicketImports.clear();
      render(root);
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
