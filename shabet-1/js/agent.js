import { store, subscribe, setDraftSlip, clearDraftSlip, bookTicket, scorersForFixture, computeStandings } from './store.js';
import { renderReceipt } from './receipt.js';

const MARKET_GROUPS = [
  { title: 'Match Result', markets: [
    { key: '1', label: 'Home', field: 'odd_1' },
    { key: 'X', label: 'Draw', field: 'odd_x' },
    { key: '2', label: 'Away', field: 'odd_2' },
  ]},
  { title: 'Total Goals', markets: [
    { key: 'OVER_2_5', label: 'Over 2.5', field: 'odd_over_2_5' },
    { key: 'OVER_3_5', label: 'Over 3.5', field: 'odd_over_3_5' },
  ]},
  { title: 'Both Teams to Score', markets: [
    { key: 'BTTS', label: 'Yes', field: 'odd_btts' },
  ]},
];
const MARKETS = MARKET_GROUPS.flatMap((g) => g.markets); // flat lookup used for selection labels

let ui = { tab: 'fixtures', sheetOpen: false, historyQuery: '', detailFixtureId: null };
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
      ${paymentInfoBannerHtml()}
      <div class="tabs">
        <button class="tab-btn ${ui.tab === 'fixtures' ? 'active' : ''}" data-tab="fixtures">Fixtures</button>
        <button class="tab-btn ${ui.tab === 'standings' ? 'active' : ''}" data-tab="standings">Standings</button>
        <button class="tab-btn ${ui.tab === 'history' ? 'active' : ''}" data-tab="history">Ticket History</button>
      </div>

      <div class="agent-layout">
        <div class="agent-main">
          ${ui.tab === 'fixtures'
            ? (ui.detailFixtureId ? fixtureDetailHtml(findFixture(ui.detailFixtureId)) : fixtureBoardHtml())
            : ui.tab === 'standings' ? standingsHtml() : ticketHistoryHtml()}
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

// Reflects whatever the admin has set in Admin > Payment Account (js/admin.js).
// Purely informational — a customer/agent transfers to this account outside
// the app; nothing here processes or touches the money itself.
function paymentInfoBannerHtml() {
  const l = store.state.league;
  if (!l.payment_bank_name && !l.payment_account_number && !l.payment_account_name) return '';

  return `
    <div class="payment-info-banner">
      <div class="pib-label">Pay bookings to</div>
      <div class="pib-line">${escapeHtml(l.payment_bank_name || '')}</div>
      <div class="pib-line pib-acct">${escapeHtml(l.payment_account_number || '')}</div>
      <div class="pib-line">${escapeHtml(l.payment_account_name || '')}</div>
    </div>
  `;
}

const BADGE_COLORS = ['#0B3D26', '#C2542D', '#1c4e8a', '#7a1f3d', '#2d6a4f', '#8a5a1c', '#4a3b8a', '#1c7a7a'];

function teamInitials(name) {
  const words = name.replace(/\bFC\b/i, '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function teamColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return BADGE_COLORS[hash % BADGE_COLORS.length];
}

function standingsHtml() {
  const rows = computeStandings();

  return `
    <div class="standings-toolbar">
      <button class="btn-secondary tap-target" data-action="print-standings">🖨️ Print Standings</button>
    </div>
    <div class="standings-page">
      <div class="standings-header">
        <h2 class="standings-title font-display">${escapeHtml(store.state.league.name)} STANDINGS</h2>
        <div class="standings-divider"><span class="divider-line"></span><span>⚽</span><span class="divider-line"></span></div>
      </div>

      <div class="standings-table-wrap">
        <table class="standings-table">
          <thead>
            <tr>
              <th class="col-rank">#</th>
              <th class="col-team">Team</th>
              <th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th><th>G</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td class="col-rank">${i + 1}</td>
                <td class="col-team">
                  <span class="team-badge" style="background:${teamColor(r.team)};">${teamInitials(r.team)}</span>
                  <span class="team-name">${escapeHtml(r.team.toUpperCase())}</span>
                </td>
                <td>${r.played}</td>
                <td>${r.won}</td>
                <td>${r.drawn}</td>
                <td>${r.lost}</td>
                <td class="col-pts">${r.points}</td>
                <td class="col-g">${r.goalsFor}:${r.goalsAgainst}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="standings-legend">
        <b>P:</b> Played&nbsp;&nbsp; <b>W:</b> Won&nbsp;&nbsp; <b>D:</b> Drawn&nbsp;&nbsp; <b>L:</b> Lost&nbsp;&nbsp;
        <b>Pts:</b> Points&nbsp;&nbsp; <b>G:</b> Goals (For : Against)
      </div>
    </div>
  `;
}

function printStandings() {
  const rows = computeStandings();
  const leagueName = store.state.league.name;
  const generatedAt = new Date().toLocaleString();
  // Absolute URL so the logo resolves correctly in the separate print window
  const logoUrl = new URL('icons/icon-mask.svg', window.location.href).href;

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(leagueName)} Standings — Shabet</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 28px;
    background: #0B1F3A; color: white;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
  .brand img { width: 34px; height: 34px; border-radius: 8px; }
  .brand-name { font-size: 18px; font-weight: 800; letter-spacing: 1px; }
  h1 { font-size: 26px; text-transform: uppercase; text-align: center; margin: 0 0 10px; }
  .divider { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 22px; }
  .divider span.line { width: 70px; height: 2px; background: #D4A62A; display: inline-block; }
  table { width: 100%; border-collapse: collapse; background: white; color: #333; border-radius: 10px; overflow: hidden; }
  thead tr { background: #0B1F3A; color: white; }
  th, td { padding: 11px 8px; text-align: center; }
  th.team, td.team { text-align: left; padding-left: 14px; font-weight: 700; color: #0B3D26; }
  tbody tr:nth-child(even) { background: #F3F5FA; }
  td.rank { font-weight: 700; }
  td.pts { font-weight: 700; }
  .legend { margin-top: 16px; font-size: 12px; text-align: center; color: rgba(255,255,255,0.85); }
  .footer { margin-top: 22px; text-align: center; font-size: 11px; color: rgba(255,255,255,0.5); }
  @page { size: auto; margin: 10mm; }
</style>
</head>
<body>
  <div class="brand"><img src="${logoUrl}" alt="Shabet" /><span class="brand-name">SHABET</span></div>
  <h1>${escapeHtml(leagueName)} Standings</h1>
  <div class="divider"><span class="line"></span><span>⚽</span><span class="line"></span></div>
  <table>
    <thead><tr><th>#</th><th class="team">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th><th>G</th></tr></thead>
    <tbody>
      ${rows.map((r, i) => `
        <tr>
          <td class="rank">${i + 1}</td>
          <td class="team">${escapeHtml(r.team.toUpperCase())}</td>
          <td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td>
          <td class="pts">${r.points}</td><td>${r.goalsFor}:${r.goalsAgainst}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="legend"><b>P:</b> Played &nbsp; <b>W:</b> Won &nbsp; <b>D:</b> Drawn &nbsp; <b>L:</b> Lost &nbsp; <b>Pts:</b> Points &nbsp; <b>G:</b> Goals (For : Against)</div>
  <div class="footer">Printed from Shabet · ${escapeHtml(generatedAt)}</div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    alert('Please allow pop-ups to print the standings.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 300);
}

function findFixture(fixtureId) {
  return store.state.fixtures.find((f) => f.id === fixtureId);
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
          ${games.map(fixtureListRowHtml).join('')}
        </section>
      `;
    }).join('')}
  `;
}

// Compact row shown on the fixture list — tap it to open the full market
// list for that match (mirrors the "tap a match to see Details" pattern).
function fixtureListRowHtml(fx) {
  const disabled = fx.status !== 'open';
  const pickedCount = store.draftSlip.selections.filter((s) => s.fixture_id === fx.id).length;

  return `
    <button class="fixture-row tap-target" data-action="open-fixture-detail" data-fixture="${fx.id}">
      <div class="fixture-row-top">
        <div class="fixture-teams">${escapeHtml(fx.home_team)} <span class="vs">vs</span> ${escapeHtml(fx.away_team)}</div>
        <span class="status-badge status-${fx.status}">${fx.status.toUpperCase()}</span>
      </div>
      <div class="fixture-row-bottom">
        <span class="fixture-time">${escapeHtml(fx.kickoff_time)}</span>
        <span class="fixture-row-preview">1 <b>${fx.odd_1.toFixed(2)}</b> &nbsp;X <b>${fx.odd_x.toFixed(2)}</b> &nbsp;2 <b>${fx.odd_2.toFixed(2)}</b></span>
        ${pickedCount > 0 ? `<span class="row-badge">${pickedCount}</span>` : ''}
        <span class="fixture-row-chevron">${disabled ? '' : '›'}</span>
      </div>
    </button>
  `;
}

// Full "Details" page for one fixture — every market grouped, same layout
// idea as tapping into a match on a sportsbook: back button, team header,
// then Match Result / Total Goals / BTTS / Anytime Scorer / More Markets.
function fixtureDetailHtml(fx) {
  if (!fx) return '<p style="padding:24px;color:var(--gray-400);">Match not found.</p>';

  const disabled = fx.status !== 'open';
  const scorerOptions = scorersForFixture(fx);
  const customMarkets = fx.custom_markets || [];

  function isSelected(market, extraKey, extraValue) {
    return store.draftSlip.selections.some((s) =>
      s.fixture_id === fx.id && s.market === market && (extraKey ? s[extraKey] === extraValue : true)
    );
  }

  function marketBtn(m) {
    const selected = isSelected(m.key);
    return `
      <button class="detail-market-btn ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}"
        ${disabled ? 'disabled' : ''}
        data-action="toggle-market" data-fixture="${fx.id}" data-market="${m.key}" data-field="${m.field}">
        <span class="dmb-label">${m.label}</span>
        <span class="odds-val">${fx[m.field]?.toFixed(2)}</span>
      </button>
    `;
  }

  return `
    <div class="fixture-detail">
      <button class="detail-back tap-target" data-action="close-fixture-detail">‹ Back to Fixtures</button>

      <div class="detail-header">
        <div class="detail-teams">${escapeHtml(fx.home_team)} <span class="vs">vs</span> ${escapeHtml(fx.away_team)}</div>
        <div class="detail-meta">
          ${escapeHtml(fx.date_string)} · ${escapeHtml(fx.kickoff_time)}
          <span class="status-badge status-${fx.status}" style="margin-left:8px;">${fx.status.toUpperCase()}</span>
        </div>
      </div>

      ${MARKET_GROUPS.map((group) => `
        <div class="market-group">
          <div class="market-group-title">${group.title}</div>
          <div class="detail-market-row">
            ${group.markets.map(marketBtn).join('')}
          </div>
        </div>
      `).join('')}

      ${customMarkets.length > 0 ? `
        <div class="market-group">
          <div class="market-group-title">More Markets</div>
          <div class="custom-market-grid">
            ${customMarkets.map((cm) => {
              const selected = isSelected('CUSTOM', 'custom_market_id', cm.id);
              return `
                <button class="custom-market-btn ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}"
                  ${disabled ? 'disabled' : ''}
                  data-action="toggle-custom-market" data-fixture="${fx.id}" data-custom-market="${cm.id}">
                  <span class="cm-label">${escapeHtml(cm.label)}</span>
                  <span class="odds-val">${cm.odds.toFixed(2)}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      ${scorerOptions.length > 0 ? `
        <div class="market-group">
          <div class="market-group-title">Anytime Scorer</div>
          <p class="market-group-hint">Tap as many players as you like — not limited to one.</p>
          <div class="custom-market-grid">
            ${scorerOptions.map((sc) => {
              const selected = isSelected('SCORER', 'player_id', sc.id);
              return `
                <button class="custom-market-btn ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}"
                  ${disabled ? 'disabled' : ''}
                  data-action="toggle-scorer" data-fixture="${fx.id}" data-player="${sc.id}">
                  <span class="cm-label">${escapeHtml(sc.name)}</span>
                  <span class="odds-val">${sc.odds.toFixed(2)}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
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
                  <button class="remove-btn" data-action="remove-selection" data-fixture="${s.fixture_id}" data-market="${s.market}" data-custom-market="${s.custom_market_id || ''}" data-player="${s.player_id || ''}" aria-label="Remove selection">&times;</button>
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
          <button class="btn-secondary tap-target reprint-btn" data-action="reprint-ticket" data-ticket="${t.id}">🖨️ Reprint Slip</button>
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
      ui.detailFixtureId = null; // switching tabs always returns to the fixture list
      render(root);
    });
  });

  root.querySelectorAll('[data-action="print-standings"]').forEach((btn) => {
    btn.addEventListener('click', () => printStandings());
  });

  root.querySelectorAll('[data-action="open-fixture-detail"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.detailFixtureId = btn.dataset.fixture;
      render(root);
    });
  });

  root.querySelectorAll('[data-action="close-fixture-detail"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.detailFixtureId = null;
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
        // Toggling one market never touches any other market already
        // picked on this same fixture — an agent can add 1, X, and BTTS
        // on the same match to the same slip.
        let selections;
        if (already) {
          selections = slip.selections.filter((s) => !key(s));
        } else {
          selections = [...slip.selections, {
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

  root.querySelectorAll('[data-action="toggle-custom-market"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fixtureId = btn.dataset.fixture;
      const marketId = btn.dataset.customMarket;
      const fixture = store.state.fixtures.find((f) => f.id === fixtureId);
      if (!fixture || fixture.status !== 'open') return;
      const customMarket = (fixture.custom_markets || []).find((cm) => cm.id === marketId);
      if (!customMarket) return;

      const key = (s) => s.fixture_id === fixtureId && s.market === 'CUSTOM' && s.custom_market_id === marketId;
      const already = store.draftSlip.selections.some(key);

      setDraftSlip((slip) => {
        let selections;
        if (already) {
          selections = slip.selections.filter((s) => !key(s));
        } else {
          selections = [...slip.selections, {
            fixture_id: fixtureId,
            market: 'CUSTOM',
            custom_market_id: marketId,
            odds: customMarket.odds,
            label: `${fixture.home_team} vs ${fixture.away_team}`,
            marketLabel: customMarket.label,
          }];
        }
        return { ...slip, selections };
      });
    });
  });

  root.querySelectorAll('[data-action="toggle-scorer"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fixtureId = btn.dataset.fixture;
      const playerId = btn.dataset.player;
      const fixture = store.state.fixtures.find((f) => f.id === fixtureId);
      if (!fixture || fixture.status !== 'open') return;
      const scorer = (store.state.scorers || []).find((sc) => sc.id === playerId);
      if (!scorer) return;

      const key = (s) => s.fixture_id === fixtureId && s.market === 'SCORER' && s.player_id === playerId;
      const already = store.draftSlip.selections.some(key);

      setDraftSlip((slip) => {
        let selections;
        if (already) {
          selections = slip.selections.filter((s) => !key(s));
        } else {
          selections = [...slip.selections, {
            fixture_id: fixtureId,
            market: 'SCORER',
            player_id: scorer.id,
            odds: scorer.odds,
            label: `${fixture.home_team} vs ${fixture.away_team}`,
            marketLabel: `Anytime Scorer — ${scorer.name}`,
          }];
        }
        return { ...slip, selections };
      });
    });
  });

  root.querySelectorAll('[data-action="remove-selection"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fixtureId = btn.dataset.fixture;
      const market = btn.dataset.market;
      const customMarketId = btn.dataset.customMarket || '';
      const playerId = btn.dataset.player || '';
      setDraftSlip((slip) => ({
        ...slip,
        selections: slip.selections.filter((s) => {
          const matches = s.fixture_id === fixtureId && s.market === market
            && (market !== 'CUSTOM' || s.custom_market_id === customMarketId)
            && (market !== 'SCORER' || s.player_id === playerId);
          return !matches;
        }),
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

  root.querySelectorAll('[data-action="reprint-ticket"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ticket = store.state.tickets.find((t) => t.id === btn.dataset.ticket);
      if (!ticket) return;
      const receiptNode = document.getElementById('receipt-print');
      if (receiptNode) receiptNode.innerHTML = renderReceipt(ticket);
      setTimeout(() => window.print(), 50);
    });
  });
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
