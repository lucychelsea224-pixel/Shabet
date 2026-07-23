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
    return {
      error: { message: 'Supabase is not configured — use agent@shabet.local or admin@shabet.local for local dev.' },
    };
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
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
