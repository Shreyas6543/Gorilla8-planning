import { supabase, isSupabaseConfigured } from "./supabaseClient";

// The furniture "catalog" — object TYPES an admin can add instances of on
// the Design page (pool table, PS5 station, ... plus anything they create).
// Distinct from furniture_layout, which stores actual placed INSTANCES.

export type RenderType = "pool" | "ps5" | "racingSim" | "counter" | "cabinet" | "generic";

export interface CatalogEntry {
  id: string;
  name: string;
  builtin: boolean;
  renderType: RenderType;
  defaultWidth: number;
  defaultDepth: number;
  defaultElevation: number;
  color?: string;
}

// The 5 object types this space already has — seeded into the catalog table
// the first time it's empty, so "add object" always has these to search.
export const BUILTIN_CATALOG: CatalogEntry[] = [
  { id: "pool-table", name: "Pool Table", builtin: true, renderType: "pool", defaultWidth: 4, defaultDepth: 8, defaultElevation: 2.55 },
  { id: "ps5-station", name: "PS5 Station", builtin: true, renderType: "ps5", defaultWidth: 6, defaultDepth: 6, defaultElevation: 4.5 },
  { id: "racing-sim", name: "Racing Simulator", builtin: true, renderType: "racingSim", defaultWidth: 6, defaultDepth: 8, defaultElevation: 4 },
  { id: "counter", name: "Counter", builtin: true, renderType: "counter", defaultWidth: 3, defaultDepth: 5, defaultElevation: 3.2 },
  { id: "cabinet", name: "Storage Cabinet", builtin: true, renderType: "cabinet", defaultWidth: 3, defaultDepth: 3, defaultElevation: 6 },
];

interface CatalogRow {
  id: string;
  name: string;
  builtin: boolean;
  render_type: RenderType;
  default_width: number;
  default_depth: number;
  default_elevation: number;
  color: string | null;
}

function fromRow(row: CatalogRow): CatalogEntry {
  return {
    id: row.id,
    name: row.name,
    builtin: row.builtin,
    renderType: row.render_type,
    defaultWidth: row.default_width,
    defaultDepth: row.default_depth,
    defaultElevation: row.default_elevation,
    color: row.color ?? undefined,
  };
}

function toRow(entry: CatalogEntry): CatalogRow {
  return {
    id: entry.id,
    name: entry.name,
    builtin: entry.builtin,
    render_type: entry.renderType,
    default_width: entry.defaultWidth,
    default_depth: entry.defaultDepth,
    default_elevation: entry.defaultElevation,
    color: entry.color ?? null,
  };
}

const LOCAL_KEY = "gorilla8-furniture-catalog-backup-v1";

function loadLocalBackup(): CatalogEntry[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalBackup(entries: CatalogEntry[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(entries));
  } catch {
    // best-effort only
  }
}

// Loads the catalog, seeding the 5 builtin types the first time the table
// is empty (idempotent — safe to call on every app load).
export async function loadCatalog(): Promise<CatalogEntry[]> {
  if (!isSupabaseConfigured || !supabase) {
    return loadLocalBackup() ?? BUILTIN_CATALOG;
  }
  try {
    const { data, error } = await supabase.from("furniture_catalog").select("*");
    if (error) throw error;
    if (!data || data.length === 0) {
      const { error: insertError } = await supabase.from("furniture_catalog").insert(BUILTIN_CATALOG.map(toRow));
      if (insertError) throw insertError;
      saveLocalBackup(BUILTIN_CATALOG);
      return BUILTIN_CATALOG;
    }
    const entries = (data as CatalogRow[]).map(fromRow);
    saveLocalBackup(entries);
    return entries;
  } catch (err) {
    console.error("loadCatalog failed:", err);
    return loadLocalBackup() ?? BUILTIN_CATALOG;
  }
}

export async function createCatalogEntry(entry: CatalogEntry): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, error: "Supabase isn't configured." };
  try {
    const { error } = await supabase.from("furniture_catalog").insert(toRow(entry));
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
