# GORILLA 8 — Property & Business Planning Dashboard

A local React/TypeScript/MUI dashboard for planning a gaming + pool café called
**GORILLA 8**. Built for Shreyas to evaluate two candidate properties and now
also track setup expenses. This is a personal project — see **Git & hosting**
below, this is important.

## What this app is for

Shreyas is opening a gaming lounge (pool tables, PS5 stations, possibly carrom
and a racing simulator). Two properties were under consideration:

- **1,350 sq ft** — lower rent (₹40k/mo), ₹15L setup investment, ₹15L left in
  reserve. Fixed capacity: 3 pool tables + 5 PS5 stations, no carrom.
- **2,000 sq ft** — higher rent (₹70k/mo), ₹22L setup investment, only ₹8L left
  in reserve. Expandable capacity: 3–4 pool tables, 5–8 PS5 stations, 0–1 carrom
  board.

**Decision made:** Shreyas has settled on **1,350 sq ft** based on capital
efficiency and faster payback (see the Comparison page for the full math). The
app's Home page now treats 1,350 sq ft as "the plan," with the full two-property
comparison moved to a separate page for anyone who wants to see the reasoning.

**New idea (added mid-project):** 1,350 sq ft leaves ₹15L of capital idle. A
racing simulator rig (steering wheel + pedals) was proposed as a way to use
some of that: it earns ₹350/hour, vs. a plain PS5's ₹200/hour. This is modeled
as an optional, toggleable 4th revenue category, exclusive to 1,350 sq ft (the
2,000 sq ft option doesn't get this — it was specifically framed as "what to do
with 1,350's spare capital").

## Tech stack

React 19 + TypeScript + Vite + MUI v9 (Material UI) + MUI X Charts +
react-router-dom v7 + Supabase (`@supabase/supabase-js`) for the Expenses
page's data. No custom backend/API of our own — the app talks to Supabase's
auto-generated REST API directly from the browser.

## Architecture

Config-driven: all financial assumptions live in typed config files, never
scattered through components.

- `src/config/properties.ts` — the two `PropertyConfig` objects (rent,
  investment, capacity ranges for pool/PS5/carrom/racing sim) and shared rate
  constants (`RATE_PER_STATION_PER_HOUR` = ₹200, `RATE_PER_CARROM_PER_HOUR` =
  ₹100, `RATE_PER_RACING_SIM_PER_HOUR` = ₹350, `OPERATING_DAYS_PER_MONTH` = 30).
- `src/config/expenses.ts` — the setup-expense item checklist (name + category
  only, no prices — prices are entered live in the UI).
- `src/lib/calculations.ts` — `calcScenario()` is the one function that turns
  `{pool, ps5, carrom, racingSim, hoursPerDay}` into revenue/surplus/payback.
  Every component funnels through this — never duplicate the math inline.
- `src/lib/supabaseClient.ts` — creates the Supabase client from
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (both in `.env.local`,
  gitignored). `isSupabaseConfigured` is `false` if either is missing.
- `src/lib/expenses.ts` — load/save/compute helpers for the Expenses page.
  `loadExpenseState()`/`saveExpenseState()` are now **async**: they read/write
  a single row (`id = 'singleton'`, `data` = the whole state as JSONB) in the
  Supabase `expense_data` table when configured, and always mirror to a
  `localStorage` backup too — so a network hiccup or missing Supabase config
  never loses data, it just falls back silently.
- `src/lib/editAccess.ts` — the Expenses-page edit gate (see below).
- `src/pages/` — `HomePage.tsx` (`/`), `ComparisonPage.tsx` (`/comparison`),
  `ExpensesPage.tsx` (`/expenses`). `App.tsx` is just the router shell.
- `src/components/` — reusable pieces (`PropertyCard`, `MetricCard`,
  `ScenarioControls`, the various charts, `PageHeader` for the top nav).

### Supabase setup (already done, for reference)

- Project ref `ezmcgqgodupdeivknhqp`, URL `https://ezmcgqgodupdeivknhqp.supabase.co`.
- One table, created via the SQL editor:
  ```sql
  create table expense_data (
    id text primary key,
    data jsonb not null,
    updated_at timestamptz not null default now()
  );
  alter table expense_data disable row level security;
  ```
- RLS is **disabled on purpose** (Shreyas explicitly chose "fast & open" over
  adding auth/RLS, given the repo is public and this is just expense-planning
  data, not sensitive). The anon/publishable key is safe to have in the client
  bundle by Supabase's design — the thing actually gating writes is the
  passcode UI (see below), not RLS. Don't add RLS/auth back without being
  asked — it was a deliberate tradeoff, not an oversight.
- Credentials live in `.env.local` (gitignored) as `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY`. `.env.example` documents the variable names with
  placeholders for anyone re-cloning this.

### Edit gate (passcode, not real auth)

`src/lib/editAccess.ts` + the gate UI in `ExpensesPage.tsx`: the page loads
**read-only** by default (plain numbers, no inputs). An "Edit" button opens a
passcode dialog; correct passcode (`VITE_EDIT_PASSCODE` in `.env.local`,
default fallback `"gorilla8"` if unset) flips in-memory React state to
editable inputs, with a "Lock" button to re-engage read-only manually.
**Deliberately not persisted anywhere** (no sessionStorage/localStorage) —
Shreyas explicitly wants any refresh, tab close, or navigating away and back
to require the passcode again, every time. Don't add persistence back to
this without being asked. This is explicitly **not real security** — the passcode
ships inside the built client bundle, same caveat as the Supabase key. It
exists to stop casual/accidental edits by someone who opens the page without
knowing the code, not to protect against a determined attacker. Don't
"upgrade" this to real auth (Google login, etc.) unless asked — Shreyas
considered and explicitly declined that in favor of this simpler approach.

### Debounced auto-save (important UX requirement, don't regress)

Shreyas was explicit about this: **no "Save" button, no losing a batch of
edits.** Every keystroke updates React state immediately; a `setTimeout`-based
debounce (700ms, see `SAVE_DEBOUNCE_MS` in `ExpensesPage.tsx`) resets on every
change and only actually persists once typing pauses. A small "Saving…" /
"Saved" indicator near the Edit/Lock button reflects this. If you touch this
logic, preserve the property: data is never at risk of being lost because
someone forgot to click something.

### Mobile-responsive layout (also explicit requirement)

Shreyas edits this page from his phone. `ExpensesPage.tsx` renders two
layouts side by side in the DOM, toggled by CSS breakpoint (`sx={{ display:
{xs:'block', md:'none'} }}` and its inverse) — a stacked-card view per item on
mobile (`xs`/`sm`), the original wide table with horizontal scroll on desktop
(`md+`). Don't collapse this back to table-only.

### Pages

1. **Home (`/`)** — simplified, 1,350 sq ft only. Hours slider, racing-sim
   toggle (on by default), one full property card, one simple 2-line chart
   (revenue + profit vs. hours), a capital bar, and a CTA to the comparison
   page. This is the "anyone new should understand this" view.
2. **Comparison (`/comparison`)** — the full original dashboard: both
   properties side by side, all controls (pool/PS5/carrom for 2,000 sq ft,
   racing sim for 1,350 sq ft), revenue/surplus charts, crossover analysis,
   capital allocation, capacity comparison, free-play scenario simulator.
3. **Expenses (`/expenses`)** — setup-cost checklist, ~37 items across 8
   categories (Gaming Equipment, Furniture, Interior & Decor, Lighting,
   Electrical & Climate, Tech & Security, F&B Setup, Marketing & Digital).
   Per item, per property: quantity, **expected** price/unit (planning
   estimate), **final** price/unit (0 = not yet ordered; fill in once an order
   is actually placed). Grand totals sum Expected always, but Final only counts
   items where a final price has been entered — so "Final total" is literally
   "money committed so far." Persisted to Supabase (with a `localStorage`
   fallback/backup — see Architecture below). Read-only by default; editing
   requires a passcode (see "Edit gate" below).

## Data accuracy discipline

Never invent numbers. If a real figure isn't known (e.g. the 2,000 sq ft
advance, or the racing simulator's own hardware cost), show "TBD" / leave
blank rather than guessing. All revenue math is gaming-only — explicitly
excludes food, memberships, advertising beyond stated line items, and taxes.
"Operating surplus" ≠ net profit — always labeled as such.

## Known gotchas (hit and fixed during development)

- **MUI v9 breaking change**: `Stack`/`Grid` no longer accept `alignItems`/
  `justifyContent` as direct props — they must go inside `sx`. If you see a
  "component is missing" TS error on Stack/Grid, this is why.
- **Don't put `height: "100%"` on a component used both inside and outside a
  stretched flex/grid row** — caused a real bug once (a `MetricCard` used
  standalone inherited `height:'100%'` and blew up the parent card with a huge
  blank gap). `MetricCard` no longer sets a height itself.
- **Vite dependency cache**: if you `npm install` a new package while the dev
  server is already running, you'll likely get an "Invalid hook call" crash.
  Fix: stop the server, `rm -rf node_modules/.vite`, restart.
- **Editing `.env.local` also forces a full Vite server restart** (it watches
  env files), which can trigger the same transient "Invalid hook call" for an
  already-open browser tab. After any `.env.local` change, proactively do the
  same fix above (kill server, clear `node_modules/.vite`, restart) rather
  than waiting to see if the user hits a broken page.
- **npm cache on this machine**: the default `~/.npm` cache has root-owned
  files from a prior issue. `npm install` needs
  `npm_config_cache=/Users/shrego/.npm-cache-fix npm install ...` to work
  (already set up; just reuse that pattern for new installs).

## Dev workflow

```
cd ~/gorilla8-dashboard
npm run dev        # http://localhost:5173, hot reload
npm run build       # tsc -b && vite build — always run before calling something done
```

The dev server is typically left running in the background across sessions
(`nohup ... > /tmp/gorilla8-dev.log`). Check `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173` and `tail /tmp/gorilla8-dev.log` before assuming it needs restarting.

Per explicit user preference: **don't loop on opening Chrome/browser tools to
visually verify every change** — it's slow. Prefer `npm run build` (catches
type errors) and reading dev server logs (catches runtime crashes). Only open
the browser if there's a specific visual thing that can't be verified any
other way, or the user asks for it.

## Git & hosting — read before running any git command here

This repo is pushed to Shreyas's **personal** GitHub
(`github.com/Shreyas6543/Gorilla8-planning`), deliberately isolated from his
work laptop's default company GitHub account (`shrego-up`). Do not disturb
that isolation:

- Global git config and `gh` CLI on this machine are the **company** identity
  (`shrego-up` / shreyas@upliance.ai) — left untouched, used everywhere else.
- **This repo only** has a local (not global) git identity: `user.name =
  Shreyas`, `user.email = shreyasm6543@gmail.com`.
- Push/pull uses a dedicated SSH alias, not the default GitHub host:
  `git remote -v` should show `git@github-personal:Shreyas6543/Gorilla8-planning.git`.
  That alias is defined in `~/.ssh/config` (`Host github-personal`) and points
  at `~/.ssh/id_ed25519_personal`, a key that exists only on Shreyas's personal
  GitHub account — never his company one.
- Before any push, sanity-check with `git remote -v` and
  `git config --local --list | grep user` — both should show the personal
  values above, never the company ones. If they don't, stop and ask.
- Never run `gh auth switch`, `gh auth login` for a new account, or touch
  global git config from within this project — that's exactly the cross-
  contamination this setup was built to avoid.

## Open items / things to follow up on with Shreyas

- Expenses page data is currently blank — Shreyas fills it in via the table UI
  as he gets quotes / places orders, not via chat. Now backed by Supabase
  (cross-device, not tied to one browser), with a `localStorage` fallback if
  Supabase is unreachable — see Architecture above.
- Racing simulator has no equipment/hardware cost modeled yet — only its
  hourly revenue rate (₹350/hr) is in the app. If Shreyas gets a quote for the
  rig itself, that's a capital cost that should probably show up either here
  or on the Expenses page.
- Two suggested expense categories were confirmed and added: Branding &
  Signage (signboard), Safety & Compliance (fire extinguisher). Two others
  were suggested but declined: POS/billing system, civil work (flooring/false
  ceiling/painting). Don't re-add those without being asked again.

## Communication notes

Shreyas communicates by voice/dictation — expect transcription quirks
("cave" → "capacity", "erasing control" → "racing control", "hear" → "hour",
"cloud.md" → "CLAUDE.md", "word repo" → "work repo"). When something is
ambiguous, it's usually worth a quick clarifying question rather than guessing,
especially for financial figures.
