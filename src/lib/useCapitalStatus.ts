import { useEffect, useState } from "react";
import { PROPERTIES, totalCapitalPool } from "../config/properties";
import { loadLedger } from "./ledger";

// "Invested" = total spent so far, per the Ledger — Shreyas's actual
// day-to-day record of money spent (the initial, pre-launch expenses).
// Once the venue launches, ongoing costs are tracked as monthly entries on
// the Finance page instead, so the Ledger total stops growing and this
// figure settles — it does not double-count Finance's monthly expenses.
// Total capital is the fixed ₹20L pool from config; remaining capital is
// whatever's left of it (total pool minus the Ledger total), and is also
// the corpus's base figure on the Finance page. Home and Finance both read
// this hook so there's one definition of "remaining capital," not two.
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
    loadLedger().then((entries) => {
      if (cancelled) return;
      const total = entries.reduce((sum, e) => sum + e.amount, 0);
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
