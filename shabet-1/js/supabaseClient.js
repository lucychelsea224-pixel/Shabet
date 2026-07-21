// Supabase client, loaded from the CDN ESM build so there's no npm/build
// step. Fill in your project's values below (or load them from a small
// config.js you .gitignore) to connect real auth + a real database.
//
// Leave these blank to keep running in local-dev mode — see auth.js.

const SUPABASE_URL = ''; // e.g. 'https://YOUR-PROJECT.supabase.co'
const SUPABASE_ANON_KEY = ''; // your project's anon/public key

export let supabase = null;
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (isSupabaseConfigured) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
