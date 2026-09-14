# Shabet — Agent & Admin (plain HTML/CSS/JS)

Same app as the React build, rewritten with no framework and no build step. It's plain
HTML/CSS/JS using native ES modules — open it in a browser, or drop the folder on any static
host, and it runs.

Currently configured for the **PIPELINE LEAGUE** — the league name is editable from the Admin
dashboard, so Shabet can be reused for other leagues without touching the code. No online payment
gateway: all cash is handed to the agent, who books the ticket on the customer's behalf.

## How Shabet works (plain-English overview)

This section exists so that anyone looking through the code or the repo — a
collaborator, a new developer, an auditor, whoever — can understand what this app
does and doesn't do, without having to reverse-engineer it from the source.

**What Shabet is.** It's a private ticket-booking and results-tracking tool for a
small, closed betting pool run by the operator (currently the "PIPELINE LEAGUE").
It manages fixtures, odds, bet slips ("tickets"), and settlement of those tickets
against real match results. It is **not** a public online sportsbook, and it does
not hold, move, or automate any money on anyone's behalf.

**How money works — and why it works this way.** Every stake is settled directly
between the operator and the customer, outside the app entirely (cash in person via
an agent, or a bank transfer to the operator's own account). The app never touches a
payment gateway, never auto-credits a wallet from an incoming deposit, and never pays
out winnings itself. This isn't a missing feature — it's deliberate: running software
that automatically accepts public deposits and pays out against betting outcomes is
operating a licensed gambling business, and this app is built to stay outside that
territory. If a future version of this ever needs a real payment gateway or an
automatic wallet, that only happens once there's an actual gambling license in place
to operate under — see "Self-service upgrade" below for how the current design keeps
that line clear.

**The three roles.**
- **Admin** — the operator. Configures fixtures/odds, settles match results, manages
  the customer list, approves or rejects payment claims (see below), views financials.
- **Agent** — takes cash from a walk-in customer and books the ticket on their behalf.
  No money ever passes through the software; the agent physically holds the cash.
- **Customer / self-service user** *(see next section — this role is part of the
  planned upgrade, not the original build)* — can register their own account, build
  and submit their own ticket, and see their own history. They still pay the operator
  directly (bank transfer); the app just tracks that a payment claim is pending.

**What the app actually stores.** Fixtures, odds, teams, tickets (who selected what,
at what odds, for what stake), match results, and — once the self-service upgrade
below is built — user profiles and a payment-confirmation log. It does **not** store
card numbers, bank login details, or any payment-gateway credentials, because it never
talks to a payment gateway.

## Self-service upgrade — how it actually works (implemented)

The original build required a human agent to physically book every ticket. The
self-service upgrade (see `docs/self-service-spec.md` for the original planning doc)
lets customers who aren't physically near an agent register their own account and
submit their own ticket — while keeping the "money never touches the app" principle
intact:

1. **Landing page.** Anyone who isn't signed in sees a landing screen first (`js/app.js`
   → `renderLanding()`) with two choices: **Create Account** or **Sign In**. This
   replaced the old "always show the login form" behavior — customers now create their
   own login instead of an admin issuing one to them.
2. **Create Account** (`renderSignup()`) collects Full Name, Phone, Email, and Password,
   and calls `supabase.auth.signUp()` with `role: 'customer'` stored in that user's own
   `user_metadata` (see the "SELF-SERVICE CUSTOMERS" note in `supabase/schema.sql` for
   why this is safe even though it's client-set — nothing about ticket privacy or
   admin/agent access depends on it).
3. A signed-in customer gets the same Fixtures/Betslip screens an agent uses
   (`js/agent.js`, now role-aware), but the button reads **Submit Ticket** instead of
   **Book & Print**. Submitting calls `submitCustomerTicket()` in `js/store.js`, which
   creates the ticket with `payment_status = 'pending_payment'` — nothing has been paid
   yet, and there is no print/receipt step for self-service.
4. The confirmation screen (and a banner shown on every tab) shows the operator's bank
   account details from Admin → Payment Account. The customer transfers the money
   **directly to that bank account**, the same way they'd hand cash to an agent — the
   app has no part in moving that money.
5. The operator checks their own bank account (outside Shabet) to see the transfer
   actually landed, then goes to **Admin → Payment Approvals** and clicks **Confirm
   Payment** (or **Reject**, with an optional reason, if it never came through).
6. Only after that manual confirmation does the ticket become active and eligible for
   settlement — exactly like an agent-booked ticket from that point on. A customer's
   **My Tickets** tab (the self-service version of Ticket History) only ever shows
   *their own* tickets, with a Pending Payment / Payment Confirmed / Payment Rejected
   badge — enforced server-side by the `read own or staff tickets` RLS policy in
   `schema.sql`, not just hidden in the UI.

This is a manual, human-in-the-loop approval step by design, not an automated payment
integration — there is no Paystack/Flutterwave/card integration anywhere in this
codebase, and none should be added without first confirming the operation is properly
licensed to accept public deposits and run wagering, since that changes the legal
nature of what this software is being used for. Anyone reviewing this codebase for
that reason can search it for "paystack", "flutterwave", "wallet", or "balance" and
confirm none of that machinery exists — the only money-adjacent columns are on
`tickets` (records a stake amount and a payment claim status, never holds funds) and
`leagues` (the operator's own bank details as display text — see the next section).

## Payment Account (admin sets it, user side reflects it)

Admin has a **Payment Account** tab (`paymentAccountHtml()` in `js/admin.js`) with three
fields: Bank Name, Account Number, Account Name. Whatever's entered there — saved
automatically on blur, no separate Save button — immediately reflects on the Agent/user
side as a small banner at the top of every tab (`paymentInfoBannerHtml()` in
`js/agent.js`), so whoever is booking a ticket always knows exactly where to send the
customer's transfer. The banner only appears once at least one field has been filled in.

This is stored on the `leagues` row (`payment_bank_name` / `payment_account_number` /
`payment_account_name` columns — see `supabase/schema.sql`) and syncs the same way the
League Name does: instantly in local-only mode, and across every device via Supabase
Realtime once the database is connected. As with everything else in this app, this is
**display-only text** — Shabet never touches the transfer itself; the admin still
manually confirms a payment landed (see "How money works" above) before treating a
ticket as paid.

## Contact & Privacy Policy

Every screen (login and the main app) shows a small footer with three links, plus a
floating WhatsApp button in the bottom-right corner:

- **WhatsApp** — opens a chat with the admin at `+2349051616475` (via `wa.me`), both
  from the floating button and the footer link.
- **Contact Customer Service** — opens the user's email client addressed to
  `shabet032@gmail.com`.
- **Privacy Policy** — opens an in-app modal (see `privacyPolicyHtml()` in `js/app.js`)
  explaining what information Shabet collects, what it deliberately does *not* collect
  (no card numbers, no bank logins — see the "How money works" section above), and how
  to reach us about it.

These live in `js/app.js` (`footerHtml()`, `wireFooter()`) and their styling is in the
"Footer: WhatsApp FAB, Privacy Policy, Contact" section of `css/styles.css`. To change
the WhatsApp number or support email, edit the `WHATSAPP_NUMBER` / `SUPPORT_EMAIL`
constants near the top of `js/app.js` — nothing else needs to change.

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
  admin.js                   -- Fixture Configurator (incl. League Name), Settlement, Users,
                                 Teams, Financials
  nav.js                     -- shared core-tabs + hamburger "More" menu used by both dashboards
  app.js                     -- entry point: auth gating, header, mounts Agent or Admin view
icons/
  icon-mask.svg / icon-192.png / icon-512.png  -- app icon (ball-seam + "S" ribbon monogram)
  logo-full.svg / logo-full.png                -- horizontal SHABET wordmark lockup
supabase/schema.sql          -- full Postgres schema, RLS, settlement RPC, financial view,
                                 profiles table + signup trigger, admin_delete_user() RPC
```

There's no `package.json`, no npm install, no bundler. `supabase-js` is the one third-party piece,
and it's loaded straight from `esm.sh` only if you've filled in real Supabase credentials — with
none set, the app never fetches it and runs entirely on localStorage.

## Setting up the two logins (one agent, one admin)

This section is about the two **staff** accounts only. Customers don't need any of this — they
tap "Create Account" on the landing screen and self-register (see "Self-service upgrade" above).
Shabet still expects exactly two Supabase Auth accounts for staff, and whichever one you log
into decides the view you get; there's no in-app switch.

1. In the Supabase Dashboard: **Authentication > Users > Add User**, twice (e.g.
   `agent@yourdomain.com` and `admin@yourdomain.com`).
2. Run the two `update auth.users ... raw_app_meta_data` statements at the top of
   `supabase/schema.sql` to tag one account `role: "agent"` and the other `role: "admin"`.
3. Open `js/supabaseClient.js` and fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

Until you do that, the login screen runs a local-dev fallback: sign in with
`agent@shabet.local` or `admin@shabet.local` (any password) to preview each view.

**If admin changes keep reverting after a refresh** (a fixture you closed shows "open" again,
settlement doesn't stick, an odds edit disappears): the account is signed in, but its session token
was issued *before* `role: "admin"` was set on it. Supabase only puts `app_metadata` into the JWT
at sign-in time — running the `update auth.users` statement while that browser already has an
active session does nothing until it gets a new token. **Sign all the way out and back in** on that
account and it'll pick up the role. As of this build, a failed save now shows a red banner at the
top of the screen saying exactly this, instead of silently doing nothing and only surfacing on the
next reload — see `reportIfWriteFailed()` in `js/store.js` if you want to see how that's detected.

## Setting up the database (this is what makes data actually shared, not just local)

Until this is done, everything an agent or admin does only lives in that one browser's
localStorage — it never reaches the other device. Two steps fix that:

1. **Run `supabase/schema.sql`** in the Supabase SQL editor. Creates `leagues` / `players` /
   `fixtures` / `scorers` / `custom_markets` / `tickets` / `profiles`, the `settle_fixture()` and
   `admin_delete_user()` RPCs, the `financial_summary` view, RLS policies, a trigger that
   auto-fills `profiles` on signup, and turns on Realtime for every table above. See the comments
   at the top of that file for the two-account role setup. Safe to re-run on a database that
   already has these tables — every statement is written as create-if-missing / drop-and-recreate,
   so running it again (e.g. after pulling an update like the Users tab) just adds what's new.
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

## Managing customer accounts (Admin > Users)

Admin > **Users** is a directory of every self-service customer account — name, phone, email,
how many tickets they've booked, total staked, pending payout, won payout, and (on request) their
full ticket-by-ticket history with selections and stakes. It's populated from a `profiles` table
(`supabase/schema.sql`) that's kept in sync automatically: a database trigger
(`handle_new_user()`) writes a row the moment someone signs up, because the app's Supabase key
can never list `auth.users` directly — only a service-role key (never shipped to the client) can
do that.

**Deleting a user.** The Delete button on a user's card calls an `admin_delete_user()` RPC
(security-definer, admin-only) that removes their login outright. Their past tickets are kept —
only the `user_id` link is cleared — so Ticket History and Financials still reflect everything
they ever booked; they just can't sign in or submit new tickets anymore. This is why deletion asks
for confirmation before running: it's not reversible.

Each customer only ever sees their **own** booking history in the app (My Tickets), enforced by
the `read own or staff tickets` RLS policy on `tickets` — not just hidden in the UI. Admin > Users
is the one place all customers' histories are visible together, for staff only.

## Dashboard layout on phones (hamburger menu)

Both the Agent/Customer view and the Admin dashboard split their tabs into two groups (see
`js/nav.js`): a small set of **core** tabs that stay on screen at all times because they're used
constantly, and everything else, which collapses behind a **☰ More** button below a ~640px
screen width so a phone isn't stuck scrolling a long row of tabs. Above that width, every tab
still shows inline and the hamburger button disappears — nothing is hidden on desktop.

- **Agent / Customer**: Fixtures and Ticket History/My Tickets are core; Standings is behind More.
- **Admin**: Fixtures & Odds, Settlement, Payment Approvals, and Users are core; Payment Account,
  Teams, Anytime Scorer, Financials, and Migrate Local Data are behind More.

Adjust which tabs are core by editing the `core: true` flags on the `TABS` array in `js/admin.js`
or the `tabsList()` function in `js/agent.js` — `js/nav.js` itself doesn't hardcode the split.

## Extending

- Add or rename market groups on the Details page by editing `MARKET_GROUPS` in `js/agent.js` —
  Match Result / Total Goals / Both Teams to Score are just entries in that array, same shape as
  the fields already there.
- Swap `icons/logo-full.svg` / `icons/icon-mask.svg` for a professionally designed mark before
  this goes to production — the current one is a clean placeholder, not a final brand asset.
