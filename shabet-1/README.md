# Shabet — Agent & Admin (plain HTML/CSS/JS)

Same app as the React build, rewritten with no framework and no build step. It's plain
HTML/CSS/JS using native ES modules — open it in a browser, or drop the folder on any static
host, and it runs.

Currently configured for the **PIPELINE LEAGUE** — the league name is editable from the Admin
dashboard, so Shabet can be reused for other leagues without touching the code. No online payment
gateway: all cash is handed to the agent, who books the ticket on the customer's behalf.

## Running it

You can't just double-click `index.html` — browsers block ES module imports over the `file://`
protocol. Serve the folder instead, with anything that serves static files:

```bash
python3 -m http.server 8000
# or: npx serve .
```

Then open `http://localhost:8000`. Installing it via "Add to Home Screen" on a phone gives the
standalone PWA experience (offline app shell, home-screen icon).

## How it's organized

```
index.html                  -- the entire page shell; loads css/js, nothing else
css/styles.css               -- all styling (plain CSS, no Tailwind) + the print receipt styles
manifest.webmanifest         -- PWA manifest
sw.js                        -- hand-written service worker, cache-first app shell
js/
  data.js                    -- the 14-matchday seed schedule + default odds
  store.js                   -- all app state: localStorage persistence, settlement engine,
                                 financials, draft betslip — the equivalent of the old AppContext
  supabaseClient.js          -- loads @supabase/supabase-js from a CDN if you fill in your project's
                                 URL/key; leave blank to keep running on localStorage only
  auth.js                    -- session handling + local-dev login fallback
  receipt.js                 -- builds the printable thermal-receipt HTML
  agent.js                   -- Fixture list + per-match Details page, Betslip (bottom sheet on
                                 mobile), Ticket History
  admin.js                   -- Fixture Configurator (incl. League Name), Settlement, Teams, Financials
  app.js                     -- entry point: auth gating, header, mounts Agent or Admin view
icons/
  icon-mask.svg / icon-192.png / icon-512.png  -- app icon (ball-seam + "S" ribbon monogram)
  logo-full.svg / logo-full.png                -- horizontal SHABET wordmark lockup
supabase/schema.sql          -- full Postgres schema, RLS, settlement RPC, financial view (unchanged)
```

There's no `package.json`, no npm install, no bundler. `supabase-js` is the one third-party piece,
and it's loaded straight from `esm.sh` only if you've filled in real Supabase credentials — with
none set, the app never fetches it and runs entirely on localStorage.

## Setting up the two logins (one agent, one admin)

Same as before — Shabet expects exactly two Supabase Auth accounts, and whichever one you log
into decides the view you get; there's no in-app switch.

1. In the Supabase Dashboard: **Authentication > Users > Add User**, twice (e.g.
   `agent@yourdomain.com` and `admin@yourdomain.com`).
2. Run the two `update auth.users ... raw_app_meta_data` statements at the top of
   `supabase/schema.sql` to tag one account `role: "agent"` and the other `role: "admin"`.
3. Open `js/supabaseClient.js` and fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

Until you do that, the login screen runs a local-dev fallback: sign in with
`agent@shabet.local` or `admin@shabet.local` (any password) to preview each view.

## Setting up the database (this is what makes data actually shared, not just local)

Until this is done, everything an agent or admin does only lives in that one browser's
localStorage — it never reaches the other device. Two steps fix that:

1. **Run `supabase/schema.sql`** in the Supabase SQL editor. Creates `leagues` / `players` /
   `fixtures` / `scorers` / `custom_markets` / `tickets`, the `settle_fixture()` RPC, the
   `financial_summary` view, RLS policies, and turns on Realtime for every table above. See the
   comments at the top of that file for the two-account role setup.
2. **Run `supabase/seed.sql`** right after, in the same SQL editor. `schema.sql` only creates empty
   tables — this second script is what actually inserts the 8 teams, all 56 fixtures across the
   14 matchdays (with the default odds and the 8-market Custom Markets template on every one), and
   the starting Anytime Scorer roster. It's safe to re-run — it clears its own previous seed first,
   so running it twice doesn't duplicate anything.
3. Fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `js/supabaseClient.js` if you haven't already.

Once both scripts have run and the client has real credentials, `js/store.js` talks to Supabase
directly: every booking, settlement, odds edit, and league rename writes straight to the database,
and a Realtime subscription pushes every other device's changes back in live — so the admin's
phone and the agent's phone stay in sync without either one reloading the page. There's still a
localStorage cache underneath (for the offline-first PWA shell and the in-progress betslip draft),
but it's a cache now, not the source of truth.

If `SUPABASE_URL`/`SUPABASE_ANON_KEY` are left blank, the app quietly falls back to the original
localStorage-only behavior — useful for local development, but that's the mode where two devices
won't see each other's data, which is what prompted this section to begin with.

## Key behaviors to know about

- **Login is account-based, not a toggle.** `auth.js` reads the role off the session; `app.js`
  renders Agent or Admin accordingly.
- **League Standings tab.** Agent view has a third tab alongside Fixtures and Ticket History —
  a live table (Played/Won/Drawn/Lost/Points/Goals For:Against) computed entirely from completed
  fixtures' final scores (`computeStandings()` in `js/store.js`): 3 points for a win, 1 for a draw,
  ranked by points then goal difference then goals scored. The header reads the current league name
  automatically, so renaming the league updates the standings title too. Team badges are generated
  initials on a color picked from the team name (there's no real crest artwork here) — swap in
  actual logos by editing `standingsHtml()` if you have them. The table itself isn't manually
  editable — it's a read-only reflection of match results, so the only way to change it is to
  settle fixtures with different scores in Admin > Settlement. The table shrinks to fit narrow
  phone screens rather than forcing a sideways scroll — long team names ellipsize instead of
  pushing the layout wider than the screen; see the `@media (max-width: 420px)` block under
  "League standings" in `css/styles.css` if you need to tune it further.
- **Print Standings.** The "🖨️ Print Standings" button opens a separate print-ready window (not
  the same code path as ticket receipts, so the two never conflict) with the Shabet logo, the
  current league name, the full table, and a "Printed from Shabet · <timestamp>" footer, formatted
  for a normal sheet of paper rather than a thermal roll. `printStandings()` in `js/agent.js` builds
  that page from scratch and calls `.print()` on it.
- **Tap a fixture to see its full market list.** The fixture board is now a compact scannable
  list — each row shows the two teams, kickoff time, status, and a quick 1X2 preview. Tapping a
  row opens a dedicated "Details" page for that match (`fixtureDetailHtml` in `js/agent.js`),
  grouped into Match Result, Total Goals, Both Teams to Score, More Markets, and Anytime Scorer —
  the same pattern as tapping into a match on a mainstream sportsbook. All the existing
  multi-select and betslip behavior works the same from there; a "‹ Back to Fixtures" link returns
  to the list.
- **Custom markets — add any betting option you want, per fixture.** Every fixture ships with a
  default set (Double Chance 1X/12/X2, Under 0.5, Under 1.5, Multigoals 2-4/3-4/4-6) but that's
  just a starting point. Admin > Fixtures & Odds has a "Custom Markets" section per fixture — edit
  or remove any of those, or add brand new ones with any label and any odds, no limit. They show up
  in a "More Markets" group on that fixture's Details page. Since these are free-text, the app
  can't infer a winner from the score alone — settling a fixture lets the admin check off which
  custom-market outcomes actually hit, same pattern as Anytime Scorer confirmation.
- **Multiple markets per fixture, in one slip.** An agent can pick 1, X, BTTS — any combination —
  on the same match and add them all to the same betslip; picking one market no longer clears any
  other market already picked on that fixture. (Worth knowing: if two picks on the same match are
  mutually exclusive — e.g. Home Win and Draw — the accumulator can never actually win, since only
  one outcome can happen. Shabet lets the agent build it either way; that's a betting-shop judgment
  call, not something the app enforces.)
- **Anytime Scorer is a dropdown of admin-entered names, not free text.** Admin > Anytime Scorer
  manages the roster — add a player, optionally tie them to a team, set their odds; there's no cap
  on how many you add. The fixture Details page only ever shows a `<select>` built off that list,
  so agents/customers pick from it rather than typing a name. Settling a fixture lets the admin
  check
  off who actually scored anytime; every Scorer pick on tickets touching that fixture resolves
  against that list.
- **League name is a setting.** Admin > Fixtures & Odds has a "League Name" field. It drives the
  header subtitle, the fixture board label, and gets stamped onto every ticket so it prints on
  the receipt.
- **Match status is 100% manual.** Nothing locks on the clock — the admin flips a fixture to
  `live` the moment it actually kicks off.
- **Settlement.** Setting a final score on Admin > Settlement re-evaluates every ticket that
  touched that fixture: `lost` if any leg lost, `won` once every leg is decided and none lost,
  otherwise stays `pending`.
- **Re-renders and typing.** Selection toggles, settlement, and admin dropdowns trigger a full
  re-render of the current view (simple and reliable at this scale). Text/number inputs
  (customer name, stake, and every field in the fixture editor) update the underlying data on
  `input`/`change` without forcing a full re-render, so you don't lose your cursor position while
  typing.
- **Receipt printing.** "Book & Print" saves the ticket, fills the hidden `#receipt-print` node,
  and calls `window.print()`. The `@media print` rules in `css/styles.css` hide everything else
  and size the receipt for a 58mm/80mm thermal roll.

## Migrating pre-Supabase local data

If any device booked tickets or had match results entered while running on localStorage only
(before the database was connected, or before `SUPABASE_URL`/`SUPABASE_ANON_KEY` were filled in),
that data doesn't disappear — the first time the app runs with Supabase configured, it silently
snapshots whatever was in localStorage into a permanent backup key (`shabet_pre_supabase_backup_v1`
— see `snapshotPreSupabaseDataOnce()` in `js/store.js`) before the live Supabase fetch replaces the
working copy. That backup is written once and never touched again, so it survives however many
times the page reloads afterward.

Admin > **Migrate Local Data** shows whatever's in that backup, in two steps:

1. **Match results** — each locally-completed fixture is matched to its live counterpart by
   matchday + team names (the two use completely different id schemes, so names are the only
   reliable link). Select the ones you want and click Import — this reuses the exact same
   settlement path as Admin > Settlement, RPC included.
2. **Booked tickets** — any local ticket not already in the database, with its fixture references
   remapped to the matching live fixtures. These import with their status and per-leg results
   exactly as they were already computed locally — **not** re-settled — so a ticket's Anytime
   Scorer or Custom Market legs (which reference ids that don't exist in the live database) keep
   whatever outcome was already correctly decided that day, rather than getting silently reset.

**Import order matters**: results first, then tickets. Importing a result re-settles every ticket
tied to that fixture; doing that after a ticket is already imported risks resetting one of its
scorer/custom-market legs back to "lost." Doing it in the recommended order sidesteps the problem
entirely, since there's nothing imported yet for the re-settlement to touch.

If a fixture or ticket shows "No matching fixture found" / "Missing fixture match," it means
`supabase/seed.sql` doesn't have a fixture with that exact matchday + team-name combination — check
that seed data matches what was actually used locally before importing.

## Reviewing and reprinting a booked slip

Every ticket in Agent > Ticket History has a "🖨️ Reprint Slip" button — it rebuilds the same
receipt shown at booking time (`renderReceipt()` in `js/receipt.js`) from the ticket's stored data
and reprints it. Useful for a jammed printer or a customer who needs a second copy; it does not
create a new ticket or change anything about the original.

## Extending

- Add or rename market groups on the Details page by editing `MARKET_GROUPS` in `js/agent.js` —
  Match Result / Total Goals / Both Teams to Score are just entries in that array, same shape as
  the fields already there.
- Swap `icons/logo-full.svg` / `icons/icon-mask.svg` for a professionally designed mark before
  this goes to production — the current one is a clean placeholder, not a final brand asset.
