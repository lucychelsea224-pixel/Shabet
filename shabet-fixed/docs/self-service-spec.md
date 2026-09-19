# Shabet — Self-Service Upgrade: Requirements & Implementation Plan

**Scope confirmed:** Self-service registration + ticket submission, manual payment
confirmation (no automated wallet/deposit engine), full hamburger-menu UI overhaul on
both Admin and User sides. Money changes hands **outside** the app (bank transfer to
the operator's account); the app only tracks ticket status and admin approvals.

---

## PART 1 — SYSTEM REQUIREMENTS & PREREQUISITES

### 1.1 Tech Stack & Hosting

You already have most of this decided by the existing build — this upgrade extends it
rather than replacing it.

| Layer | Current | Recommendation for this upgrade |
|---|---|---|
| Frontend | Plain HTML/CSS/JS, ES modules, PWA | **Keep.** No framework needed — adding self-service views is more screens, not more complexity. |
| Backend / DB | Supabase (Postgres + Auth + Realtime) | **Keep.** Supabase Auth already gives you real user accounts, RLS, and Realtime for free — exactly what self-service needs. |
| Hosting | Static host (any) | Netlify, Vercel, or Cloudflare Pages (free tier is enough at this scale). Supabase project stays on Supabase's own hosting. |
| Notifications (new) | none | Supabase Realtime (already used) can push "new pending ticket" to the admin live. Optional: email via Supabase Auth's built-in SMTP, or a free-tier transactional email service if you want customers emailed on confirm/reject. |

**What must change:** Supabase Auth currently expects exactly **two** accounts (one
agent, one admin — see `schema.sql` comments). Self-service means *any number* of
customer accounts, so auth needs a third role (`customer`) that anyone can self-register
into, while `agent`/`admin` stay admin-assigned only (never self-registered).

### 1.2 Database Schema — new/changed tables

Everything below is additive to your existing `leagues / players / fixtures / scorers /
custom_markets / tickets` — nothing there needs to change structurally.

**`profiles`** (new — one row per Supabase Auth user, customers included)
| field | type | notes |
|---|---|---|
| id | uuid, PK, references auth.users(id) | |
| full_name | text | |
| phone | text | shown to admin for contacting the customer about payment |
| role | text check in ('admin','agent','customer') | default 'customer' |
| status | text check in ('active','suspended') | default 'active' — lets admin block a user without deleting history |
| created_at | timestamptz | |

**`tickets`** (existing table — add these columns)
| field | type | notes |
|---|---|---|
| user_id | uuid, references profiles(id) | who submitted it (null for old agent-booked tickets) |
| payment_status | text check in ('pending_payment','confirmed','rejected') | default 'pending_payment' |
| payment_reference | text | optional — customer can type the bank transfer reference/narration |
| confirmed_by | uuid, references profiles(id) | which admin confirmed it |
| confirmed_at | timestamptz | |
| rejection_reason | text | optional note shown back to the customer |

Note: `tickets.status` (won/lost/pending) already exists and is untouched — it's about
*match outcome*. `payment_status` is new and is about *money*, kept deliberately
separate so the settlement engine (which only cares about match outcome) doesn't need
to know anything about payments.

**`admin_logs`** (new — audit trail)
| field | type | notes |
|---|---|---|
| id | uuid PK | |
| admin_id | uuid, references profiles(id) | |
| action | text | e.g. 'confirmed_payment', 'rejected_payment', 'settled_fixture', 'edited_odds' |
| target_table | text | e.g. 'tickets', 'fixtures' |
| target_id | uuid | |
| detail | jsonb | freeform — old/new values, reason text, etc. |
| created_at | timestamptz | |

**`payment_accounts`** (new — the account details shown to customers)
| field | type | notes |
|---|---|---|
| id | uuid PK | |
| bank_name | text | |
| account_number | text | |
| account_name | text | |
| is_active | boolean | lets you swap accounts without editing code |

### 1.3 Roles & Permissions

| Role | Created how | Can do |
|---|---|---|
| **Admin** | Manually assigned (as today) | Everything: fixtures/odds, settlement, confirm/reject payments, view all users & tickets, manage payment accounts, view logs |
| **Agent** | Manually assigned (as today) | Book tickets on behalf of walk-in customers (existing cash flow, unchanged) |
| **Customer / Self-Service User** | **Self-registers** (email + password via Supabase Auth signup) | Build & submit own bet slips, view own ticket history, see payment account details + their own ticket's pending/confirmed/rejected status. **Cannot** see other users' tickets, cannot touch odds/settlement. |

RLS policy changes needed (extending the pattern already in `schema.sql`):
- `profiles`: a user can read/update only their own row; admin can read all.
- `tickets`: a customer can insert a ticket with their own `user_id`, and select only
  rows where `user_id = auth.uid()`. Admin can select/update all (as already true for
  settlement). Agents keep current behavior (insert on behalf of walk-ins, no `user_id`
  or set to the agent's own id — your call).
- `admin_logs`: insert/select restricted to `role = 'admin'`.
- `payment_accounts`: readable by anyone authenticated (customers need to see where to
  pay); writable by admin only.

---

## PART 2 — FEATURE SPECIFICATIONS & WORKFLOW

### 2.1 User / Customer Interface

**Sign up / log in**
- New "Create Account" screen: name, phone, email, password → Supabase Auth signup →
  auto-creates a matching `profiles` row (via a Postgres trigger on `auth.users` insert,
  same pattern Supabase recommends).
- Existing login screen gains a "New here? Create an account" link.

**Self-Service Ticket Submission**
- Reuses the existing Fixtures list + fixture Details page + Betslip **exactly as they
  work today for agents** — no need to rebuild the betting UI, just make it available
  to the `customer` role too.
- On "Submit" (renamed from "Book & Print", since there's no print for self-service):
  - Ticket is created with `payment_status = 'pending_payment'`, a generated ticket ID.
  - Confirmation screen shows: the ticket ID, total stake, potential return, and the
    active `payment_accounts` row ("Transfer ₦X to [bank] [account number] [account
    name], then wait for confirmation — usually within [your stated turnaround]").
  - Optional field: customer can paste their transfer reference/narration to help you
    match it faster.

**User Ticket History**
- List of the customer's own tickets with a status badge:
  - `Pending Payment` (grey) — submitted, not yet confirmed
  - `Active` (blue) — payment confirmed, match not yet settled
  - `Won` / `Lost` (green/red) — match settled
  - `Rejected` (also shown if admin rejects — with the reason, if provided)
- Tapping a ticket shows the full slip (same detail view as the receipt, minus print
  styling).

### 2.2 Admin Dashboard & Complete User Tracking

**Payment Approval Queue** (new tab)
- Realtime list of all tickets where `payment_status = 'pending_payment'`, newest first.
- Each row: customer name/phone, ticket ID, stake, submitted time, reference (if given).
- Two actions: **Confirm Payment** → sets `payment_status = 'confirmed'`,
  `confirmed_by`, `confirmed_at`; writes an `admin_logs` row. **Reject** → prompts for
  an optional reason, sets `payment_status = 'rejected'`; writes an `admin_logs` row.
- Confirmed tickets drop off this queue and behave exactly like an agent-booked ticket
  from that point on (eligible for settlement, shows in standings/financials as normal).
- Rejected tickets never enter the settlement/financial numbers.

**Detailed User & Game History**
- New "Users" tab: searchable table of every `profiles` row with role `customer` —
  name, phone, email, join date, total tickets, total confirmed stake, won/lost/pending
  counts.
- Tapping a user shows their full ticket list (same shape as their own history view) —
  every selection played, stake, potential payout, current status.
- Admin can toggle a user's `status` to `suspended` (blocks login) if needed — no
  deletion, history stays intact.

**Resulting & Settlement Engine**
- **Unchanged** — this already exists (`settle_fixture()` RPC in your schema). Self-
  service tickets flow through the exact same settlement path as agent tickets once
  `payment_status = 'confirmed'`. No new settlement logic needed.

**Admin Logs view**
- Simple filterable table over `admin_logs` — who did what, when. Useful if more than
  one person ends up with admin access.

### 2.3 UI/UX & Mobile Design

- Replace the current top-level dashboard/tab-bar layout with a **hamburger (≡) side
  drawer** on both Admin and User sides — same visual language, same colors/styles you
  already have (no restyling, just restructuring navigation).
  - **Admin drawer:** Fixtures & Odds · Payment Approval Queue · Settlement · Users ·
    Financials · League Standings · Payment Accounts · Admin Logs
  - **User drawer:** Fixtures · My Tickets · League Standings · Account
- Drawer slides from the left, overlays content, closes on outside-tap — standard
  mobile pattern, keeps every existing screen's internal design untouched.

---

## Build order (recommended)

1. `profiles` table + signup trigger + RLS → get self-registration working end-to-end first.
2. Extend `tickets` with the new payment columns + RLS for customer-owned rows.
3. Customer-facing: expose existing Fixtures/Betslip flow to `customer` role, add the
   pending-payment confirmation screen and "My Tickets" view.
4. Admin: Payment Approval Queue tab (this is the one genuinely new screen).
5. Admin: Users tab + Admin Logs.
6. `payment_accounts` table + simple admin editor + display on the customer confirmation screen.
7. Hamburger nav shell on both sides, wrapping all of the above.

Happy to start on step 1 (the account system) in the actual codebase whenever you're
ready — just say go.
