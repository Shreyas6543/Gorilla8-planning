import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { checkViewPasscode } from "../lib/editAccess";

// Lower-stakes sibling of adminAuth.tsx's isAdmin: gates VIEWING every
// internal page (via components/Gate.tsx) rather than editing anything.
// Unlike isAdmin (deliberately session-only, see adminAuth.tsx), this DOES
// persist to localStorage — it's meant for a partner's everyday device, not
// a one-off safety gate against accidental edits, so re-entering the code
// on every refresh would just be friction with no real security benefit
// (the code ships in the client bundle either way — see editAccess.ts).

const STORAGE_KEY = "gorilla8-viewer-v1";

interface ViewerContextValue {
  isViewer: boolean;
  unlockViewer: (passcode: string) => boolean;
}

const ViewerContext = createContext<ViewerContextValue | null>(null);

function loadStoredViewer(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [isViewer, setIsViewer] = useState(loadStoredViewer);

  const unlockViewer = useCallback((passcode: string) => {
    const ok = checkViewPasscode(passcode);
    if (ok) {
      setIsViewer(true);
      try {
        window.localStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // localStorage unavailable (private browsing, etc.) — the unlock
        // still works for the rest of this tab's session via state above
      }
    }
    return ok;
  }, []);

  const value = useMemo(() => ({ isViewer, unlockViewer }), [isViewer, unlockViewer]);

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer() {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error("useViewer must be used inside ViewerProvider");
  return ctx;
}
