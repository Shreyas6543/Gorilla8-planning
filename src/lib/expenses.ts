import { supabase, isSupabaseConfigured } from "./supabaseClient";

export interface ExpenseRow {
  qtySmall: number;
  qtyLarge: number;
  expSmall: number; // expected price per unit
  expLarge: number;
  finSmall: number; // final/ordered price per unit (0 = not yet ordered)
  finLarge: number;
}

// Keyed by expense_items id — that item list is now dynamic (admin-managed
// via expenseCatalog.ts), so this file doesn't need to know it; it just
// stores/normalizes whatever rows exist. Callers default a missing row to
// emptyRow() when reading (getRow), so a newly-added item just works.
export type ExpenseState = Record<string, ExpenseRow>;
export type PropertyKey = "small" | "large";

const STORAGE_KEY = "gorilla8-expenses-v1";
const SUPABASE_ROW_ID = "singleton";

export function emptyRow(): ExpenseRow {
  return { qtySmall: 0, qtyLarge: 0, expSmall: 0, expLarge: 0, finSmall: 0, finLarge: 0 };
}

export function getRow(state: ExpenseState, id: string): ExpenseRow {
  return state[id] ?? emptyRow();
}

export function createEmptyState(): ExpenseState {
  return {};
}

function normalize(raw: Partial<ExpenseState> | null | undefined): ExpenseState {
  if (!raw) return {};
  const state: ExpenseState = {};
  for (const [id, row] of Object.entries(raw)) {
    if (row) state[id] = { ...emptyRow(), ...row };
  }
  return state;
}

function loadLocalBackup(): ExpenseState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function saveLocalBackup(state: ExpenseState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable/full — Supabase (if configured) is still the source of truth
  }
}

// Loads from Supabase when configured, falling back to a local backup copy
// (and finally to blank defaults) if Supabase isn't set up or the request
// fails — so a network hiccup never looks like lost data.
export async function loadExpenseState(): Promise<ExpenseState> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("expense_data")
        .select("data")
        .eq("id", SUPABASE_ROW_ID)
        .maybeSingle();
      if (!error && data?.data) {
        const state = normalize(data.data as Partial<ExpenseState>);
        saveLocalBackup(state); // keep the local backup in sync with the source of truth
        return state;
      }
    } catch {
      // fall through to local backup below
    }
  }
  return loadLocalBackup() ?? createEmptyState();
}

// Always mirrors to the local backup; writes to Supabase too when configured.
export async function saveExpenseState(state: ExpenseState): Promise<void> {
  saveLocalBackup(state);
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from("expense_data")
        .upsert({ id: SUPABASE_ROW_ID, data: state, updated_at: new Date().toISOString() });
    } catch {
      // Supabase write failed (offline, etc.) — local backup above still has it,
      // and the next successful save will catch Supabase back up.
    }
  }
}

export function rowQty(row: ExpenseRow, property: PropertyKey): number {
  return property === "small" ? row.qtySmall : row.qtyLarge;
}

export function rowExpected(row: ExpenseRow, property: PropertyKey): number {
  return property === "small" ? row.expSmall : row.expLarge;
}

export function rowFinal(row: ExpenseRow, property: PropertyKey): number {
  return property === "small" ? row.finSmall : row.finLarge;
}

export function rowExpectedTotal(row: ExpenseRow, property: PropertyKey): number {
  return rowQty(row, property) * rowExpected(row, property);
}

export function rowFinalTotal(row: ExpenseRow, property: PropertyKey): number {
  const price = rowFinal(row, property);
  return price > 0 ? rowQty(row, property) * price : 0;
}

export function rowIsOrdered(row: ExpenseRow, property: PropertyKey): boolean {
  return rowFinal(row, property) > 0;
}
