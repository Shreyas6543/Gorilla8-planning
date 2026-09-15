import { EXPENSE_ITEMS } from "../config/expenses";

export interface ExpenseRow {
  qtySmall: number;
  qtyLarge: number;
  expSmall: number; // expected price per unit
  expLarge: number;
  finSmall: number; // final/ordered price per unit (0 = not yet ordered)
  finLarge: number;
}

export type ExpenseState = Record<string, ExpenseRow>;

const STORAGE_KEY = "gorilla8-expenses-v1";

function emptyRow(): ExpenseRow {
  return { qtySmall: 0, qtyLarge: 0, expSmall: 0, expLarge: 0, finSmall: 0, finLarge: 0 };
}

export function loadExpenseState(): ExpenseState {
  const state: ExpenseState = {};
  for (const item of EXPENSE_ITEMS) state[item.id] = emptyRow();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ExpenseState;
      for (const item of EXPENSE_ITEMS) {
        if (parsed[item.id]) state[item.id] = { ...emptyRow(), ...parsed[item.id] };
      }
    }
  } catch {
    // corrupt or inaccessible storage — fall back to blank state
  }
  return state;
}

export function saveExpenseState(state: ExpenseState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable/full — edits still work for this session
  }
}

export type PropertyKey = "small" | "large";

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
