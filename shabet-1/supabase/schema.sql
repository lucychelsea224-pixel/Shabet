-- =====================================================================
-- SHABET — Supabase schema
-- Retail/agent-based betting ticket platform (cash-only, no online pay)
-- Run this in the Supabase SQL editor, or via:
--   supabase db push   (with this file under supabase/migrations/)
-- =====================================================================
--
-- AUTH SETUP — one shared login for the agent, one for the admin
-- ---------------------------------------------------------------------
-- This app expects exactly two Supabase Auth users, distinguished by an
-- app_metadata.role claim ('agent' or 'admin') that the RLS policies and
-- the frontend both read. app_metadata (not user_metadata) is used
-- deliberately — user_metadata is editable by the user themselves via
-- the client SDK, app_metadata is not, so the role can't be tampered
-- with from a signed-in session.
--
-- Create the two users first, either in the Supabase Dashboard
-- (Authentication > Users > Add User) or via the Admin API, then run
-- the two updates below with their real UUIDs to attach roles:
--
--   update auth.users set raw_app_meta_data =
--     raw_app_meta_data || '{"role": "agent"}'::jsonb
--   where email = 'agent@yourdomain.com';
--
--   update auth.users set raw_app_meta_data =
--     raw_app_meta_data || '{"role": "admin"}'::jsonb
--   where email = 'admin@yourdomain.com';
--
-- Do this for every league/shop that reuses Shabet — it's still just
-- two accounts, one agent + one admin, per deployment.
-- =====================================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------------------
-- updated_at helper trigger, reused by every table below
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- leagues
-- One row per tournament Shabet is configured for. The app's admin
-- "League Name" field reads/writes leagues.name. Swap the active
-- league to reuse Shabet for a different competition without touching
-- fixtures/players/tickets structure.
-- ---------------------------------------------------------------------
create table if not exists leagues (
  id           uuid primary key default gen_random_uuid(),
  name         text not null default 'PIPELINE LEAGUE',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger leagues_set_updated_at
  before update on leagues
  for each row execute function set_updated_at();

-- Seed the default league so the app has something to point at on first run.
insert into leagues (name, is_active)
values ('PIPELINE LEAGUE', true)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- players  (teams competing in the league)
-- ---------------------------------------------------------------------
create table if not exists players (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references leagues(id) on delete cascade,
  player_name  text not null,
  status       text not null default 'active'
               check (status in ('active', 'eliminated')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_players_league on players(league_id);

create trigger players_set_updated_at
  before update on players
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- fixtures  (one match; odds live per-fixture so admin can edit freely)
-- ---------------------------------------------------------------------
create table if not exists fixtures (
  id               uuid primary key default gen_random_uuid(),
  league_id        uuid not null references leagues(id) on delete cascade,
  matchday         integer not null,
  date_string      text not null,   -- free text, e.g. "Sun, Aug 23" — admin-editable
  kickoff_time     text not null,   -- free text, e.g. "7:15 AM" — admin-editable

  home_team_id     uuid references players(id),
  away_team_id     uuid references players(id),
  home_team        text not null,   -- denormalized display name (kept in sync with home_team_id)
  away_team        text not null,

  status           text not null default 'open'
                   check (status in ('open', 'live', 'completed', 'postponed')),
  home_score       integer,
  away_score       integer,

  odd_1            numeric(6,2) not null default 1.85,
  odd_x            numeric(6,2) not null default 3.10,
  odd_2            numeric(6,2) not null default 3.60,
  odd_over_2_5     numeric(6,2) not null default 1.95,
  odd_over_3_5     numeric(6,2) not null default 2.80,
  odd_btts         numeric(6,2) not null default 1.75,

  -- Set by the Settlement RPC below: the roster player IDs (see `scorers`
  -- table) the admin confirms scored anytime in this match. Anytime Scorer
  -- selections on tickets are evaluated against this list.
  scorers_confirmed uuid[] not null default '{}',

  -- Set by the Settlement RPC below: the custom_markets ids (see table
  -- below) the admin confirms actually hit in this match.
  custom_markets_won uuid[] not null default '{}',

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_fixtures_league on fixtures(league_id);
create index if not exists idx_fixtures_matchday on fixtures(league_id, matchday);
create index if not exists idx_fixtures_status on fixtures(status);

create trigger fixtures_set_updated_at
  before update on fixtures
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- scorers  (Anytime Scorer roster — individual footballers, admin-entered)
-- The frontend's fixture board only ever renders a <select> built from
-- this table; customers/agents never free-type a player name. `team` is
-- optional — leave it null to offer the player on every fixture in the
-- league, or set it to restrict them to fixtures involving that team.
-- ---------------------------------------------------------------------
create table if not exists scorers (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references leagues(id) on delete cascade,
  team_id      uuid references players(id),   -- optional; null = eligible on every fixture
  name         text not null,
  odds         numeric(6,2) not null default 3.25,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_scorers_league on scorers(league_id);
create index if not exists idx_scorers_team on scorers(team_id);

create trigger scorers_set_updated_at
  before update on scorers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- custom_markets  (free-form extra betting options, per fixture)
-- Double Chance, Multigoals, alternate Over/Under lines, or literally
-- anything the admin types in — no fixed set, no cap on how many a
-- fixture can have. Since these are free text, they can't be settled
-- from the score automatically; the admin confirms winners via
-- fixtures.custom_markets_won when calling settle_fixture().
-- ---------------------------------------------------------------------
create table if not exists custom_markets (
  id           uuid primary key default gen_random_uuid(),
  fixture_id   uuid not null references fixtures(id) on delete cascade,
  label        text not null,
  odds         numeric(6,2) not null default 2.00,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_custom_markets_fixture on custom_markets(fixture_id);

create trigger custom_markets_set_updated_at
  before update on custom_markets
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- tickets  (one booking; selections stored as JSONB, matching the
-- shape the frontend already builds: [{ fixture_id, market, odds,
-- label, marketLabel, result }])
-- ---------------------------------------------------------------------
create table if not exists tickets (
  id                 uuid primary key default gen_random_uuid(),
  display_id         text not null unique,  -- human-facing code, e.g. T00001 (printed on receipt)
  league_id          uuid not null references leagues(id) on delete cascade,
  league_name        text not null,          -- snapshot at booking time, printed on the receipt
  customer_name      text not null,
  stake_amount       numeric(10,2) not null check (stake_amount > 0),
  total_odds         numeric(10,2) not null,
  potential_return   numeric(10,2) not null,
  status             text not null default 'pending'
                     check (status in ('pending', 'won', 'lost')),
  selections         jsonb not null default '[]'::jsonb,
  booked_by          text,                    -- agent/cashier identifier, if tracked
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_tickets_league on tickets(league_id);
create index if not exists idx_tickets_status on tickets(status);
create index if not exists idx_tickets_customer on tickets(customer_name);
create index if not exists idx_tickets_selections_gin on tickets using gin (selections);

create trigger tickets_set_updated_at
  before update on tickets
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- Shabet has no online payments, but the admin dashboard and agent app
-- should still be gated behind Supabase Auth so random anon clients
-- can't rewrite odds or scores. Adjust the role checks below to match
-- whatever auth/roles you wire up (e.g. a `role` claim of 'admin' vs
-- 'agent' in the JWT, or a separate `staff` table).
-- ---------------------------------------------------------------------
alter table leagues  enable row level security;
alter table players  enable row level security;
alter table fixtures enable row level security;
alter table scorers  enable row level security;
alter table custom_markets enable row level security;
alter table tickets  enable row level security;

-- Everyone signed in can read league/fixture/team/scorer/custom-market
-- data (needed for the Agent fixture Details page).
create policy "read leagues"  on leagues  for select using (auth.role() = 'authenticated');
create policy "read players"  on players  for select using (auth.role() = 'authenticated');
create policy "read fixtures" on fixtures for select using (auth.role() = 'authenticated');
create policy "read scorers"  on scorers  for select using (auth.role() = 'authenticated');
create policy "read custom_markets" on custom_markets for select using (auth.role() = 'authenticated');

-- Only admins can write to leagues/players/fixtures/scorers/custom_markets.
-- Replace this with your real admin check once roles are set up.
create policy "admin write leagues" on leagues
  for all using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

create policy "admin write players" on players
  for all using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

create policy "admin write fixtures" on fixtures
  for all using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

create policy "admin write scorers" on scorers
  for all using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

create policy "admin write custom_markets" on custom_markets
  for all using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

-- Any authenticated agent can create tickets and read the ticket ledger.
create policy "agents read tickets" on tickets
  for select using (auth.role() = 'authenticated');

create policy "agents create tickets" on tickets
  for insert with check (auth.role() = 'authenticated');

-- Only admins can update ticket status directly (the settlement engine
-- should run as a trusted server function/RPC rather than a raw client
-- update — see settle_fixture() below).
create policy "admin update tickets" on tickets
  for update using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

-- ---------------------------------------------------------------------
-- Settlement RPC
-- Mirrors the frontend's settlement engine: set a fixture's final score
-- and the roster of players confirmed to have scored anytime, then
-- re-evaluate every ticket that touched it — including Anytime Scorer
-- selections. Call this from the Admin dashboard via
-- supabase.rpc('settle_fixture', {...}) instead of updating
-- fixtures/tickets directly, so scoring logic lives in one place. Marked
-- `security definer` so agents' restrictive RLS doesn't block the ticket
-- rewrite triggered by an admin's settlement action.
-- ---------------------------------------------------------------------
create or replace function settle_fixture(
  p_fixture_id uuid,
  p_home_score integer,
  p_away_score integer,
  p_scorer_ids uuid[] default '{}',
  p_custom_market_win_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
as $$
declare
  v_ticket record;
  v_selection jsonb;
  v_new_selections jsonb;
  v_any_lost boolean;
  v_all_decided boolean;
  v_result text;
begin
  update fixtures
     set status = 'completed', home_score = p_home_score, away_score = p_away_score,
         scorers_confirmed = p_scorer_ids,
         custom_markets_won = p_custom_market_win_ids
   where id = p_fixture_id;

  for v_ticket in
    select * from tickets
     where exists (
             select 1 from jsonb_array_elements(selections) sel
              where sel->>'fixture_id' = p_fixture_id::text
           )
  loop
    v_new_selections := '[]'::jsonb;
    v_any_lost := false;
    v_all_decided := true;

    for v_selection in select * from jsonb_array_elements(v_ticket.selections)
    loop
      if v_selection->>'fixture_id' = p_fixture_id::text then
        v_result := case v_selection->>'market'
          when '1'         then case when p_home_score > p_away_score then 'won' else 'lost' end
          when 'X'         then case when p_home_score = p_away_score then 'won' else 'lost' end
          when '2'         then case when p_away_score > p_home_score then 'won' else 'lost' end
          when 'OVER_2_5'  then case when (p_home_score + p_away_score) > 2.5 then 'won' else 'lost' end
          when 'OVER_3_5'  then case when (p_home_score + p_away_score) > 3.5 then 'won' else 'lost' end
          when 'BTTS'      then case when p_home_score > 0 and p_away_score > 0 then 'won' else 'lost' end
          when 'SCORER'    then case
                                   when (v_selection->>'player_id')::uuid = any(p_scorer_ids) then 'won'
                                   else 'lost'
                                 end
          when 'CUSTOM'    then case
                                   when (v_selection->>'custom_market_id')::uuid = any(p_custom_market_win_ids) then 'won'
                                   else 'lost'
                                 end
          else 'pending'
        end;
        v_selection := v_selection || jsonb_build_object('result', v_result);
      end if;

      if coalesce(v_selection->>'result', 'pending') = 'lost' then
        v_any_lost := true;
      end if;
      if coalesce(v_selection->>'result', 'pending') = 'pending' then
        v_all_decided := false;
      end if;

      v_new_selections := v_new_selections || jsonb_build_array(v_selection);
    end loop;

    update tickets
       set selections = v_new_selections,
           status = case
             when v_any_lost then 'lost'
             when v_all_decided then 'won'
             else 'pending'
           end
     where id = v_ticket.id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Financial tracker view — backs the Admin "Financials" tab directly.
-- ---------------------------------------------------------------------
create or replace view financial_summary as
select
  league_id,
  sum(stake_amount) as total_stakes_collected,
  sum(potential_return) filter (where status = 'won')     as total_payouts_due,
  sum(potential_return) filter (where status = 'pending') as pending_liability,
  sum(stake_amount) - sum(potential_return) filter (where status = 'won') as net_profit
from tickets
group by league_id;
