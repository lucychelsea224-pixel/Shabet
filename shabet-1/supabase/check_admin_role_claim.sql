-- =====================================================================
-- SHABET — check: does this account actually carry role = 'admin'?
-- =====================================================================
-- Every admin-write policy in this schema checks:
--   auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
-- That reads a claim baked into the session's JWT at the moment it was
-- issued — not a live lookup. If admin access was granted (or re-granted)
-- AFTER this session's last sign-in, the still-logged-in browser is
-- carrying an old JWT without that claim, and every write silently gets
-- blocked by RLS with no error — exactly "no error code, just doesn't
-- save" with nothing in the response to explain why.

-- Replace with the actual email you're logged in as on the admin device.
select
  id,
  email,
  raw_app_meta_data ->> 'role' as role_in_database,
  last_sign_in_at
from auth.users
where email = 'REPLACE_WITH_YOUR_ADMIN_EMAIL';

-- If role_in_database already says 'admin': the FIX is simply to sign out
-- and sign back in on the admin device — that mints a fresh JWT with the
-- current claim. Use "Sign out everywhere" in Admin > Payment Account >
-- Account Security to be sure every open tab/device gets a clean session.

-- If role_in_database is null or anything other than 'admin', set it:
-- update auth.users
-- set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', 'admin')
-- where email = 'REPLACE_WITH_YOUR_ADMIN_EMAIL';
-- Then sign out and back in on that account to pick up the new claim.
