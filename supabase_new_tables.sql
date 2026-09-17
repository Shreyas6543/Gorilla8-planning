-- Run this once in the Supabase SQL editor (same place as before).
-- Three new tables: a furniture "catalog" (object types, admin-manageable),
-- and expense categories/items (also admin-manageable). furniture_layout
-- and expense_data (already created) need no changes — they keep storing
-- data keyed by whatever ids these new tables define.

create table furniture_catalog (
  id text primary key,
  name text not null,
  builtin boolean not null default false,
  render_type text not null, -- 'pool' | 'ps5' | 'racingSim' | 'counter' | 'cabinet' | 'generic'
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
