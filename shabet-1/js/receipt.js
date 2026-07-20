export function renderReceipt(ticket) {
  if (!ticket) return '';
  const created = new Date(ticket.created_at);

  const rows = ticket.selections.map((s) => `
    <div style="margin-bottom:3px;">
      <div>${escapeHtml(s.label)}</div>
      <div class="rc-row"><span>${escapeHtml(s.marketLabel)}</span><span>@ ${s.odds.toFixed(2)}</span></div>
    </div>
  `).join('');

  return `
    <div class="rc-title">SHABET</div>
    <div class="rc-title" style="font-size:10px;font-weight:400;">
      ${escapeHtml(ticket.league_name || 'PIPELINE LEAGUE')} — Retail Booking Receipt
    </div>
    <div class="rc-divider"></div>
    <div class="rc-row"><span>Ticket ID</span><span>${ticket.id}</span></div>
    <div class="rc-row"><span>Customer</span><span>${escapeHtml(ticket.customer_name)}</span></div>
    <div class="rc-row"><span>Date</span><span>${created.toLocaleDateString()}</span></div>
    <div class="rc-row"><span>Time</span><span>${created.toLocaleTimeString()}</span></div>
    <div class="rc-divider"></div>
    ${rows}
    <div class="rc-divider"></div>
    <div class="rc-row"><span>Stake</span><span>${ticket.stake_amount.toFixed(2)}</span></div>
    <div class="rc-row"><span>Total Odds</span><span>${ticket.total_odds.toFixed(2)}</span></div>
    <div class="rc-row" style="font-weight:700;">
      <span>Potential Return</span><span>${ticket.potential_return.toFixed(2)}</span>
    </div>
    <div class="rc-divider"></div>
    <div style="text-align:center;font-size:9px;">
      Cash paid to agent. Present this ticket to collect winnings.
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
