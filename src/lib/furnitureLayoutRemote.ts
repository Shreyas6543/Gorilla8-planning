import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type { FurnitureItem } from "../config/layout";

// The admin-published furniture layout — becomes the baseline everyone sees
// on the Floor Plan page (and the Walkthrough's starting point), until the
// next publish. Mirrors expenses.ts's Supabase pattern exactly: same
// singleton-row table shape, same local-backup fallback so a network hiccup
// never looks like lost/reset data.
//
// Requires a table (not created by this app — run once in the Supabase SQL
// editor, same as expense_data):
//   create table furniture_layout (
//     id text primary key,
//     data jsonb not null,
//     updated_at timestamptz not null default now()
//   );
//   alter table furniture_layout disable row level security;

const LOCAL_BACKUP_KEY = "gorilla8-furniture-published-backup-v1";
const SUPABASE_ROW_ID = "default";

function loadLocalBackup(): FurnitureItem[] | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_BACKUP_KEY);
    return raw ? (JSON.parse(raw) as FurnitureItem[]) : null;
  } catch {
    return null;
  }
}

function saveLocalBackup(items: FurnitureItem[]): void {
  try {
    window.localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(items));
  } catch {
    // best-effort only
  }
}

// Returns null if nothing has ever been published (Supabase not configured,
// empty table, or a failed request with no local backup) — callers fall
// back to the hardcoded config defaults in that case.
export async function loadPublishedLayout(): Promise<FurnitureItem[] | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("furniture_layout").select("data").eq("id", SUPABASE_ROW_ID).maybeSingle();
      if (!error && data?.data) {
        const items = data.data as FurnitureItem[];
        saveLocalBackup(items);
        return items;
      }
    } catch {
      // fall through to local backup
    }
  }
  return loadLocalBackup();
}

export async function publishLayout(items: FurnitureItem[]): Promise<boolean> {
  saveLocalBackup(items);
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from("furniture_layout")
        .upsert({ id: SUPABASE_ROW_ID, data: items, updated_at: new Date().toISOString() });
      return !error;
    } catch {
      return false;
    }
  }
  return false; // local-only backup saved, but nothing actually shared with other visitors
}
