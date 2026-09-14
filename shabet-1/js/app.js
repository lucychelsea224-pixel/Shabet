import { initAuth, onAuthChange, isAuthenticated, getRole, signIn, signOut, auth } from './auth.js';
import { isSupabaseConfigured } from './supabaseClient.js';
import { store, subscribe as subscribeStore } from './store.js';
import { mountAgentView, unmountAgentView } from './agent.js';
import { mountAdminView, unmountAdminView } from './admin.js';

const appRoot = document.getElementById('app');
let currentMountedRole = null; // tracks which view is mounted so we don't remount unnecessarily

function renderShell() {
  if (auth.loading) {
    appRoot.innerHTML = `<div class="loading-wrap"><p>Loading…</p></div>`;
    return;
  }

  if (!isAuthenticated()) {
    unmountViews();
    renderLogin();
    return;
  }

  const role = getRole();

  if (role !== 'agent' && role !== 'admin') {
    unmountViews();
    appRoot.innerHTML = `
      <div class="no-role-wrap">
        <div>
          <p style="font-weight:600;margin-bottom:8px;">This account has no role assigned.</p>
          <p style="color:rgba(247,245,240,0.7);font-size:14px;margin-bottom:16px;">
            Ask an admin to set app_metadata.role to "agent" or "admin" for this login.
          </p>
          <button class="btn-primary tap-target" id="sign-out-btn" style="width:auto;padding:0 20px;">Sign Out</button>
        </div>
      </div>
    `;
    document.getElementById('sign-out-btn')?.addEventListener('click', signOut);
    return;
  }

  renderMainShell(role);
}

// ---------------------------------------------------------------------
// Footer: WhatsApp contact, Privacy Policy, Contact/Customer Service.
// Rendered on both the login screen and the main app shell so it's
// always reachable, whether or not someone is signed in.
// ---------------------------------------------------------------------
const WHATSAPP_NUMBER = '2349051616475';
const SUPPORT_EMAIL = 'shabet032@gmail.com';

function footerHtml() {
  return `
    <a
      class="whatsapp-fab"
      href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hello Shabet, I need help with my account.')}"
      target="_blank" rel="noopener"
      aria-label="Chat with Shabet on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      <svg viewBox="0 0 32 32" width="26" height="26" fill="currentColor" aria-hidden="true">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 2.837.744 5.5 2.05 7.81L0 32l8.36-2.02A15.9 15.9 0 0 0 16 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.2c-2.55 0-4.96-.68-7.05-1.96l-.5-.3-4.96 1.2 1.24-4.84-.33-.5A13.15 13.15 0 0 1 2.8 16C2.8 8.7 8.7 2.8 16 2.8S29.2 8.7 29.2 16 23.3 29.2 16 29.2zm7.2-9.86c-.4-.2-2.34-1.15-2.7-1.28-.36-.13-.63-.2-.9.2-.26.4-1.02 1.28-1.25 1.54-.23.26-.46.29-.85.1-2.3-1.15-3.8-2.05-5.32-4.64-.4-.7.4-.65 1.14-2.16.13-.26.06-.49-.07-.7-.13-.2-.9-2.16-1.23-2.96-.32-.78-.66-.67-.9-.68-.23-.01-.5-.01-.77-.01-.26 0-.7.1-1.06.5-.36.4-1.4 1.37-1.4 3.33 0 1.96 1.42 3.86 1.62 4.13.2.26 2.76 4.2 6.68 5.72 3.92 1.52 3.92 1.02 4.63.95.7-.07 2.34-.95 2.67-1.87.33-.92.33-1.7.23-1.87-.1-.16-.36-.26-.76-.46z"/>
      </svg>
    </a>
    <footer class="app-footer">
      <button type="button" class="footer-link" id="footer-privacy-btn">Privacy Policy</button>
      <span class="footer-sep">·</span>
      <a class="footer-link" href="mailto:${SUPPORT_EMAIL}">Contact Customer Service</a>
      <span class="footer-sep">·</span>
      <a class="footer-link" href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener">WhatsApp Admin</a>
    </footer>
    <div class="modal-overlay" id="privacy-modal-overlay" style="display:none;">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="privacy-modal-title">
        <div class="modal-head">
          <h2 id="privacy-modal-title" class="font-display">Privacy Policy</h2>
          <button type="button" class="modal-close tap-target" id="privacy-modal-close" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          ${privacyPolicyHtml()}
        </div>
      </div>
    </div>
  `;
}

function privacyPolicyHtml() {
  return `
    <p><strong>Last updated:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

    <h3>What this app is</h3>
    <p>Shabet is a ticket-booking and results tool used by Shabet's agents and admin to run
    the ${escapeHtml(store?.state?.league?.name || 'league')} betting pool. This policy explains what
    information is collected through the app and how it's used.</p>

    <h3>Information we collect</h3>
    <p>Depending on how you use Shabet, we may collect: your name, phone number, and email
    address (if you register an account); the bet slips/tickets you build (selections, stake
    amount, potential return); and, if you contact us, whatever you tell us on WhatsApp or by
    email.</p>

    <h3>What we don't collect</h3>
    <p>Shabet does not collect or store your bank card details, bank login details, or any
    payment-gateway credentials. Payments are made directly to the operator's bank account
    outside the app; Shabet only records that a ticket is <em>pending payment</em> or has been
    <em>confirmed</em> by an admin — it never processes the transfer itself.</p>

    <h3>How we use your information</h3>
    <p>To create and manage your account, to record and settle your tickets against match
    results, to confirm or follow up on a payment you've told us about, and to respond when you
    contact us for support.</p>

    <h3>Who can see your information</h3>
    <p>Only Shabet's admin and agents can see customer ticket and account information, for the
    purpose of running the pool and providing support. We do not sell or share your information
    with advertisers or unrelated third parties.</p>

    <h3>Contacting us about your data</h3>
    <p>To ask a question about your information, or to request it be corrected or removed,
    contact us on WhatsApp at <a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener">+${WHATSAPP_NUMBER}</a>
    or by email at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function wireFooter() {
  const openBtn = document.getElementById('footer-privacy-btn');
  const overlay = document.getElementById('privacy-modal-overlay');
  const closeBtn = document.getElementById('privacy-modal-close');
  if (!openBtn || !overlay || !closeBtn) return;

  openBtn.addEventListener('click', () => { overlay.style.display = 'flex'; });
  closeBtn.addEventListener('click', () => { overlay.style.display = 'none'; });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.style.display = 'none';
  });
}

function renderLogin() {
  appRoot.innerHTML = `
    <div class="login-wrap">
      <div class="login-inner">
        <div class="login-brand">
          <img src="icons/icon-mask.svg" alt="Shabet" class="login-logo" />
          <h1 class="login-title font-display">Shabet</h1>
          <p class="login-subtitle">Agent &amp; Admin Sign In</p>
        </div>

        <form class="login-card" id="login-form">
          <div>
            <label class="field-label">Email</label>
            <input type="email" required id="login-email" class="text-input tap-target" placeholder="agent@shabet.local" />
          </div>
          <div>
            <label class="field-label">Password</label>
            <input type="password" required id="login-password" class="text-input tap-target" placeholder="••••••••" />
          </div>
          <p class="error-text" id="login-error" style="display:none;"></p>
          <button type="submit" class="btn-primary tap-target" id="login-submit">Sign In</button>
          ${!isSupabaseConfigured ? `
            <p class="login-hint">
              Supabase isn't connected yet, so this is running in local-dev mode — sign in with
              <span style="font-family:monospace;">agent@shabet.local</span> or
              <span style="font-family:monospace;">admin@shabet.local</span> (any password).
            </p>` : ''}
        </form>

        <p class="login-foot">There is one shared login per role — ask an admin if you need credentials.</p>
      </div>
      ${footerHtml()}
    </div>
  `;
  wireFooter();

  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('login-submit');
    const errorEl = document.getElementById('login-error');
    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const { error } = await signIn(email, password);

    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
    if (error) {
      errorEl.textContent = error.message;
      errorEl.style.display = 'block';
    }
  });
}

function renderMainShell(role) {
  // Only rebuild the outer shell (header) once per role; the inner view
  // manages its own re-renders via the store subscription.
  if (currentMountedRole !== role) {
    unmountViews();
    appRoot.innerHTML = `
      <div id="app-inner">
        <header class="header">
          <div class="header-inner">
            <div class="header-brand">
              <img src="icons/icon-mask.svg" alt="Shabet" class="header-logo" />
              <div>
                <h1 class="header-title font-display">Shabet</h1>
                <p class="header-league" id="header-league"></p>
              </div>
            </div>
            <div class="header-actions">
              <span class="role-badge">${role}</span>
              <button class="link-btn tap-target" id="sign-out-btn">Sign Out</button>
            </div>
          </div>
        </header>
        <main id="view-root"></main>
        ${footerHtml()}
      </div>
    `;
    document.getElementById('sign-out-btn')?.addEventListener('click', signOut);
    wireFooter();

    const viewRoot = document.getElementById('view-root');
    if (role === 'agent') mountAgentView(viewRoot);
    else mountAdminView(viewRoot);

    currentMountedRole = role;
  }

  updateHeaderLeague();
}

function updateHeaderLeague() {
  const el = document.getElementById('header-league');
  if (el) el.textContent = store.state.league.name;
}

function unmountViews() {
  unmountAgentView();
  unmountAdminView();
  currentMountedRole = null;
}

// Keep the header's league label current even though it's outside the
// role-specific view's own re-render cycle.
subscribeStore(() => {
  if (currentMountedRole) updateHeaderLeague();
});

onAuthChange(renderShell);
initAuth().then(renderShell);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
