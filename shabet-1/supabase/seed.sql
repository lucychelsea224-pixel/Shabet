-- =====================================================================
-- SHABET — seed data
-- Run this ONCE after schema.sql, in the same Supabase SQL editor, to
-- populate the 8 teams, the full 14-matchday fixture schedule (with the
-- default custom-markets template on every fixture), and the starting
-- Anytime Scorer roster. Safe to re-run: it clears these tables first so
-- running it twice doesn't duplicate rows.
-- =====================================================================

do $$
declare
  v_league_id uuid;
  v_team_zuneko_fc uuid;
  v_team_pipeline_tornadoes uuid;
  v_team_ultimate_fc uuid;
  v_team_clasical_fc uuid;
  v_team_breakthrough_fc uuid;
  v_team_super_galant_fc uuid;
  v_team_dazzle_fc uuid;
  v_team_rozas_fc uuid;
  v_fixture_id uuid;
begin
  select id into v_league_id from leagues where is_active = true order by created_at limit 1;
  if v_league_id is null then
    raise exception 'No league found — run schema.sql first.';
  end if;

  -- Clear any previous seed so this script is safely re-runnable
  delete from custom_markets where fixture_id in (select id from fixtures where league_id = v_league_id);
  delete from tickets  where league_id = v_league_id;
  delete from fixtures where league_id = v_league_id;
  delete from scorers  where league_id = v_league_id;
  delete from players  where league_id = v_league_id;

  -- Teams
  insert into players (league_id, player_name, status) values (v_league_id, 'Zuneko FC', 'active') returning id into v_team_zuneko_fc;
  insert into players (league_id, player_name, status) values (v_league_id, 'Pipeline Tornadoes', 'active') returning id into v_team_pipeline_tornadoes;
  insert into players (league_id, player_name, status) values (v_league_id, 'Ultimate FC', 'active') returning id into v_team_ultimate_fc;
  insert into players (league_id, player_name, status) values (v_league_id, 'Clasical FC', 'active') returning id into v_team_clasical_fc;
  insert into players (league_id, player_name, status) values (v_league_id, 'Breakthrough FC', 'active') returning id into v_team_breakthrough_fc;
  insert into players (league_id, player_name, status) values (v_league_id, 'Super Galant FC', 'active') returning id into v_team_super_galant_fc;
  insert into players (league_id, player_name, status) values (v_league_id, 'Dazzle FC', 'active') returning id into v_team_dazzle_fc;
  insert into players (league_id, player_name, status) values (v_league_id, 'Rozas FC', 'active') returning id into v_team_rozas_fc;

  -- Matchday 1: Zuneko FC vs Pipeline Tornadoes
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 1, 'Sun, Aug 23', '7:15 AM', v_team_zuneko_fc, v_team_pipeline_tornadoes, 'Zuneko FC', 'Pipeline Tornadoes', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 1: Ultimate FC vs Clasical FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 1, 'Sun, Aug 23', '7:45 AM', v_team_ultimate_fc, v_team_clasical_fc, 'Ultimate FC', 'Clasical FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 1: Breakthrough FC vs Super Galant FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 1, 'Sun, Aug 23', '8:15 AM', v_team_breakthrough_fc, v_team_super_galant_fc, 'Breakthrough FC', 'Super Galant FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 1: Dazzle FC vs Rozas FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 1, 'Sun, Aug 23', '8:45 AM', v_team_dazzle_fc, v_team_rozas_fc, 'Dazzle FC', 'Rozas FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 2: Ultimate FC vs Zuneko FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 2, 'Sun, Aug 23', '9:15 AM', v_team_ultimate_fc, v_team_zuneko_fc, 'Ultimate FC', 'Zuneko FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 2: Super Galant FC vs Dazzle FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 2, 'Sun, Aug 23', '9:45 AM', v_team_super_galant_fc, v_team_dazzle_fc, 'Super Galant FC', 'Dazzle FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 2: Rozas FC vs Pipeline Tornadoes
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 2, 'Sun, Aug 23', '10:15 AM', v_team_rozas_fc, v_team_pipeline_tornadoes, 'Rozas FC', 'Pipeline Tornadoes', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 2: Clasical FC vs Breakthrough FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 2, 'Sun, Aug 23', '10:45 AM', v_team_clasical_fc, v_team_breakthrough_fc, 'Clasical FC', 'Breakthrough FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 3: Clasical FC vs Zuneko FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 3, 'Sun, Aug 30', '7:15 AM', v_team_clasical_fc, v_team_zuneko_fc, 'Clasical FC', 'Zuneko FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 3: Rozas FC vs Breakthrough FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 3, 'Sun, Aug 30', '7:45 AM', v_team_rozas_fc, v_team_breakthrough_fc, 'Rozas FC', 'Breakthrough FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 3: Super Galant FC vs Ultimate FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 3, 'Sun, Aug 30', '8:15 AM', v_team_super_galant_fc, v_team_ultimate_fc, 'Super Galant FC', 'Ultimate FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 3: Pipeline Tornadoes vs Dazzle FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 3, 'Sun, Aug 30', '8:45 AM', v_team_pipeline_tornadoes, v_team_dazzle_fc, 'Pipeline Tornadoes', 'Dazzle FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 4: Ultimate FC vs Rozas FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 4, 'Sun, Aug 30', '9:15 AM', v_team_ultimate_fc, v_team_rozas_fc, 'Ultimate FC', 'Rozas FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 4: Breakthrough FC vs Pipeline Tornadoes
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 4, 'Sun, Aug 30', '9:45 AM', v_team_breakthrough_fc, v_team_pipeline_tornadoes, 'Breakthrough FC', 'Pipeline Tornadoes', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 4: Clasical FC vs Super Galant FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 4, 'Sun, Aug 30', '10:15 AM', v_team_clasical_fc, v_team_super_galant_fc, 'Clasical FC', 'Super Galant FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 4: Zuneko FC vs Dazzle FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 4, 'Sun, Aug 30', '10:45 AM', v_team_zuneko_fc, v_team_dazzle_fc, 'Zuneko FC', 'Dazzle FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 5: Pipeline Tornadoes vs Super Galant FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 5, 'Sun, Sep 20', '7:15 AM', v_team_pipeline_tornadoes, v_team_super_galant_fc, 'Pipeline Tornadoes', 'Super Galant FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 5: Zuneko FC vs Rozas FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 5, 'Sun, Sep 20', '7:45 AM', v_team_zuneko_fc, v_team_rozas_fc, 'Zuneko FC', 'Rozas FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 5: Dazzle FC vs Clasical FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 5, 'Sun, Sep 20', '8:15 AM', v_team_dazzle_fc, v_team_clasical_fc, 'Dazzle FC', 'Clasical FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 5: Breakthrough FC vs Ultimate FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 5, 'Sun, Sep 20', '8:45 AM', v_team_breakthrough_fc, v_team_ultimate_fc, 'Breakthrough FC', 'Ultimate FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 6: Clasical FC vs Pipeline Tornadoes
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 6, 'Sun, Sep 20', '9:15 AM', v_team_clasical_fc, v_team_pipeline_tornadoes, 'Clasical FC', 'Pipeline Tornadoes', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 6: Breakthrough FC vs Zuneko FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 6, 'Sun, Sep 20', '9:45 AM', v_team_breakthrough_fc, v_team_zuneko_fc, 'Breakthrough FC', 'Zuneko FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 6: Ultimate FC vs Dazzle FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 6, 'Sun, Sep 20', '10:15 AM', v_team_ultimate_fc, v_team_dazzle_fc, 'Ultimate FC', 'Dazzle FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 6: Super Galant FC vs Rozas FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 6, 'Sun, Sep 20', '10:45 AM', v_team_super_galant_fc, v_team_rozas_fc, 'Super Galant FC', 'Rozas FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 7: Pipeline Tornadoes vs Ultimate FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 7, 'Sun, Sep 27', '7:15 AM', v_team_pipeline_tornadoes, v_team_ultimate_fc, 'Pipeline Tornadoes', 'Ultimate FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 7: Rozas FC vs Clasical FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 7, 'Sun, Sep 27', '7:45 AM', v_team_rozas_fc, v_team_clasical_fc, 'Rozas FC', 'Clasical FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 7: Zuneko FC vs Super Galant FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 7, 'Sun, Sep 27', '8:15 AM', v_team_zuneko_fc, v_team_super_galant_fc, 'Zuneko FC', 'Super Galant FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 7: Dazzle FC vs Breakthrough FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 7, 'Sun, Sep 27', '8:45 AM', v_team_dazzle_fc, v_team_breakthrough_fc, 'Dazzle FC', 'Breakthrough FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 8: Pipeline Tornadoes vs Zuneko FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 8, 'Sun, Sep 27', '9:15 AM', v_team_pipeline_tornadoes, v_team_zuneko_fc, 'Pipeline Tornadoes', 'Zuneko FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 8: Rozas FC vs Dazzle FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 8, 'Sun, Sep 27', '9:45 AM', v_team_rozas_fc, v_team_dazzle_fc, 'Rozas FC', 'Dazzle FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 8: Clasical FC vs Ultimate FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 8, 'Sun, Sep 27', '10:15 AM', v_team_clasical_fc, v_team_ultimate_fc, 'Clasical FC', 'Ultimate FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 8: Super Galant FC vs Breakthrough FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 8, 'Sun, Sep 27', '10:45 AM', v_team_super_galant_fc, v_team_breakthrough_fc, 'Super Galant FC', 'Breakthrough FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 9: Dazzle FC vs Super Galant FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 9, 'Sun, Oct 18', '7:15 AM', v_team_dazzle_fc, v_team_super_galant_fc, 'Dazzle FC', 'Super Galant FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 9: Breakthrough FC vs Clasical FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 9, 'Sun, Oct 18', '7:45 AM', v_team_breakthrough_fc, v_team_clasical_fc, 'Breakthrough FC', 'Clasical FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 9: Pipeline Tornadoes vs Rozas FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 9, 'Sun, Oct 18', '8:15 AM', v_team_pipeline_tornadoes, v_team_rozas_fc, 'Pipeline Tornadoes', 'Rozas FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 9: Zuneko FC vs Ultimate FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 9, 'Sun, Oct 18', '8:45 AM', v_team_zuneko_fc, v_team_ultimate_fc, 'Zuneko FC', 'Ultimate FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 10: Breakthrough FC vs Rozas FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 10, 'Sun, Oct 18', '9:15 AM', v_team_breakthrough_fc, v_team_rozas_fc, 'Breakthrough FC', 'Rozas FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 10: Zuneko FC vs Clasical FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 10, 'Sun, Oct 18', '9:45 AM', v_team_zuneko_fc, v_team_clasical_fc, 'Zuneko FC', 'Clasical FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 10: Ultimate FC vs Super Galant FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 10, 'Sun, Oct 18', '10:15 AM', v_team_ultimate_fc, v_team_super_galant_fc, 'Ultimate FC', 'Super Galant FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 10: Dazzle FC vs Pipeline Tornadoes
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 10, 'Sun, Oct 18', '10:45 AM', v_team_dazzle_fc, v_team_pipeline_tornadoes, 'Dazzle FC', 'Pipeline Tornadoes', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 11: Rozas FC vs Ultimate FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 11, 'Sun, Oct 25', '7:15 AM', v_team_rozas_fc, v_team_ultimate_fc, 'Rozas FC', 'Ultimate FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 11: Dazzle FC vs Zuneko FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 11, 'Sun, Oct 25', '7:45 AM', v_team_dazzle_fc, v_team_zuneko_fc, 'Dazzle FC', 'Zuneko FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 11: Pipeline Tornadoes vs Breakthrough FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 11, 'Sun, Oct 25', '8:15 AM', v_team_pipeline_tornadoes, v_team_breakthrough_fc, 'Pipeline Tornadoes', 'Breakthrough FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 11: Super Galant FC vs Clasical FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 11, 'Sun, Oct 25', '8:45 AM', v_team_super_galant_fc, v_team_clasical_fc, 'Super Galant FC', 'Clasical FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 12: Rozas FC vs Zuneko FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 12, 'Sun, Oct 25', '9:15 AM', v_team_rozas_fc, v_team_zuneko_fc, 'Rozas FC', 'Zuneko FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 12: Super Galant FC vs Pipeline Tornadoes
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 12, 'Sun, Oct 25', '9:45 AM', v_team_super_galant_fc, v_team_pipeline_tornadoes, 'Super Galant FC', 'Pipeline Tornadoes', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 12: Ultimate FC vs Breakthrough FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 12, 'Sun, Oct 25', '10:15 AM', v_team_ultimate_fc, v_team_breakthrough_fc, 'Ultimate FC', 'Breakthrough FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 12: Clasical FC vs Dazzle FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 12, 'Sun, Oct 25', '10:45 AM', v_team_clasical_fc, v_team_dazzle_fc, 'Clasical FC', 'Dazzle FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 13: Zuneko FC vs Breakthrough FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 13, 'Sun, Nov 29', '7:15 AM', v_team_zuneko_fc, v_team_breakthrough_fc, 'Zuneko FC', 'Breakthrough FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 13: Rozas FC vs Super Galant FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 13, 'Sun, Nov 29', '7:45 AM', v_team_rozas_fc, v_team_super_galant_fc, 'Rozas FC', 'Super Galant FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 13: Pipeline Tornadoes vs Clasical FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 13, 'Sun, Nov 29', '8:15 AM', v_team_pipeline_tornadoes, v_team_clasical_fc, 'Pipeline Tornadoes', 'Clasical FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 13: Dazzle FC vs Ultimate FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 13, 'Sun, Nov 29', '8:45 AM', v_team_dazzle_fc, v_team_ultimate_fc, 'Dazzle FC', 'Ultimate FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 14: Super Galant FC vs Zuneko FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 14, 'Sun, Nov 29', '9:15 AM', v_team_super_galant_fc, v_team_zuneko_fc, 'Super Galant FC', 'Zuneko FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 14: Ultimate FC vs Pipeline Tornadoes
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 14, 'Sun, Nov 29', '9:45 AM', v_team_ultimate_fc, v_team_pipeline_tornadoes, 'Ultimate FC', 'Pipeline Tornadoes', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 14: Clasical FC vs Rozas FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 14, 'Sun, Nov 29', '10:15 AM', v_team_clasical_fc, v_team_rozas_fc, 'Clasical FC', 'Rozas FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Matchday 14: Breakthrough FC vs Dazzle FC
  insert into fixtures (league_id, matchday, date_string, kickoff_time, home_team_id, away_team_id, home_team, away_team, status, odd_1, odd_x, odd_2, odd_over_2_5, odd_over_3_5, odd_btts)
  values (v_league_id, 14, 'Sun, Nov 29', '10:45 AM', v_team_breakthrough_fc, v_team_dazzle_fc, 'Breakthrough FC', 'Dazzle FC', 'open', 1.85, 3.1, 3.6, 1.95, 2.8, 1.75)
  returning id into v_fixture_id;
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 1X (Home or Draw)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: 12 (Home or Away)', 1.28);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Double Chance: X2 (Draw or Away)', 1.73);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 0.5 Goals', 3);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Under 1.5 Goals', 1.45);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 2-4 Goals', 1.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 3-4 Goals', 2.35);
  insert into custom_markets (fixture_id, label, odds) values (v_fixture_id, 'Multigoals: 4-6 Goals', 3);

  -- Anytime Scorer roster (unassigned to a team — eligible on every fixture)
  insert into scorers (league_id, team_id, name, odds) values (v_league_id, null, 'BELLAMI', 3.25);
  insert into scorers (league_id, team_id, name, odds) values (v_league_id, null, 'DONT DULL', 3.25);
  insert into scorers (league_id, team_id, name, odds) values (v_league_id, null, 'OTTO', 3.25);
  insert into scorers (league_id, team_id, name, odds) values (v_league_id, null, 'OLOWO', 3.25);
  insert into scorers (league_id, team_id, name, odds) values (v_league_id, null, 'NENE', 3.25);
  insert into scorers (league_id, team_id, name, odds) values (v_league_id, null, 'SPEAGY', 3.25);
  insert into scorers (league_id, team_id, name, odds) values (v_league_id, null, 'LARRY', 3.25);
  insert into scorers (league_id, team_id, name, odds) values (v_league_id, null, 'GEDU', 3.25);

end $$;