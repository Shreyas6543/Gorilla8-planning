import { supabase, isSupabaseConfigured } from "./supabaseClient";

// Running ledger of money actually spent — a dated log, as opposed to the
// Expenses page's planning checklist (expected vs. final price per item).
// Same persistence pattern as marketingCalendar.ts: one singleton row of
// jsonb in Supabase (table ledger_entries) plus a localStorage backup, so a
// missing table or a network hiccup never loses entries.

export const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank transfer", "Other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface LedgerEntry {
  id: string;
  date: string; // ISO yyyy-mm-dd
  description: string;
  category: string; // category name (not id), so entries stay readable if the catalog changes
  amount: number; // ₹
  vendor: string;
  method: PaymentMethod;
  notes: string;
}

const STORAGE_KEY = "gorilla8-ledger-v1";
const SUPABASE_ROW_ID = "singleton";

export function newEntryId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalize(raw: unknown): LedgerEntry[] {
  const list = (raw as { entries?: unknown } | null)?.entries;
  if (!Array.isArray(list)) return [];
  return list
    .filter((e): e is Partial<LedgerEntry> => !!e && typeof e === "object")
    .map((e) => ({
      id: e.id ?? newEntryId(),
      date: e.date ?? "",
      description: e.description ?? "",
      category: e.category ?? "Other",
      amount: Number(e.amount) || 0,
      vendor: e.vendor ?? "",
      method: PAYMENT_METHODS.includes(e.method as PaymentMethod) ? (e.method as PaymentMethod) : "Other",
      notes: e.notes ?? "",
    }));
}

function loadLocalBackup(): LedgerEntry[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function saveLocalBackup(entries: LedgerEntry[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries }));
  } catch {
    // storage unavailable/full — Supabase (if configured) is still the source of truth
  }
}

export async function loadLedger(): Promise<LedgerEntry[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("ledger_entries")
        .select("data")
        .eq("id", SUPABASE_ROW_ID)
        .maybeSingle();
      if (!error && data?.data) {
        const entries = normalize(data.data);
        saveLocalBackup(entries);
        return entries;
      }
    } catch {
      // fall through to local backup below
    }
  }
  return loadLocalBackup() ?? [];
}

// Returns whether the write actually reached Supabase (vs. only the local
// backup) — e.g. false when the ledger_entries table hasn't been created yet.
export async function saveLedger(entries: LedgerEntry[]): Promise<boolean> {
  saveLocalBackup(entries);
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from("ledger_entries")
        .upsert({ id: SUPABASE_ROW_ID, data: { entries }, updated_at: new Date().toISOString() });
      return !error;
    } catch {
      return false;
    }
  }
  return false;
}
