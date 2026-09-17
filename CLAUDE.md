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

React 19.2.x (pinned — see "3D Walkthrough" gotcha below, do not bump to
19.3+) + TypeScript + Vite + MUI v9 (Material UI) + MUI X Charts +
react-router-dom v7 + Three.js via `@react-three/fiber` + `@react-three/drei`
(the 3D walkthrough) + Supabase (`@supabase/supabase-js`) for the Expenses
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
- Two tables, both created via the SQL editor (same shape, same pattern):
  ```sql
  create table expense_data (
    id text primary key,
    data jsonb not null,
    updated_at timestamptz not null default now()
  );
  alter table expense_data disable row level security;

  create table furniture_layout (
    id text primary key,
    data jsonb not null,
    updated_at timestamptz not null default now()
  );
  alter table furniture_layout disable row level security;
  ```
  `furniture_layout` was added for the admin-publishable Design-page layout
  (see "Site-wide admin mode" and "Furniture layout architecture" below) —
  **Shreyas needs to run that second `create table`/`alter table` block
  himself in the Supabase SQL editor** if it isn't already there; this repo
  has no service-role key or migration tooling, only the anon key, so Claude
  cannot create tables directly.
- RLS is **disabled on purpose** (Shreyas explicitly chose "fast & open" over
  adding auth/RLS, given the repo is public and this is just expense-planning
  data, not sensitive). The anon/publishable key is safe to have in the client
  bundle by Supabase's design — the thing actually gating writes is the
  passcode UI (see below), not RLS. Don't add RLS/auth back without being
  asked — it was a deliberate tradeoff, not an oversight.
- Credentials live in `.env.local` (gitignored) as `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY`. `.env.example` documents the variable names with
  placeholders for anyone re-cloning this.

### Site-wide admin mode (passcode, not real auth)

`src/lib/editAccess.ts` (unchanged) + `src/state/adminAuth.tsx` (new,
site-wide) + the tap gesture in `PageHeader.tsx`. Originally this was
Expenses-only (an "Edit" button opening a passcode dialog on that one page);
Shreyas asked for it to become one global admin mode covering both Expenses
editing and Design-page publishing, unlocked from anywhere:

- Tap the round gaming-icon logo in the header **5 times within 3 seconds**
  (`TAP_COUNT_REQUIRED`/`TAP_WINDOW_MS` in `PageHeader.tsx`) to open the
  passcode dialog. Correct passcode (`VITE_EDIT_PASSCODE` in `.env.local`,
  default fallback `"gorilla8"`) sets `isAdmin = true` in `AdminProvider`
  (wraps the whole app in `App.tsx`).
- While admin: Expenses has **no Edit button at all** — the table is just
  directly editable, no re-prompting. Design page shows its admin-only
  "Import code" + "Save as default for everyone" controls (see below).
  A small "Admin — tap to exit" chip appears in the header; tapping it logs
  out (`lock()`).
- While NOT admin: Expenses' Edit button is **gone entirely** (not shown,
  not just disabled) — there is no path to unlock from the Expenses page
  itself anymore, only via the header's 5-tap gesture.
- **Deliberately not persisted anywhere** (no sessionStorage/localStorage) —
  same rule as before: any refresh, tab close, or navigating away and back
  requires the passcode again, every time. Don't add persistence without
  being asked.
- Still explicitly **not real security** — same caveat as always, the
  passcode ships in the client bundle. Don't "upgrade" to real auth unless
  asked.

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

### 3D Walkthrough (`/walkthrough`)

First-person walk-through of the floor plan, built with Three.js. Key files:
`src/lib/room3d.ts` (wall-building from `WALL_SEGMENTS`, room-boundary
collision test, eye height/walk speed constants), `src/components/
walkthrough/FirstPersonController.tsx` (WASD movement via a keyboard-state
ref + `useFrame`, computing forward/right vectors from the camera's current
look direction — movement stays on the horizontal plane regardless of look
pitch), `src/components/walkthrough/WalkthroughScene.tsx` (the actual scene:
floor as a `THREE.Shape` extruded from `OUTER_POLYGON`, walls as boxes per
`WALL_SEGMENTS` — all axis-aligned in this floor plan so no rotation math
was needed, glass wall gets a transparent/transmissive material, the
entrance segment is skipped entirely so it's a real walkable gap, beams as
thin columns, furniture reads straight from `config/layout.ts`). Mouse-look
via `@react-three/drei`'s `PointerLockControls`; only the outer room
boundary has collision (no furniture collision yet — known simplification).

**Critical version pin — do not "helpfully" upgrade React on this project**:
`@react-three/fiber` (even its latest 10.0.0 canary builds, checked
2026-09-17) hard-caps its peer range at `react "<19.3"`. This project had
been scaffolded with React 19.3.0, which is silently, completely
incompatible with fiber's custom reconciler — not a cosmetic peer-warning
mismatch. Symptom was brutal to diagnose: no console errors, WebGL context
healthy, canvas sized correctly, but the entire scene rendered pure black
forever (confirmed via reading back canvas pixel alpha = 0, i.e. nothing
was ever actually drawn). Fixed by pinning `react`, `react-dom`,
`@types/react`, `@types/react-dom` to `19.2.x` (used 19.2.8 / 19.2.7 — exact
patch version doesn't matter, just needs to be `<19.3`). If a future
`npm install` or "update dependencies" pass bumps React back to 19.3+, the
3D walkthrough will silently break again with zero errors — check this
pin first if `/walkthrough` ever goes black again. Installed with
`--legacy-peer-deps` throughout since `@expo/*` peer deps (irrelevant to
this web-only project, fiber supports React Native too) also complain.

### Furniture layout architecture (`/design`, Floor Plan, Walkthrough)

`src/state/furnitureLayout.tsx` (`FurnitureLayoutProvider`, wraps the app in
`App.tsx`) is the single source of truth for furniture positions, shared by
three pages. Two layers, deliberately kept separate:

- **`baseItems`** — the "real" published layout. Loaded once from the
  `furniture_layout` Supabase table on app mount (`src/lib/
  furnitureLayoutRemote.ts`, same load/save/local-backup pattern as
  `expenses.ts`), falling back to the hardcoded `config/layout.ts` constants
  if nothing's ever been published. **The Floor Plan page renders only
  this** (`FloorPlanPage.tsx` passes `baseItems` into `<FloorPlanSvg
  items={baseItems} />`) — so a visitor idly dragging things around on
  `/design` never affects what anyone else sees on Floor Plan.
- **`items`** — `baseItems` with this browser's local overrides layered on
  top (position/size/rotation only, `localStorage`, key
  `gorilla8-furniture-layout-v2`). This is what `/design` and `/walkthrough`
  both render — a personal what-if sandbox. Resetting an item/resetting all
  reverts to `baseItems`, not the original hardcoded config.

**Admin publish flow**: on `/design`, an admin sees a "Save as default for
everyone" button (behind a confirm dialog, since it's shared/public state).
It takes the current *resolved* `items` (base + local overrides merged),
writes it to `furniture_layout` via `publishLayout()`, then promotes it to
be the new `baseItems` and clears local overrides (they're baked in now).
From that point on, every visitor's Floor Plan page — and every visitor's
`/walkthrough` and fresh `/design` sandbox — starts from this new baseline.

**Sharing without admin**: any visitor (admin or not) can hit "Copy layout
code" on `/design`, which base64-encodes their current per-item
`{id,x,y,width,height,rotated}` array (`exportCode()`) to the clipboard —
meant to be pasted into a chat/WhatsApp message to Shreyas. An admin can
paste a received code into the "Import code" field (`importCode()`) to load
someone else's arrangement into their own sandbox for review, then decide
whether to publish it.

**Undo**: `beginGesture()` snapshots the current override state onto an
in-memory history stack (`HISTORY_LIMIT = 50`); it's called once at the
*start* of a drag/resize (`DesignCanvas.tsx`'s pointerdown handlers) or on
focusing a precise-position text field — not on every intermediate
pointermove/keystroke, so one Ctrl+Z (Cmd+Z on Mac) undoes a whole gesture,
not one pixel-notch of it. `toggleRotation`/`resetOne`/`resetAll`/
`importCode` each push their own snapshot before mutating. History is
in-memory only (lost on refresh, same as everything else here).

**Rotation model** (also relevant to `WalkthroughScene.tsx`): an item's
`width`/`height` fields are always the *intrinsic*, unrotated dimensions —
`footprint(item)` (in `config/layout.ts`) returns the actual on-floor
`{w, h}`, swapping them when `rotated` is true. The 3D scene's
`RotatedFootprint` wrapper renders each item centered at local `(0,0)` with
its intrinsic dimensions, then an outer `<group>` positions it at the true
footprint center and applies the 90° turn — so rotating in the 3D view spins
the whole assembly in place around its own center, not around some
arbitrary corner. Don't reintroduce a version that swaps width/height
directly on the item passed into a 3D component; that breaks this.

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
   only an admin can edit, no per-page passcode anymore (see "Site-wide
   admin mode").
4. **Floor Plan (`/floorplan`)** — the candidate space's actual floor plan,
   reconstructed to scale from a hand-measured notebook sketch (numbers live
   in `src/config/floorplan.ts` — outer wall polygon, wall segment lengths/
   labels, the glass wall, the entrance shutter opening, two structural
   beams). Renders as an SVG (`FloorPlanSvg.tsx`) plus the **published**
   furniture layout (`baseItems` from `FurnitureLayoutProvider` — see
   "Furniture layout architecture" below; falls back to `src/config/
   layout.ts`'s hardcoded defaults if nothing's been published yet: 3 pool
   tables grouped to share clearance, 5 PS5s each backed onto a real wall
   for its TV, 1 racing sim, 1 counter + 1 cabinet on the glass wall beside
   the entrance with a clear sightline). Every original placement was
   verified programmatically (no overlaps, nothing outside the walls, no
   beam collisions, every PS5 touches a real wall) — see git history for the
   verification scripts if redoing this. A "Customize and see" button links
   to `/design`.
5. **Design (`/design`)** — drag/resize/rotate any furniture item on a 2D
   plan, with live gap-to-wall/gap-to-item measurements while dragging,
   overlap/out-of-bounds warnings, Ctrl+Z undo, and a "See it in 3D" link to
   Walkthrough. A personal `localStorage` sandbox for everyone; admin-only
   controls to publish it as the new default or import a code someone else
   shared. See "Furniture layout architecture" below.
6. **Walkthrough (`/walkthrough`)** — full-screen first-person 3D view of
   the current furniture layout (published default + this browser's local
   Design-page tweaks, if any), built with Three.js via `@react-three/fiber`
   + `@react-three/drei`. See "3D Walkthrough" and "Furniture layout
   architecture" below.

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
