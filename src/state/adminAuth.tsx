import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { checkPasscode } from "../lib/editAccess";

// Site-wide admin mode — same passcode/security model as the old Expenses-only
// gate (see editAccess.ts: not real security, just stops casual edits).
// Unlocked once via the 5-tap gesture on the header icon, then every gated
// feature (Expenses editing, Design page publishing) just checks isAdmin —
// no re-prompting per page. Deliberately in-memory only, same rule as
// before: a refresh, tab close, or navigating away and back always requires
// the passcode again.

interface AdminContextValue {
  isAdmin: boolean;
  unlock: (passcode: string) => boolean;
  lock: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  const unlock = useCallback((passcode: string) => {
    const ok = checkPasscode(passcode);
    if (ok) setIsAdmin(true);
    return ok;
  }, []);

  const lock = useCallback(() => setIsAdmin(false), []);

  const value = useMemo(() => ({ isAdmin, unlock, lock }), [isAdmin, unlock, lock]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminProvider");
  return ctx;
}
