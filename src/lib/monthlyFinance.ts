import { supabase, isSupabaseConfigured } from "./supabaseClient";

// Monthly revenue/expense tracking + partner dividend split + a running
// "corpus" (a shared reserve that absorbs a losing month instead of the
// partners paying in). Same singleton-row-of-jsonb persistence pattern as
// ledger.ts / marketingCalendar.ts.

export interface ExpenseLine {
  id: string;
  label: string;
  amount: number;
}

export interface MonthEntry {
  id: string; // "YYYY-MM"
  revenue: number;
  expenses: ExpenseLine[];
}

export interface FinanceState {
  months: MonthEntry[];
}

export type PartnerId = "shreyas" | "tushar" | "yashwanth";

export interface PartnerShare {
  id: PartnerId;
  name: string;
  pct: number; // fraction of a month's net profit, only paid when net > 0
}

// Confirmed split: Shreyas 50%, Tushar and Yashwanth 25% each.
export const PARTNER_SHARES: PartnerShare[] = [
  { id: "shreyas", name: "Shreyas", pct: 0.5 },
  { id: "tushar", name: "Tushar", pct: 0.25 },
  { id: "yashwanth", name: "Yashwanth", pct: 0.25 },
];

export const DEFAULT_EXPENSE_LABELS = ["Rent", "Salary", "WiFi", "Electricity"];

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newMonthEntry(monthId: string): MonthEntry {
  return {
    id: monthId,
    revenue: 0,
    expenses: DEFAULT_EXPENSE_LABELS.map((label) => ({ id: newId(), label, amount: 0 })),
  };
}

export function newExpenseLine(): ExpenseLine {
  return { id: newId(), label: "", amount: 0 };
}

export function monthTotalExpense(m: MonthEntry): number {
  return m.expenses.reduce((s, e) => s + e.amount, 0);
}

export function monthNet(m: MonthEntry): number {
  return m.revenue - monthTotalExpense(m);
}

// Only a strictly positive month pays out — a loss, or an exact
// break-even, pays every partner 0 for that month.
export function monthDividends(m: MonthEntry): Record<PartnerId, number> {
  const net = monthNet(m);
  const out = {} as Record<PartnerId, number>;
  for (const p of PARTNER_SHARES) out[p.id] = net > 0 ? net * p.pct : 0;
  return out;
}

export function monthLoss(m: MonthEntry): number {
  const net = monthNet(m);
  return net < 0 ? -net : 0;
}

export function monthLabel(id: string): string {
  const [y, mo] = id.split("-").map(Number);
  if (!y || !mo) return id;
  return new Date(y, mo - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function currentMonthId(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export interface CorpusPoint {
  monthId: string;
  corpusAfter: number;
}

// Running corpus balance, walked chronologically from a base figure — the
// actual remaining setup capital (Expenses page: total pool minus what's
// really been spent — see useCapitalStatus), never a manually-typed number.
// A losing month subtracts its loss from the corpus; a profitable month
// leaves the corpus untouched (the profit is paid out as dividends, not
// banked back into the corpus).
export function corpusTimeline(months: MonthEntry[], baseCorpus: number): { points: CorpusPoint[]; current: number } {
  const sorted = [...months].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  let running = baseCorpus;
  const points: CorpusPoint[] = [];
  for (const m of sorted) {
    running -= monthLoss(m);
    points.push({ monthId: m.id, corpusAfter: running });
  }
  return { points, current: running };
}

const STORAGE_KEY = "gorilla8-finance-v1";
const SUPABASE_ROW_ID = "singleton";

function normalizeExpense(raw: unknown): ExpenseLine {
  const e = (raw ?? {}) as Partial<ExpenseLine>;
  return { id: e.id ?? newId(), label: e.label ?? "", amount: Number(e.amount) || 0 };
}

function normalizeMonth(raw: unknown): MonthEntry | null {
  const m = (raw ?? {}) as Partial<MonthEntry>;
  if (typeof m.id !== "string") return null;
  return {
    id: m.id,
    revenue: Number(m.revenue) || 0,
    expenses: Array.isArray(m.expenses) ? m.expenses.map(normalizeExpense) : [],
  };
}

function normalize(raw: unknown): FinanceState {
  const s = (raw ?? {}) as { months?: unknown };
  const months = Array.isArray(s.months) ? s.months.map(normalizeMonth).filter((m): m is MonthEntry => m !== null) : [];
  return { months };
}

function loadLocalBackup(): FinanceState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function saveLocalBackup(state: FinanceState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable/full — Supabase (if configured) is still the source of truth
  }
}

export async function loadFinance(): Promise<FinanceState> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("monthly_finance")
        .select("data")
        .eq("id", SUPABASE_ROW_ID)
        .maybeSingle();
      if (!error && data?.data) {
        const state = normalize(data.data);
        saveLocalBackup(state);
        return state;
      }
    } catch {
      // fall through to local backup below
    }
  }
  return loadLocalBackup() ?? { months: [] };
}

// Returns whether the write actually reached Supabase (vs. only the local
// backup) — e.g. false when the monthly_finance table hasn't been created yet.
export async function saveFinance(state: FinanceState): Promise<boolean> {
  saveLocalBackup(state);
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from("monthly_finance")
        .upsert({ id: SUPABASE_ROW_ID, data: state, updated_at: new Date().toISOString() });
      return !error;
    } catch {
      return false;
    }
  }
  return false;
}
