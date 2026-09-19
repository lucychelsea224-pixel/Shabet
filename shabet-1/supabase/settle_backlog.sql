-- ---------------------------------------------------------------------
-- One-time catch-up script — two parts:
--   1) Settles the Matchday 1-4 backlog (Aug 23-30) with verified scores
--   2) Adds the few Anytime Scorer / Cards roster names that were missing
-- Run the whole file at once in the Supabase SQL editor.
-- ---------------------------------------------------------------------
-- ---------------------------------------------------------------------
-- One-time backlog settlement: Matchday 1-4 (Aug 23-30)
-- ---------------------------------------------------------------------
-- Every score below was cross-checked against the final standings table
-- (Played/Won/Drawn/Lost/Points/Goals) you printed on 30/08/2026 — I
-- recomputed every team's record from these 16 results and all eight
-- matched the printed table exactly, so this is safe to run as-is.
--
-- This calls the same settle_fixture() function the Settlement tab uses
-- (matches by matchday + team name, so it doesn't matter what the live
-- fixture IDs actually are) — it re-evaluates every ticket touching each
-- match to Won/Lost, exactly like clicking "Settle" in the app. No
-- Anytime Scorer or Cards picks are confirmed here (that needs the admin
-- to check the right boxes in Admin > Settlement, since I can't safely
-- guess ticket-level scorer/card picks) — only the 1X2/Over-Under/BTTS/
-- Custom Market legs get settled by this script.
--
-- Safe to run once. Running it a second time just re-settles the same
-- fixtures with the same scores — harmless, but pointless.
-- ---------------------------------------------------------------------

do $$
declare
  v_league_id uuid;
  v_fid uuid;

  -- One row per match: matchday, home team, away team, home score, away score.
  v_results text[][] := array[
    -- Matchday 1
    array['1','Zuneko FC','Pipeline Tornadoes','2','1'],
    array['1','Ultimate FC','Clasical FC','0','0'],
    array['1','Breakthrough FC','Super Galant FC','0','0'],
    array['1','Dazzle FC','Rozas FC','0','0'],
    -- Matchday 2
    array['2','Ultimate FC','Zuneko FC','0','3'],
    array['2','Super Galant FC','Dazzle FC','0','0'],
    array['2','Rozas FC','Pipeline Tornadoes','1','0'],
    array['2','Clasical FC','Breakthrough FC','0','0'],
    -- Matchday 3
    array['3','Clasical FC','Zuneko FC','0','1'],
    array['3','Rozas FC','Breakthrough FC','1','0'],
    array['3','Super Galant FC','Ultimate FC','3','0'],
    array['3','Pipeline Tornadoes','Dazzle FC','1','1'],
    -- Matchday 4
    array['4','Ultimate FC','Rozas FC','0','1'],
    array['4','Breakthrough FC','Pipeline Tornadoes','0','1'],
    array['4','Clasical FC','Super Galant FC','0','1'],
    array['4','Zuneko FC','Dazzle FC','1','1']
  ];
  v_row text[];
begin
  select id into v_league_id from leagues where is_active = true order by created_at desc limit 1;
  if v_league_id is null then
    raise exception 'No active league found — nothing to settle.';
  end if;

  foreach v_row slice 1 in array v_results
  loop
    select id into v_fid
      from fixtures
     where league_id = v_league_id
       and matchday = v_row[1]::integer
       and home_team = v_row[2]
       and away_team = v_row[3];

    if v_fid is null then
      raise notice 'Skipped — no fixture found for Matchday % % vs %', v_row[1], v_row[2], v_row[3];
    else
      perform settle_fixture(v_fid, v_row[4]::integer, v_row[5]::integer);
      raise notice 'Settled Matchday % — % % - % %', v_row[1], v_row[2], v_row[4], v_row[5], v_row[3];
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Missing roster entries — players named on the paper record who
-- weren't yet in the Anytime Scorer / Cards roster. Zune, John, Najeem,
-- and Ziko only ever appear scoring goals on the paper record, so they
-- go on the Scorer roster; Official and A-1 only ever appear getting
-- carded, so they go on the Cards roster (Official was a straight red,
-- everyone else yellow). Team is left blank (eligible on every fixture)
-- since the paper record doesn't make every player's team unambiguous —
-- edit that in Admin > Anytime Scorer / Admin > Cards if you want it
-- narrowed to one team. Odds default to 3.25, same as every other
-- roster entry — adjust there too if you want something different.
-- Safe to re-run: skips any name that's already on the roster.
-- ---------------------------------------------------------------------
do $$
declare
  v_league_id uuid;
begin
  select id into v_league_id from leagues where is_active = true order by created_at desc limit 1;
  if v_league_id is null then
    raise exception 'No active league found — nothing to add.';
  end if;

  insert into scorers (league_id, team_id, name, odds)
  select v_league_id, null, v.name, 3.25
  from (values ('ZUNE'), ('JOHN'), ('NAJEEM'), ('ZIKO')) as v(name)
  where not exists (
    select 1 from scorers where scorers.league_id = v_league_id and upper(scorers.name) = v.name
  );

  insert into cards (league_id, team_id, name, card_type, odds)
  select v_league_id, null, v.name, v.card_type, 3.25
  from (values ('OFFICIAL', 'red'), ('A-1', 'yellow')) as v(name, card_type)
  where not exists (
    select 1 from cards where cards.league_id = v_league_id and upper(cards.name) = v.name
  );
end $$;
