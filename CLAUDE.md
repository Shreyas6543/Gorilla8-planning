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
react-router-dom v7. No backend — everything is client-side; the Expenses page
persists to `localStorage`.

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
- `src/lib/expenses.ts` — load/save/compute helpers for the Expenses page's
  localStorage-backed state.
- `src/pages/` — `HomePage.tsx` (`/`), `ComparisonPage.tsx` (`/comparison`),
  `ExpensesPage.tsx` (`/expenses`). `App.tsx` is just the router shell.
- `src/components/` — reusable pieces (`PropertyCard`, `MetricCard`,
  `ScenarioControls`, the various charts, `PageHeader` for the top nav).

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
   "money committed so far." Persisted to `localStorage` (no backend yet).

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
  as he gets quotes / places orders, not via chat. **Storage caveat: it's
  `localStorage` only** — no backend/database, no API. Data lives in one
  browser on one machine, isn't backed up, isn't part of the git repo. Shreyas
  was told this explicitly; if he wants it backed up or accessible cross-
  device, options discussed were (a) an export/import JSON button (cheap), or
  (b) a real lightweight database. Neither built yet — ask before adding.
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
