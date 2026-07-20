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
  agent.js                   -- Fixture Board, Betslip (bottom sheet on mobile), Ticket History
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

## Setting up the database

Run `supabase/schema.sql` in the Supabase SQL editor — it's identical to the React build's schema,
since the database doesn't care which frontend talks to it. See the comments at the top of the file
for the account-role setup, and the file itself for `leagues` / `players` / `fixtures` / `tickets`,
the `settle_fixture()` RPC, and the `financial_summary` view.

The frontend still runs on `localStorage` only for now — wiring it to Supabase means adding
`supabase.from(...)` calls in `js/store.js` in place of the localStorage reads/writes.

## Key behaviors to know about

- **Login is account-based, not a toggle.** `auth.js` reads the role off the session; `app.js`
  renders Agent or Admin accordingly.
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

## Extending

- Odds fields (`odd_over_3_5`, `anytime_scorer`, `odd_scorer`) are wired into the data model, the
  admin configurator, and the SQL schema, but not yet exposed as tappable markets on the fixture
  board — add entries to `MARKETS` in `js/agent.js` to expose them.
- Swap `icons/logo-full.svg` / `icons/icon-mask.svg` for a professionally designed mark before
  this goes to production — the current one is a clean placeholder, not a final brand asset.
