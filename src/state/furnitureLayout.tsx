import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { POOL_TABLES, PS5_STATIONS, RACING_SIM, COUNTER, CABINET, footprint, type FurnitureItem } from "../config/layout";
import { loadPublishedLayout, publishLayout } from "../lib/furnitureLayoutRemote";

// Editable furniture layout, shared between the drag-to-design page, the
// Floor Plan page, and the 3D walkthrough.
//
// Two layers:
// - `baseItems`: the "real" layout — the admin-published default from
//   Supabase (falling back to the hardcoded config if nothing's ever been
//   published). This is what the Floor Plan page shows to everyone.
// - `items`: baseItems with this browser's local overrides applied on top
//   — a personal what-if sandbox (localStorage only), used by the Design
//   page and the Walkthrough. Publishing (admin-only) promotes the current
//   `items` to be the new `baseItems` for everyone, then clears local
//   overrides (they're baked in now).

const OVERRIDES_STORAGE_KEY = "gorilla8-furniture-layout-v2"; // v2: overrides carry width/height (resize)
const HISTORY_LIMIT = 50;

const FACTORY_DEFAULT_ITEMS: FurnitureItem[] = [...POOL_TABLES, ...PS5_STATIONS, RACING_SIM, COUNTER, CABINET];

// A full override always carries every mutable field, so any one edit
// (move/resize/rotate) never has to guess what the others were.
interface Override {
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
}

type Overrides = Record<string, Override>;

function loadLocalOverrides(): Overrides {
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

interface FurnitureLayoutContextValue {
  items: FurnitureItem[]; // baseItems + local overrides (sandbox view)
  baseItems: FurnitureItem[]; // published default only, no local overrides (Floor Plan view)
  baseLoaded: boolean;
  updatePosition: (id: string, x: number, y: number) => void;
  updateFootprintSize: (id: string, footprintWidth: number, footprintHeight: number) => void;
  beginGesture: () => void; // call once at drag/resize start, so the whole gesture undoes in one step
  toggleRotation: (id: string) => void;
  resetOne: (id: string) => void;
  resetAll: () => void;
  isMoved: (id: string) => boolean;
  canUndo: boolean;
  undo: () => void;
  exportCode: () => string;
  importCode: (code: string) => boolean;
  publishing: boolean;
  publishAsDefault: () => Promise<boolean>;
}

const FurnitureLayoutContext = createContext<FurnitureLayoutContextValue | null>(null);

export function FurnitureLayoutProvider({ children }: { children: ReactNode }) {
  const [baseItems, setBaseItems] = useState<FurnitureItem[]>(FACTORY_DEFAULT_ITEMS);
  const [baseLoaded, setBaseLoaded] = useState(false);
  const [overrides, setOverrides] = useState<Overrides>(() => loadLocalOverrides());
  const [history, setHistory] = useState<Overrides[]>([]);
  const [publishing, setPublishing] = useState(false);

  // Load the admin-published default once on mount; keep the hardcoded
  // config showing in the meantime so there's never a blank flash.
  useEffect(() => {
    let cancelled = false;
    loadPublishedLayout().then((published) => {
      if (!cancelled && published && published.length > 0) setBaseItems(published);
      if (!cancelled) setBaseLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
    } catch {
      // best-effort persistence only
    }
  }, [overrides]);

  const baseOf = useCallback((id: string) => baseItems.find((i) => i.id === id), [baseItems]);

  const currentOf = useCallback(
    (id: string): Override | undefined => {
      const base = baseOf(id);
      if (!base) return undefined;
      return overrides[id] ?? { x: base.x, y: base.y, width: base.width, height: base.height, rotated: base.rotated ?? false };
    },
    [baseOf, overrides],
  );

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), overrides]);
  }, [overrides]);

  const updatePosition = useCallback(
    (id: string, x: number, y: number) => {
      setOverrides((prev) => {
        const cur = prev[id] ?? currentOf(id);
        if (!cur) return prev;
        return { ...prev, [id]: { ...cur, x, y } };
      });
    },
    [currentOf],
  );

  // footprintWidth/footprintHeight are what the user sees on the floor
  // (post-rotation) — top-left corner (x, y) stays fixed, growing/shrinking
  // toward the bottom-right, same as a standard resize handle.
  const updateFootprintSize = useCallback(
    (id: string, footprintWidth: number, footprintHeight: number) => {
      setOverrides((prev) => {
        const cur = prev[id] ?? currentOf(id);
        if (!cur) return prev;
        const { width, height } = cur.rotated
          ? { width: footprintHeight, height: footprintWidth }
          : { width: footprintWidth, height: footprintHeight };
        return { ...prev, [id]: { ...cur, width, height } };
      });
    },
    [currentOf],
  );

  const toggleRotation = useCallback(
    (id: string) => {
      pushHistory();
      setOverrides((prev) => {
        const cur = prev[id] ?? currentOf(id);
        if (!cur) return prev;
        const curFoot = footprint(cur);
        const centerX = cur.x + curFoot.w / 2;
        const centerY = cur.y + curFoot.h / 2;
        const nextRotated = !cur.rotated;
        const nextFoot = footprint({ width: cur.width, height: cur.height, rotated: nextRotated });
        return { ...prev, [id]: { ...cur, rotated: nextRotated, x: centerX - nextFoot.w / 2, y: centerY - nextFoot.h / 2 } };
      });
    },
    [currentOf, pushHistory],
  );

  const resetOne = useCallback(
    (id: string) => {
      pushHistory();
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [pushHistory],
  );

  const resetAll = useCallback(() => {
    pushHistory();
    setOverrides({});
  }, [pushHistory]);

  const isMoved = useCallback((id: string) => id in overrides, [overrides]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setOverrides(last);
    setHistory((h) => h.slice(0, -1));
  }, [history]);

  const exportCode = useCallback((): string => {
    const payload = baseItems.map((item) => {
      const cur = currentOf(item.id);
      return { id: item.id, x: cur?.x ?? item.x, y: cur?.y ?? item.y, width: cur?.width ?? item.width, height: cur?.height ?? item.height, rotated: cur?.rotated ?? item.rotated ?? false };
    });
    return btoa(JSON.stringify(payload));
  }, [baseItems, currentOf]);

  const importCode = useCallback(
    (code: string): boolean => {
      try {
        const payload = JSON.parse(atob(code.trim())) as { id: string; x: number; y: number; width: number; height: number; rotated: boolean }[];
        if (!Array.isArray(payload)) return false;
        pushHistory();
        setOverrides((prev) => {
          const next = { ...prev };
          for (const entry of payload) {
            if (!entry || typeof entry.id !== "string") continue;
            next[entry.id] = { x: entry.x, y: entry.y, width: entry.width, height: entry.height, rotated: !!entry.rotated };
          }
          return next;
        });
        return true;
      } catch {
        return false;
      }
    },
    [pushHistory],
  );

  const items = useMemo(
    () =>
      baseItems.map((item) => {
        const o = overrides[item.id];
        return o ? { ...item, ...o } : { ...item, rotated: item.rotated ?? false };
      }),
    [baseItems, overrides],
  );

  const publishAsDefault = useCallback(async (): Promise<boolean> => {
    setPublishing(true);
    try {
      const resolved = items.map((i) => ({ ...i })); // full current sandbox state becomes the new base
      const ok = await publishLayout(resolved);
      if (ok) {
        setBaseItems(resolved);
        setOverrides({}); // now baked into the base — local overrides no longer needed
        setHistory([]);
      }
      return ok;
    } finally {
      setPublishing(false);
    }
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      baseItems,
      baseLoaded,
      updatePosition,
      updateFootprintSize,
      beginGesture: pushHistory,
      toggleRotation,
      resetOne,
      resetAll,
      isMoved,
      canUndo: history.length > 0,
      undo,
      exportCode,
      importCode,
      publishing,
      publishAsDefault,
    }),
    [
      items,
      baseItems,
      baseLoaded,
      updatePosition,
      updateFootprintSize,
      pushHistory,
      toggleRotation,
      resetOne,
      resetAll,
      isMoved,
      history.length,
      undo,
      exportCode,
      importCode,
      publishing,
      publishAsDefault,
    ],
  );

  return <FurnitureLayoutContext.Provider value={value}>{children}</FurnitureLayoutContext.Provider>;
}

export function useFurnitureLayout() {
  const ctx = useContext(FurnitureLayoutContext);
  if (!ctx) throw new Error("useFurnitureLayout must be used inside FurnitureLayoutProvider");
  return ctx;
}
