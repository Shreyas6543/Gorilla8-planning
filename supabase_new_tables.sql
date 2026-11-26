-- Run this once in the Supabase SQL editor (same place as before).
-- Three new tables: a furniture "catalog" (object types, admin-manageable),
-- and expense categories/items (also admin-manageable). furniture_layout
-- and expense_data (already created) need no changes — they keep storing
-- data keyed by whatever ids these new tables define.

create table furniture_catalog (
  id text primary key,
  name text not null,
  builtin boolean not null default false,
  render_type text not null, -- 'pool' | 'ps5' | 'racingSim' | 'counter' | 'cabinet' | 'sofaUnit' | 'plantPot' | 'generic'
  default_width numeric not null,
  default_depth numeric not null,
  default_elevation numeric not null,
  color text,
  created_at timestamptz not null default now()
);
alter table furniture_catalog disable row level security;

create table expense_categories (
  id text primary key,
  name text not null,
  sort_order integer not null default 0
);
alter table expense_categories disable row level security;

create table expense_items (
  id text primary key,
  category_id text not null references expense_categories(id),
  name text not null,
  sort_order integer not null default 0
);
alter table expense_items disable row level security;

create table marketing_posts (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table marketing_posts disable row level security;

-- Ledger of actual spend (Ledger page). Same singleton-row jsonb pattern as
-- expense_data / marketing_posts: data = { entries: [...] }.
create table ledger_entries (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table ledger_entries disable row level security;

-- Monthly revenue/expense + partner dividend tracking (Finance page). Same
-- singleton-row jsonb pattern: data = { startingCorpus, months }.
create table monthly_finance (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table monthly_finance disable row level security;

-- QR banner scan log (QR Scans page). One row per scan — append-only event
-- log, NOT a singleton jsonb blob like the tables above. Written by the
-- api/qr/[banner].ts serverless redirect function (anon key, server-side),
-- read by src/lib/qrScans.ts for the dashboard page.
create table qr_scans (
  id bigint generated always as identity primary key,
  banner_id text not null, -- e.g. 'shop', 'others' — whatever slug the physical banner's QR encodes
  scanned_at timestamptz not null default now(),
  city text,
  region text,
  country text,
  user_agent text,
  referrer text
);
alter table qr_scans disable row level security;
create index qr_scans_banner_id_idx on qr_scans (banner_id);
create index qr_scans_scanned_at_idx on qr_scans (scanned_at);

-- Funnel beyond the raw scan above: explicit actions taken on the
-- /coming-soon landing page the QR now redirects to (ComingSoonPage.tsx).
-- 'directions' = tapped "Get Directions". More action types (e.g.
-- 'instagram') can be added later without a schema change.
create table qr_actions (
  id bigint generated always as identity primary key,
  banner_id text not null,
  action text not null,
  created_at timestamptz not null default now()
);
alter table qr_actions disable row level security;
create index qr_actions_banner_id_idx on qr_actions (banner_id);

-- "Claim your ₹100 welcome credit" signups from the coming-soon landing
-- page (ComingSoonPage.tsx) — one row = one person's wallet. `phone` is
-- the normalized 10-digit Indian mobile number (no +91/0 prefix — see
-- normalizePhone() in qrFunnel.ts), unique so nobody can claim twice.
-- `wallet_token` is the unguessable id in the /wallet/<token> link sent to
-- them over WhatsApp; `credit_balance` starts at 100 and is decremented at
-- the counter via RedeemPage.tsx (admin-only). Phone numbers are PII — the
-- dashboard only lists the actual rows to an admin (see QrScansPage.tsx),
-- even though, same as every other table here, there's no RLS on the
-- table itself.
create table leads (
  id bigint generated always as identity primary key,
  phone text not null unique,
  banner_id text,
  wallet_token text not null unique,
  credit_balance numeric not null default 100,
  created_at timestamptz not null default now()
);
alter table leads disable row level security;
create index leads_wallet_token_idx on leads (wallet_token);

-- Redemption history — one row per counter redemption, so a credit_balance
-- of e.g. 40 (after a ₹60 redemption against a ₹100 starting credit) has an
-- audit trail behind it, not just a silently-decremented number. Written by
-- RedeemPage.tsx (admin-only — Shreyas redeems these personally at the
-- counter for now, per his call).
create table wallet_redemptions (
  id bigint generated always as identity primary key,
  phone text not null,
  amount numeric not null,
  redeemed_at timestamptz not null default now()
);
alter table wallet_redemptions disable row level security;
create index wallet_redemptions_phone_idx on wallet_redemptions (phone);
