import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const LOCAL_FALLBACK_KEY = 'shabet_local_dev_role';
const listeners = new Set();

export const auth = {
  session: null,
  loading: true,
  localRole: localStorage.getItem(LOCAL_FALLBACK_KEY) || null,
};

export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

export async function initAuth() {
  if (!isSupabaseConfigured) {
    auth.loading = false;
    notify();
    return;
  }
  const { data } = await supabase.auth.getSession();
  auth.session = data.session;
  auth.loading = false;
  notify();

  supabase.auth.onAuthStateChange((_event, newSession) => {
    auth.session = newSession;
    notify();
  });
}

export async function signIn(email, password) {
  if (!isSupabaseConfigured) {
    // Dev-only fallback: the two known addresses stand in for the two
    // real accounts. Remove once Supabase is connected — see README.
    if (email === 'agent@shabet.local') {
      localStorage.setItem(LOCAL_FALLBACK_KEY, 'agent');
      auth.localRole = 'agent';
      notify();
      return { error: null };
    }
    if (email === 'admin@shabet.local') {
      localStorage.setItem(LOCAL_FALLBACK_KEY, 'admin');
      auth.localRole = 'admin';
      notify();
      return { error: null };
    }
    // Any other email/password in local-dev mode signs in as a self-service
    // customer, matching whatever was used at signUp() below.
    const localCustomer = getLocalCustomer();
    if (localCustomer && localCustomer.email === email) {
      localStorage.setItem(LOCAL_FALLBACK_KEY, 'customer');
      auth.localRole = 'customer';
      notify();
      return { error: null };
    }
    return {
      error: { message: 'No account found for that email in local-dev mode — use agent@shabet.local, admin@shabet.local, or create an account first.' },
    };
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

const LOCAL_CUSTOMER_KEY = 'shabet_local_dev_customer';

function getLocalCustomer() {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Self-service registration. role is deliberately set via user_metadata
// (options.data), not app_metadata — a signed-in client can never write
// its own app_metadata, only the Supabase Dashboard/
// Admin API can, which is exactly why admin/agent accounts stay
// app_metadata-based while self-registered customers are not. See the
// "SELF-SERVICE CUSTOMERS" note in supabase/schema.sql for how RLS still
// keeps a customer's data access limited to their own rows regardless of
// what they put in their own user_metadata.
export async function signUp(email, password, { fullName, phone }) {
  if (!isSupabaseConfigured) {
    localStorage.setItem(LOCAL_CUSTOMER_KEY, JSON.stringify({ email, fullName, phone }));
    localStorage.setItem(LOCAL_FALLBACK_KEY, 'customer');
    auth.localRole = 'customer';
    notify();
    return { error: null };
  }
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role: 'customer', full_name: fullName, phone } },
  });
  return { error };
}

export function currentUser() {
  if (isSupabaseConfigured) {
    const u = auth.session?.user;
    if (!u) return null;
    return { id: u.id, email: u.email, name: u.user_metadata?.full_name || u.email, phone: u.user_metadata?.phone || '' };
  }
  const local = getLocalCustomer();
  if (auth.localRole === 'customer' && local) {
    return { id: 'local-customer', email: local.email, name: local.fullName || local.email, phone: local.phone || '' };
  }
  return null;
}

export async function signOut() {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem(LOCAL_FALLBACK_KEY);
  auth.localRole = null;
  notify();
}

// Role is read from the account itself (app_metadata.role) — there is no
// in-app switch. Whoever logs into the agent account gets the Agent view;
// whoever logs into the admin account gets the Admin view.
export function getRole() {
  if (isSupabaseConfigured) {
    return auth.session?.user?.app_metadata?.role ?? auth.session?.user?.user_metadata?.role ?? null;
  }
  return auth.localRole;
}

export function isAuthenticated() {
  return isSupabaseConfigured ? Boolean(auth.session) : Boolean(auth.localRole);
}
