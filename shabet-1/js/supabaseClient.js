// Supabase client, loaded from the CDN ESM build so there's no npm/build
// step. Fill in your project's values below (or load them from a small
// config.js you .gitignore) to connect real auth + a real database.
//
// Leave these blank to keep running in local-dev mode — see auth.js.

const SUPABASE_URL = 'https://rqqhicxsqruvsdtztehc.supabase.co'; // e.g. 'https://YOUR-PROJECT.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxcWhpY3hzcXJ1dnNkdHp0ZWhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NTA3MjksImV4cCI6MjEwMDEyNjcyOX0.0qVbj_3euQJZFt4GQ_QXvwFQJZlPkqM7Bl3IOXqxAig'; // your project's anon/public key

export let supabase = null;
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (isSupabaseConfigured) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
