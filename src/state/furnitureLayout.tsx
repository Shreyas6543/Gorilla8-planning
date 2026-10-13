import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { POOL_TABLES, PS5_STATIONS, RACING_SIM, COUNTER, CABINET, footprint, normalizeFurnitureItem, type FurnitureItem } from "../config/layout";
import { loadPublishedLayout, publishLayout } from "../lib/furnitureLayoutRemote";
import { loadCatalog, createCatalogEntry, type CatalogEntry } from "../lib/furnitureCatalog";

// Editable furniture layout, shared between the drag-to-design page, the
// Floor Plan page, and the 3D walkthrough.
//
// Two layers:
// - `baseItems`: the "real" layout — the admin-published default from
//   Supabase (falling back to the hardcoded config if nothing's ever been
//   published). This is what the Floor Plan page shows to everyone.
// - `items`: the local sandbox's full instance list if the user has made
//   any edit (move/resize/rotate/add/remove — localStorage only), else
//   just `baseItems` unchanged. Unlike the old per-id-diff model, this has
//   to be a full array now since instances can be added or removed, not
//   just repositioned. Publishing (admin-only) promotes the current
//   `items` to be the new `baseItems` for everyone, then clears the local
//   sandbox (it's baked in now).

const LOCAL_ITEMS_KEY = "gorilla8-furniture-layout-v3"; // v3: full item array (supports add/remove of instances)
const HISTORY_LIMIT = 50;

const FACTORY_DEFAULT_ITEMS: FurnitureItem[] = [...POOL_TABLES, ...PS5_STATIONS, RACING_SIM, COUNTER, CABINET];

function loadLocalItems(): FurnitureItem[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_ITEMS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown[];
    return parsed.map(normalizeFurnitureItem);
  } catch {
    return null;
  }
}

function saveLocalItems(items: FurnitureItem[] | null): void {
  try {
    if (items === null) localStorage.removeItem(LOCAL_ITEMS_KEY);
    else localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(items));
  } catch {
    // best-effort persistence only
  }
}

function itemsEqual(a: FurnitureItem, b: FurnitureItem): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    (a.rotationSteps ?? 0) === (b.rotationSteps ?? 0) &&
    a.elevation === b.elevation &&
    (a.color ?? null) === (b.color ?? null)
  );
}

interface FurnitureLayoutContextValue {
  items: FurnitureItem[]; // local sandbox if edited, else baseItems
  baseItems: FurnitureItem[]; // published default only, never affected by local edits (Floor Plan view)
  baseLoaded: boolean;
  hasLocalEdits: boolean; // true when this browser's sandbox differs from the published layout
  catalog: CatalogEntry[];
  addCatalogEntry: (entry: CatalogEntry) => Promise<{ ok: boolean; error?: string }>;
  addInstance: (catalogEntry: CatalogEntry) => void;
  removeInstance: (id: string) => void;
  updatePosition: (id: string, x: number, y: number) => void;
  updateFootprintSize: (id: string, footprintWidth: number, footprintHeight: number) => void;
  updateElevation: (id: string, elevation: number) => void;
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
  publishAsDefault: () => Promise<{ ok: boolean; error?: string }>;
}

const FurnitureLayoutContext = createContext<FurnitureLayoutContextValue | null>(null);

export function FurnitureLayoutProvider({ children }: { children: ReactNode }) {
  const [baseItems, setBaseItems] = useState<FurnitureItem[]>(FACTORY_DEFAULT_ITEMS);
  const [baseLoaded, setBaseLoaded] = useState(false);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [localItems, setLocalItems] = useState<FurnitureItem[] | null>(() => loadLocalItems());
  const [history, setHistory] = useState<(FurnitureItem[] | null)[]>([]);
  const [publishing, setPublishing] = useState(false);

  // Load the admin-published default + the furniture catalog once on
  // mount; keep the hardcoded config/builtin catalog showing meanwhile so
  // there's never a blank flash.
  useEffect(() => {
    let cancelled = false;
    loadPublishedLayout().then((published) => {
      if (!cancelled && published && published.length > 0) setBaseItems(published);
      if (!cancelled) setBaseLoaded(true);
    });
    loadCatalog().then((entries) => {
      if (!cancelled) setCatalog(entries);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveLocalItems(localItems);
  }, [localItems]);

  const items = localItems ?? baseItems;

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), localItems]);
  }, [localItems]);

  const mutate = useCallback(
    (fn: (current: FurnitureItem[]) => FurnitureItem[]) => {
      setLocalItems((prev) => fn(prev ?? baseItems));
    },
    [baseItems],
  );

  const updatePosition = useCallback(
    (id: string, x: number, y: number) => {
      mutate((current) => current.map((it) => (it.id === id ? { ...it, x, y } : it)));
    },
    [mutate],
  );

  // footprintWidth/footprintHeight are what the user sees on the floor
  // (post-rotation) — top-left corner (x, y) stays fixed, growing/shrinking
  // toward the bottom-right, same as a standard resize handle.
  const updateFootprintSize = useCallback(
    (id: string, footprintWidth: number, footprintHeight: number) => {
      mutate((current) =>
        current.map((it) => {
          if (it.id !== id) return it;
          const { width, height } =
            (it.rotationSteps ?? 0) % 2 === 1
              ? { width: footprintHeight, height: footprintWidth }
              : { width: footprintWidth, height: footprintHeight };
          return { ...it, width, height };
        }),
      );
    },
    [mutate],
  );

  const updateElevation = useCallback(
    (id: string, elevation: number) => {
      mutate((current) => current.map((it) => (it.id === id ? { ...it, elevation } : it)));
    },
    [mutate],
  );

  // Cycles through all 4 orientations (0°→90°→180°→270°→0°...) rather than
  // flipping between just 2 — a real turn, not a mirror. Footprint only
  // changes shape on odd steps (90°/270°), but the item still visibly
  // turns to face the opposite direction on 180°/270° even though the
  // footprint looks the same as 0°/90° — that's the whole point.
  const toggleRotation = useCallback(
    (id: string) => {
      pushHistory();
      mutate((current) =>
        current.map((it) => {
          if (it.id !== id) return it;
          const curFoot = footprint(it);
          const centerX = it.x + curFoot.w / 2;
          const centerY = it.y + curFoot.h / 2;
          const nextSteps = (((it.rotationSteps ?? 0) + 1) % 4) as 0 | 1 | 2 | 3;
          const nextFoot = footprint({ width: it.width, height: it.height, rotationSteps: nextSteps });
          return { ...it, rotationSteps: nextSteps, x: centerX - nextFoot.w / 2, y: centerY - nextFoot.h / 2 };
        }),
      );
    },
    [mutate, pushHistory],
  );

  const addInstance = useCallback(
    (catalogEntry: CatalogEntry) => {
      pushHistory();
      mutate((current) => {
        const existingCount = current.filter((it) => it.catalogId === catalogEntry.id).length;
        const label = existingCount > 0 ? `${catalogEntry.name} ${existingCount + 1}` : catalogEntry.name;
        const newItem: FurnitureItem = {
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random()}`,
          catalogId: catalogEntry.id,
          renderType: catalogEntry.renderType,
          typeName: catalogEntry.name,
          x: 2,
          y: 2,
          width: catalogEntry.defaultWidth,
          height: catalogEntry.defaultDepth,
          elevation: catalogEntry.defaultElevation,
          label,
          color: catalogEntry.color,
          rotationSteps: 0,
        };
        return [...current, newItem];
      });
    },
    [mutate, pushHistory],
  );

  const removeInstance = useCallback(
    (id: string) => {
      pushHistory();
      mutate((current) => current.filter((it) => it.id !== id));
    },
    [mutate, pushHistory],
  );

  const resetOne = useCallback(
    (id: string) => {
      pushHistory();
      const baseItem = baseItems.find((b) => b.id === id);
      mutate((current) => {
        if (!baseItem) return current.filter((it) => it.id !== id); // newly added, no base to revert to — remove it
        return current.map((it) => (it.id === id ? { ...baseItem } : it));
      });
    },
    [baseItems, mutate, pushHistory],
  );

  const resetAll = useCallback(() => {
    pushHistory();
    setLocalItems(null);
  }, [pushHistory]);

  const isMoved = useCallback(
    (id: string) => {
      if (!localItems) return false;
      const baseItem = baseItems.find((b) => b.id === id);
      const localItem = localItems.find((l) => l.id === id);
      if (!localItem) return false;
      if (!baseItem) return true; // newly added instance
      return !itemsEqual(baseItem, localItem);
    },
    [localItems, baseItems],
  );

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setLocalItems(last);
    setHistory((h) => h.slice(0, -1));
  }, [history]);

  const exportCode = useCallback((): string => btoa(JSON.stringify(items)), [items]);

  const importCode = useCallback(
    (code: string): boolean => {
      try {
        const payload = JSON.parse(atob(code.trim())) as unknown[];
        if (!Array.isArray(payload)) return false;
        pushHistory();
        setLocalItems(payload.map(normalizeFurnitureItem));
        return true;
      } catch {
        return false;
      }
    },
    [pushHistory],
  );

  const addCatalogEntry = useCallback(async (entry: CatalogEntry) => {
    const result = await createCatalogEntry(entry);
    if (result.ok) setCatalog((prev) => [...prev, entry]);
    return result;
  }, []);

  const publishAsDefault = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    setPublishing(true);
    try {
      const resolved = items.map((i) => ({ ...i })); // full current sandbox state becomes the new base
      const result = await publishLayout(resolved);
      if (result.ok) {
        setBaseItems(resolved);
        setLocalItems(null); // now baked into the base — local sandbox no longer needed
        setHistory([]);
      }
      return result;
    } finally {
      setPublishing(false);
    }
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      baseItems,
      baseLoaded,
      hasLocalEdits: localItems !== null,
      catalog,
      addCatalogEntry,
      addInstance,
      removeInstance,
      updatePosition,
      updateFootprintSize,
      updateElevation,
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
      localItems,
      catalog,
      addCatalogEntry,
      addInstance,
      removeInstance,
      updatePosition,
      updateFootprintSize,
      updateElevation,
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
