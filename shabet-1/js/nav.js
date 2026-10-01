// Shared responsive tab navigation used by both the Agent and Admin
// dashboards. `tabs` is a flat list of { key, label, core } — `core`
// tabs are the ones a person needs constantly and always stay visible;
// the rest live behind a "More" hamburger button that only takes over
// on narrow (phone-width) screens (see the .tabs-dashboard rules in
// css/styles.css) — on wider screens every tab still shows inline.
//
// This module only renders markup; it deliberately reuses the same
// `data-tab="..."` attribute the existing per-view click handlers
// already bind to, so no extra wiring is needed for tab switching
// itself. Callers just need to wire the "#nav-more-toggle" button to
// flip their own `ui.moreOpen` flag and re-render.
export function tabNavHtml(tabs, activeKey, moreOpen, tabClass) {
  const core = tabs.filter((t) => t.core);
  const more = tabs.filter((t) => !t.core);
  const activeInMore = more.some((t) => t.key === activeKey);

  const renderBtn = (t) => `<button class="${tabClass} ${activeKey === t.key ? 'active' : ''}" data-tab="${t.key}">${t.label}</button>`;

  return `
    <div class="tabs-dashboard">
      <div class="tabs-core">
        ${core.map(renderBtn).join('')}
        ${more.length ? `<div class="tabs-more-inline">${more.map(renderBtn).join('')}</div>` : ''}
        ${more.length ? `
          <button type="button" class="hamburger-btn tap-target ${activeInMore ? 'has-active' : ''}" id="nav-more-toggle" aria-label="More menu" aria-expanded="${moreOpen ? 'true' : 'false'}">
            <span class="hamburger-icon">☰</span><span class="hamburger-label">More</span>
          </button>
        ` : ''}
      </div>
      ${more.length ? `
        <div class="tabs-more-panel ${moreOpen ? 'open' : ''}" id="nav-more-panel">
          ${more.map((t) => `<button type="button" class="more-panel-item ${activeKey === t.key ? 'active' : ''}" data-tab="${t.key}">${t.label}</button>`).join('')}
        </div>
        ${moreOpen ? '<div class="tabs-more-backdrop" id="nav-more-backdrop"></div>' : ''}
      ` : ''}
    </div>
  `;
}
