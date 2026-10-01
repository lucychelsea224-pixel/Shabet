-- =====================================================================
-- SHABET — fix: no league marked is_active = true
-- =====================================================================
-- Run the SELECT below first to see what's actually in the table.
select id, name, is_active, created_at from leagues order by created_at;

-- If you see your league in that list but is_active is false for all of
-- them, mark the right one active (swap in its real id from the query
-- above, or just use the name):
update leagues set is_active = true where name = 'PIPELINE LEAGUE';

-- If the table is completely empty (no rows at all), create one instead:
-- insert into leagues (name, is_active) values ('PIPELINE LEAGUE', true);

-- Sanity check — this should return exactly one row.
select id, name, is_active from leagues where is_active = true;
