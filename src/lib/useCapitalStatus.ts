import { useEffect, useState } from "react";
import { PROPERTIES, totalCapitalPool } from "../config/properties";
import { loadExpenseState, getRow, rowFinalTotal } from "./expenses";
import { loadExpenseCatalog } from "./expenseCatalog";

// "Invested" here means actual money committed — the sum of Final (ordered)
// line-item totals on the Expenses page, not the planning-stage Expected
// total. Total capital is the fixed ₹20L pool from config; remaining is
// whatever's left of it. Both Home and Expenses pages read this so neither
// one shows a stale hardcoded figure while the other tracks real spend.
export interface CapitalStatus {
  loaded: boolean;
  totalCapital: number;
  invested: number;
  remaining: number;
}

export function useCapitalStatus(): CapitalStatus {
  const [invested, setInvested] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadExpenseState(), loadExpenseCatalog()]).then(([state, catalog]) => {
      if (cancelled) return;
      const total = catalog.items.reduce((sum, item) => sum + rowFinalTotal(getRow(state, item.id), "small"), 0);
      setInvested(total);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalCapital = totalCapitalPool(PROPERTIES.small);
  return { loaded, totalCapital, invested, remaining: totalCapital - invested };
}
