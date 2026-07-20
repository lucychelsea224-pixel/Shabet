import { store, subscribe, setDraftSlip, clearDraftSlip, bookTicket } from './store.js';
import { renderReceipt } from './receipt.js';

const MARKETS = [
  { key: '1', label: 'Home', field: 'odd_1' },
  { key: 'X', label: 'Draw', field: 'odd_x' },
  { key: '2', label: 'Away', field: 'odd_2' },
  { key: 'OVER_2_5', label: 'O 2.5', field: 'odd_over_2_5' },
  { key: 'BTTS', label: 'BTTS', field: 'odd_btts' },
];

let ui = { tab: 'fixtures', sheetOpen: false, historyQuery: '' };
let unsubscribe = null;

export function mountAgentView(root) {
  render(root);
  unsubscribe = subscribe(() => render(root));
}

export function unmountAgentView() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
}

function render(root) {
  root.innerHTML = `
    <div>
      <div class="tabs">
        <button class="tab-btn ${ui.tab === 'fixtures' ? 'active' : ''}" data-tab="fixtures">Fixtures</button>
        <button class="tab-btn ${ui.tab === 'history' ? 'active' : ''}" data-tab="history">Ticket History</button>
      </div>

      <div class="agent-layout">
        <div class="agent-main">
          ${ui.tab === 'fixtures' ? fixtureBoardHtml() : ticketHistoryHtml()}
        </div>
        <div class="betslip-desktop">${betslipHtml()}</div>
      </div>

      <button class="fab-betslip" id="fab-betslip">
        Betslip
        ${store.draftSlip.selections.length > 0
          ? `<span class="fab-badge">${store.draftSlip.selections.length}</span>` : ''}
      </button>

      ${ui.sheetOpen ? `
        <div class="sheet-overlay" id="sheet-overlay">
          <div class="sheet-backdrop" id="sheet-backdrop"></div>
          <div class="sheet-panel">
            <div class="sheet-header">
              <span class="sheet-title font-display">Betslip</span>
              <button class="sheet-close" id="sheet-close" aria-label="Close betslip">&times;</button>
            </div>
            ${betslipHtml()}
          </div>
        </div>
      ` : ''}

      <div id="receipt-print"></div>
    </div>
  `;

  bindEvents(root);
  syncDraftInputs(root);
}

function fixtureBoardHtml() {
  const fixtures = store.state.fixtures;
  const matchdays = [...new Set(fixtures.map((f) => f.matchday))].sort((a, b) => a - b);

  return `
    <p class="league-label">${escapeHtml(store.state.league.name)}</p>
    ${matchdays.map((md) => {
      const games = fixtures.filter((f) => f.matchday === md);
      const dateLabel = games[0]?.date_string || '';
      return `
        <section class="matchday-block">
          <h2 class="matchday-title font-display">Matchday ${md} <span class="matchday-date">${escapeHtml(dateLabel)}</span></h2>
          ${games.map(fixtureCardHtml).join('')}
        </section>
      `;
    }).join('')}
  `;
}

function fixtureCardHtml(fx) {
  return `
    <div class="fixture-card">
      <div class="fixture-top">
        <div class="fixture-teams">${escapeHtml(fx.home_team)} <span class="vs">vs</span> ${escapeHtml(fx.away_team)}</div>
        <span class="status-badge status-${fx.status}">${fx.status.toUpperCase()}</span>
      </div>
      <div class="fixture-time">${escapeHtml(fx.kickoff_time)}</div>
      <div class="market-grid">
        ${MARKETS.map((m) => {
          const selected = store.draftSlip.selections.some((s) => s.fixture_id === fx.id && s.market === m.key);
          const disabled = fx.status !== 'open';
          return `
            <button class="market-btn ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}"
              ${disabled ? 'disabled' : ''}
              data-action="toggle-market" data-fixture="${fx.id}" data-market="${m.key}" data-field="${m.field}">
              <span>${m.label}</span>
              <span class="odds-val">${fx[m.field]?.toFixed(2)}</span>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function betslipHtml() {
  const { selections } = store.draftSlip;
  const stakeNum = parseFloat(store.draftSlip.stake) || 0;
  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const potentialReturn = totalOdds * stakeNum;

  return `
    <div class="betslip-panel">
      <div>
        <label class="field-label">Customer Name</label>
        <input type="text" class="customer-name-input text-input tap-target" placeholder="e.g. John Doe" />
      </div>

      <div>
        <span class="field-label">Selections</span>
        ${selections.length === 0
          ? '<p style="font-size:13px;color:var(--gray-400);margin-top:4px;">Tap odds on the fixture board to add picks.</p>'
          : `<ul style="list-style:none;padding:0;margin:4px 0 0;">
              ${selections.map((s) => `
                <li class="selection-item">
                  <div style="overflow:hidden;">
                    <div class="sel-label">${escapeHtml(s.label)}</div>
                    <div class="sel-market">${escapeHtml(s.marketLabel)} @ ${s.odds.toFixed(2)}</div>
                  </div>
                  <button class="remove-btn" data-action="remove-selection" data-fixture="${s.fixture_id}" aria-label="Remove selection">&times;</button>
                </li>
              `).join('')}
            </ul>`
        }
      </div>

      <div>
        <label class="field-label">Stake Amount</label>
        <input type="number" min="0" class="stake-input number-input tap-target" placeholder="0.00" />
      </div>

      <div class="totals-box">
        <div class="totals-row"><span>Total Odds</span><span style="font-family:monospace;">${totalOdds.toFixed(2)}</span></div>
        <div class="totals-row bold"><span>Potential Return</span><span style="font-family:monospace;">${potentialReturn.toFixed(2)}</span></div>
      </div>

      <p class="error-text" style="display:none;"></p>

      <button class="btn-primary tap-target book-print-btn">Book &amp; Print</button>
    </div>
  `;
}

function ticketHistoryHtml() {
  const q = ui.historyQuery.trim().toLowerCase();
  const filtered = store.state.tickets.filter((t) =>
    !q || t.id.toLowerCase().includes(q) || t.customer_name.toLowerCase().includes(q)
  );

  return `
    <input type="text" id="history-search" class="search-input tap-target"
      placeholder="Search by Ticket ID or Customer Name..." value="${escapeHtml(ui.historyQuery)}" />

    ${filtered.length === 0
      ? '<p style="text-align:center;color:var(--gray-400);padding:40px 0;">No tickets found.</p>'
      : filtered.map((t) => `
        <div class="ticket-item ticket-${t.status}">
          <div class="ticket-top">
            <span class="ticket-id">${t.id}</span>
            <span class="ticket-status">${t.status}</span>
          </div>
          <div class="ticket-customer">${escapeHtml(t.customer_name)}</div>
          <div class="ticket-selections">
            ${t.selections.map((s) => `
              <div class="ticket-sel-row">
                <span>${escapeHtml(s.label)} — ${escapeHtml(s.marketLabel)}</span>
                <span style="font-family:monospace;">${s.odds.toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div class="ticket-footer">
            <span>Stake: ${t.stake_amount.toFixed(2)}</span>
            <span>Odds: ${t.total_odds.toFixed(2)}</span>
            <span style="font-weight:700;">Return: ${t.potential_return.toFixed(2)}</span>
          </div>
        </div>
      `).join('')
    }
  `;
}

function syncDraftInputs(root) {
  root.querySelectorAll('.customer-name-input').forEach((el) => {
    el.value = store.draftSlip.customerName || '';
  });
  root.querySelectorAll('.stake-input').forEach((el) => {
    el.value = store.draftSlip.stake || '';
  });
}

function bindEvents(root) {
  root.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.tab = btn.dataset.tab;
      render(root);
    });
  });

  root.querySelectorAll('[data-action="toggle-market"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fixtureId = btn.dataset.fixture;
      const market = btn.dataset.market;
      const field = btn.dataset.field;
      const fixture = store.state.fixtures.find((f) => f.id === fixtureId);
      if (!fixture || fixture.status !== 'open') return;

      const key = (s) => s.fixture_id === fixtureId && s.market === market;
      const already = store.draftSlip.selections.some(key);

      setDraftSlip((slip) => {
        let selections;
        if (already) {
          selections = slip.selections.filter((s) => !key(s));
        } else {
          const withoutFixture = slip.selections.filter((s) => s.fixture_id !== fixtureId);
          selections = [...withoutFixture, {
            fixture_id: fixtureId,
            market,
            odds: fixture[field],
            label: `${fixture.home_team} vs ${fixture.away_team}`,
            marketLabel: MARKETS.find((m) => m.key === market)?.label ?? market,
          }];
        }
        return { ...slip, selections };
      });
    });
  });

  root.querySelectorAll('[data-action="remove-selection"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fixtureId = btn.dataset.fixture;
      setDraftSlip((slip) => ({
        ...slip,
        selections: slip.selections.filter((s) => s.fixture_id !== fixtureId),
      }));
    });
  });

  root.querySelectorAll('.customer-name-input').forEach((el) => {
    el.addEventListener('input', () => {
      store.draftSlip.customerName = el.value;
      persistDraftQuiet();
    });
  });

  root.querySelectorAll('.stake-input').forEach((el) => {
    el.addEventListener('input', () => {
      store.draftSlip.stake = el.value;
      persistDraftQuiet();
      // Update totals live without a full re-render (keeps focus in the field)
      const total = store.draftSlip.selections.reduce((acc, s) => acc * s.odds, 1);
      const stakeNum = parseFloat(el.value) || 0;
      const panel = el.closest('.betslip-panel');
      if (panel) {
        const rows = panel.querySelectorAll('.totals-row span[style]');
        if (rows[1]) rows[1].textContent = (total * stakeNum).toFixed(2);
      }
    });
  });

  root.querySelectorAll('.book-print-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleBook(root, btn));
  });

  const fab = root.querySelector('#fab-betslip');
  if (fab) fab.addEventListener('click', () => { ui.sheetOpen = true; render(root); });

  const overlay = root.querySelector('#sheet-backdrop');
  if (overlay) overlay.addEventListener('click', () => { ui.sheetOpen = false; render(root); });

  const closeBtn = root.querySelector('#sheet-close');
  if (closeBtn) closeBtn.addEventListener('click', () => { ui.sheetOpen = false; render(root); });

  const search = root.querySelector('#history-search');
  if (search) {
    search.addEventListener('input', () => {
      ui.historyQuery = search.value;
      render(root);
      root.querySelector('#history-search')?.focus();
    });
  }
}

function persistDraftQuiet() {
  try {
    localStorage.setItem('shabet_draft_slip_v1', JSON.stringify(store.draftSlip));
  } catch (e) {
    console.warn('Could not persist draft slip.', e);
  }
}

function handleBook(root, btn) {
  const customerName = (store.draftSlip.customerName || '').trim();
  const stakeNum = parseFloat(store.draftSlip.stake) || 0;
  const selections = store.draftSlip.selections;
  const errorEl = btn.closest('.betslip-panel')?.querySelector('.error-text');

  function showError(msg) {
    if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
  }

  if (!customerName) return showError('Customer name is required.');
  if (selections.length === 0) return showError('Add at least one selection.');
  if (stakeNum <= 0) return showError('Enter a stake amount.');

  const ticket = bookTicket(customerName, selections, stakeNum);
  clearDraftSlip();
  ui.sheetOpen = false;
  ui.tab = 'history';
  render(root);

  const receiptNode = document.getElementById('receipt-print');
  if (receiptNode) receiptNode.innerHTML = renderReceipt(ticket);
  setTimeout(() => window.print(), 50);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
