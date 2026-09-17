import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { normalizeFurnitureItem, type FurnitureItem } from "../config/layout";

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
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown[];
    return parsed.map(normalizeFurnitureItem);
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
        const items = (data.data as unknown[]).map(normalizeFurnitureItem);
        saveLocalBackup(items);
        return items;
      }
    } catch {
      // fall through to local backup
    }
  }
  return loadLocalBackup();
}

export interface PublishResult {
  ok: boolean;
  error?: string; // human-readable reason, surfaced in the UI so a failure is diagnosable without opening devtools
}

export async function publishLayout(items: FurnitureItem[]): Promise<PublishResult> {
  saveLocalBackup(items);
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: "Supabase isn't configured (missing VITE_SUPABASE_URL/ANON_KEY)." };
  }
  try {
    const { error } = await supabase
      .from("furniture_layout")
      .upsert({ id: SUPABASE_ROW_ID, data: items, updated_at: new Date().toISOString() });
    if (error) {
      console.error("publishLayout failed:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("publishLayout threw:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
