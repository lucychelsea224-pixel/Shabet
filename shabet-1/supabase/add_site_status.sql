-- =====================================================================
-- SHABET — add: site_status table (maintenance-mode toggle)
-- =====================================================================
-- Backs the "Sign out everywhere" neighbor feature: a single admin-only
-- switch that puts a "site under maintenance" screen in front of every
-- non-admin visitor — including someone who hasn't signed in yet, which
-- is the whole point (blocking login itself, not just the app behind it).
--
-- That's exactly why this is its own table rather than a new column on
-- `leagues`: it has to be readable by a completely signed-out visitor
-- (the anon role), and `leagues` also carries the payment account's bank
-- name/number, which should stay behind the normal "authenticated" read
-- policy rather than get exposed publicly just to piggyback this flag.
--
-- Singleton row via a boolean primary key fixed to `true` — there is
-- exactly one row, always id = true, so every read/write targets it with
-- `.eq('id', true)` and nothing else needs choosing which row.
--
-- Safe to run once. Re-running is safe too (every statement below is
-- idempotent), but it will NOT reset an admin's maintenance_mode/message
-- back to the default if they've already changed it.
-- =====================================================================

create table if not exists site_status (
  id                    boolean primary key default true check (id = true),
  maintenance_mode      boolean not null default false,
  maintenance_message   text not null default 'Shabet is under maintenance. Please check back in a few minutes.',
  updated_at            timestamptz not null default now()
);

insert into site_status (id) values (true)
on conflict (id) do nothing;

drop trigger if exists site_status_set_updated_at on site_status;
create trigger site_status_set_updated_at
  before update on site_status
  for each row execute function set_updated_at();

alter table site_status enable row level security;

-- Readable by EVERYONE, signed in or not — this is the one exception to
-- "read requires authenticated" that every other table in this schema
-- follows, and it's deliberate: a signed-out visitor has to be able to
-- see the maintenance screen before they ever get the chance to log in.
drop policy if exists "public read site_status" on site_status;
create policy "public read site_status" on site_status for select using (true);

-- Same admin check as every other admin-write policy in this schema.
drop policy if exists "admin write site_status" on site_status;
create policy "admin write site_status" on site_status
  for all using (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  with check (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

do $$ begin
  alter publication supabase_realtime add table site_status;
exception when duplicate_object then null;
end $$;
