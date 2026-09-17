-- =====================================================================
-- SHABET — fix: admin RLS policies checked the wrong JWT claim
-- =====================================================================
-- Bug: every admin-write policy (and settle_fixture) used
--   auth.jwt() ->> 'role' = 'admin'
-- but `role` at the top level of a Supabase JWT is always the Postgres
-- role ("authenticated"), never your custom app_metadata role. So this
-- check was NEVER true — not even for the real admin account — which is
-- why fixture status changes, odds edits, and settlement all silently
-- failed to save (or, for settlement, errored outright).
--
-- Fix: read the role from app_metadata instead:
--   auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
--
-- Safe to run multiple times. Run this once in the Supabase SQL editor
-- against your existing project — it only touches policies/functions,
-- no tables or data are affected. After running it, sign all the way
-- out and back into the admin account once (so its session has whatever
-- Supabase JWT it already had — no token change is even needed for this
-- particular fix, but it's good practice after any RLS change).
-- =====================================================================

drop policy if exists "admin write leagues" on leagues;
create policy "admin write leagues" on leagues
  for all using (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  with check (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

drop policy if exists "admin write players" on players;
create policy "admin write players" on players
  for all using (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  with check (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

drop policy if exists "admin write fixtures" on fixtures;
create policy "admin write fixtures" on fixtures
  for all using (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  with check (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

drop policy if exists "admin write scorers" on scorers;
create policy "admin write scorers" on scorers
  for all using (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  with check (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

drop policy if exists "admin write custom_markets" on custom_markets;
create policy "admin write custom_markets" on custom_markets
  for all using (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  with check (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

drop policy if exists "admin update tickets" on tickets;
create policy "admin update tickets" on tickets
  for update using (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  with check (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- Recreate settle_fixture() with the same fix in its guard check.
-- (Full function body carried over unchanged from schema.sql, just the
-- one condition corrected.)
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
  if auth.jwt() -> 'app_metadata' ->> 'role' <> 'admin' then
    raise exception 'Only admins can settle fixtures';
  end if;

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
                                   when v_selection->>'player_id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                                        and (v_selection->>'player_id')::uuid = any(p_scorer_ids) then 'won'
                                   else 'lost'
                                 end
          when 'CUSTOM'    then case
                                   when v_selection->>'custom_market_id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                                        and (v_selection->>'custom_market_id')::uuid = any(p_custom_market_win_ids) then 'won'
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
