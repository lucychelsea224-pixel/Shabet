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
    </div>
  `;

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
      </div>
    `;
    document.getElementById('sign-out-btn')?.addEventListener('click', signOut);

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
