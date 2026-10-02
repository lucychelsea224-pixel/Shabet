-- =====================================================================
-- SHABET — fix: duplicate/ambiguous settle_fixture() function
-- =====================================================================
-- Root cause of "settlement is not coming up" after re-running
-- schema.sql + settle_backlog.sql:
--
-- fix_admin_rls.sql (run at some point in the past, before Cards existed)
-- contains its OWN copy of settle_fixture(), with only 5 parameters
-- (no p_card_ids). schema.sql's settle_fixture() has 6 parameters
-- (p_card_ids added later). Postgres treats a function's parameter
-- LIST as part of its identity — "create or replace function
-- settle_fixture(...6 params...)" does NOT replace a function that
-- was created with 5 params, it just creates a second, separate
-- function that happens to share the name. So the database has ended
-- up with TWO settle_fixture() functions living side by side:
--
--   settle_fixture(uuid, integer, integer, uuid[], uuid[])          -- old, 5 params, from fix_admin_rls.sql
--   settle_fixture(uuid, integer, integer, uuid[], uuid[], uuid[])  -- current, 6 params, from schema.sql
--
-- Any call that doesn't explicitly supply every one of the optional
-- array parameters (which is exactly what settle_backlog.sql's
-- `perform settle_fixture(v_fid, home, away)` does, and what some
-- code paths in the app do too) can no longer tell which of the two
-- to use, since both would accept it once defaults are applied. That
-- makes Postgres — and PostgREST, which is even stricter about this —
-- reject the call outright with an "is not unique" / "could not choose
-- the best candidate function" error instead of running either one.
-- That's why the backlog script's settlements silently didn't apply,
-- and why the app's own Settle button (and every automatic retry of
-- it) has been failing and piling up in the "not yet synced" queue.
--
-- Fix: drop the old 5-parameter version. The correct 6-parameter one
-- from schema.sql is left untouched. Safe to run any number of times.
-- ---------------------------------------------------------------------

drop function if exists public.settle_fixture(uuid, integer, integer, uuid[], uuid[]);

-- Sanity check — after running the DROP above, this should list
-- exactly ONE settle_fixture function, with 6 parameters ending in
-- p_card_ids. If you see two rows here, the DROP didn't match (e.g.
-- the old one had different parameter names) — paste the output back
-- and it can be fixed with an exact signature instead.
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as parameters
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'settle_fixture';
