// GORILLA 8 candidate space — furniture layout for the floor plan.
// All coordinates/sizes in feet, same coordinate system as floorplan.ts
// (origin = top-left corner, x right, y down).
//
// Rules confirmed with Shreyas:
// - PS5 station (incl. bean chairs + TV unit): 6x6 ft, no clearance needed —
//   PS5-to-PS5 can sit directly touching, PS5-to-counter can sit touching.
//   Every PS5 must back onto a REAL wall (for the TV) — no false walls.
// - Pool table: 8 ft (length) x 4 ft (width). Needs 4 ft clearance on ALL
//   four sides — EXCEPT pool-to-pool, where the clearance is shared (4 ft
//   total between two tables, not 4+4). Pool-to-PS5, pool-to-wall, and
//   pool-to-counter all need the FULL 4 ft (no sharing).
// - Racing simulator: 6 ft (width) x 8 ft (length) footprint, treated like
//   PS5 (touchable, no extra clearance rule given).
// - Counter: one, 5x3 ft. PS5 can touch it; pool tables cannot. Must be
//   attached to the 35 ft wall or the 21.2 ft glass wall — NOT blocking the
//   entrance (Shreyas rejected an entrance-adjacent placement: a counter
//   right at the doorway doesn't make sense) and NOT with anything else
//   sitting between the entrance and it (first attempt put the racing sim
//   in that sightline — fixed by moving the counter onto the glass wall
//   immediately beside the entrance instead of far across the room).
// - Minimums: 3 pool tables, 4 PS5 stations. No max.
//
// This is also now the FACTORY fallback: the "real" instance list lives in
// the furniture_layout Supabase table (see state/furnitureLayout.tsx) and
// can have any number of instances of any catalog type, added/removed by
// an admin on the Design page — this file only supplies what to show
// before that ever loads (or if Supabase isn't configured at all).

import { BUILTIN_CATALOG, type RenderType } from "../lib/furnitureCatalog";

// 0/1/2/3 = 0°/90°/180°/270°. A boolean "rotated" flag can only ever
// distinguish 2 orientations (it round-trips footprint width/height but
// can't tell 0° apart from 180°, or 90° apart from 270°) — so an item could
// never be turned to face the opposite direction along the same axis, only
// swapped to the other axis. This is why "rotate" used to look like a
// flip instead of a real 90°-at-a-time turn. Don't go back to a boolean.
export type RotationSteps = 0 | 1 | 2 | 3;

export interface FurnitureItem {
  id: string;
  catalogId: string; // which furniture_catalog entry this instance is of
  renderType: RenderType;
  typeName: string; // catalog type name, e.g. "Pool Table" — shown as a caption
  x: number;
  y: number;
  width: number; // intrinsic footprint (X) — never swapped; see `rotationSteps`
  height: number; // intrinsic footprint (Z) — never swapped; see `rotationSteps`
  elevation: number; // vertical height, in ft — the 3D scene's tallness for this instance
  label: string; // this instance's own label, e.g. "Pool 1"
  color?: string; // fill/box color — used for "generic" (non-builtin) render types
  rotationSteps?: RotationSteps; // how many 90° turns from the intrinsic orientation
}

// The on-floor footprint of an item, accounting for rotation — width/height
// on the item itself are always the intrinsic (0°) dimensions. Only the
// parity of rotationSteps matters for footprint (90°/270° swap w/h; 0°/180°
// don't) — the full step count additionally matters for which *direction*
// the item faces, used by the 3D scene's actual rotation angle.
export function footprint(item: Pick<FurnitureItem, "width" | "height" | "rotationSteps">) {
  const steps = item.rotationSteps ?? 0;
  return steps % 2 === 1 ? { w: item.height, h: item.width } : { w: item.width, h: item.height };
}

// Maps the OLD (pre-catalog) `type` field to a builtin catalog id, for
// migrating data saved before renderType/catalogId/elevation existed.
const OLD_TYPE_TO_CATALOG_ID: Record<string, string> = {
  pool: "pool-table",
  ps5: "ps5-station",
  racingSim: "racing-sim",
  counter: "counter",
  cabinet: "cabinet",
};

// Makes any stored/shared item safe to render, regardless of which schema
// version wrote it. Anything saved (Supabase, local backup, a pasted share
// code) before the furniture-catalog rework has `type` instead of
// `renderType` and no `catalogId`/`elevation` at all — reading that
// directly crashes FloorPlanSvg (`TYPE_STYLE[undefined].fill`) and makes
// the Walkthrough's renderType filters come back empty (silently, no
// crash — just an "empty room"). Call this on every item coming from
// outside this session's own React state (Supabase, localStorage, an
// imported code) so old data self-heals instead of needing a manual
// migration. Already-current items pass through unchanged.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeFurnitureItem(raw: any): FurnitureItem {
  if (raw && typeof raw.renderType === "string" && typeof raw.elevation === "number" && typeof raw.catalogId === "string") {
    // Migrate the old boolean `rotated` flag (2 states) to rotationSteps (4
    // states) if this item predates the 4-way rotation model — best-effort
    // guess (true -> 90°, since that was the only non-zero state before).
    if (typeof raw.rotationSteps !== "number" && "rotated" in raw) {
      return { ...raw, rotationSteps: raw.rotated ? 1 : 0 } as FurnitureItem;
    }
    return raw as FurnitureItem;
  }
  const oldType = typeof raw?.type === "string" ? (raw.type as string) : undefined;
  const catalogId: string = raw?.catalogId ?? (oldType && OLD_TYPE_TO_CATALOG_ID[oldType]) ?? "pool-table";
  const catalogEntry = BUILTIN_CATALOG.find((c) => c.id === catalogId) ?? BUILTIN_CATALOG[0];
  return {
    id: typeof raw?.id === "string" ? raw.id : `item-${Math.random().toString(36).slice(2)}`,
    catalogId: catalogEntry.id,
    renderType: raw?.renderType ?? catalogEntry.renderType,
    typeName: raw?.typeName ?? catalogEntry.name,
    x: typeof raw?.x === "number" ? raw.x : 0,
    y: typeof raw?.y === "number" ? raw.y : 0,
    width: typeof raw?.width === "number" ? raw.width : catalogEntry.defaultWidth,
    height: typeof raw?.height === "number" ? raw.height : catalogEntry.defaultDepth,
    elevation: typeof raw?.elevation === "number" ? raw.elevation : catalogEntry.defaultElevation,
    label: typeof raw?.label === "string" ? raw.label : catalogEntry.name,
    color: raw?.color,
    rotationSteps: typeof raw?.rotationSteps === "number" ? raw.rotationSteps : raw?.rotated ? 1 : 0,
  };
}

// The 3 pool tables (8ft "length" running along y here, 4ft "width" along x),
// grouped side-by-side sharing width-side clearance between neighbors.
export const POOL_TABLES: FurnitureItem[] = [
  { id: "pool-1", catalogId: "pool-table", renderType: "pool", typeName: "Pool Table", x: 4, y: 24.5, width: 4, height: 8, elevation: 2.55, label: "Pool 1" },
  { id: "pool-2", catalogId: "pool-table", renderType: "pool", typeName: "Pool Table", x: 12, y: 24.5, width: 4, height: 8, elevation: 2.55, label: "Pool 2" },
  { id: "pool-3", catalogId: "pool-table", renderType: "pool", typeName: "Pool Table", x: 20, y: 24.5, width: 4, height: 8, elevation: 2.55, label: "Pool 3" },
];

// The full clearance envelope around the pool table group (for drawing the
// "keep clear" zone) — touches the left wall (x=0) and bottom wall (y=36.5)
// to use them as 2 of the 4 required clearance sides "for free."
export const POOL_CLUSTER_CLEARANCE = { x: 0, y: 20.5, width: 28, height: 16 };

// PS5s 1-2 back onto the left wall (x=0); PS5s 3-4 back onto the room's
// right-side wall at x=16.5 (real wall, not a false one — it separates this
// room from the excluded notch above y=15.3). A walkway gap (x: 6 to 10.5)
// separates the two pairs. PS5-5 backs onto the glass wall (x=36.7), placed
// well down the wall — past the counter and cabinet — so it's out of the
// entrance sightline (see note on RACING_SIM/COUNTER below).
// Every PS5 has a real wall for its TV — no false walls anywhere.
export const PS5_STATIONS: FurnitureItem[] = [
  { id: "ps5-1", catalogId: "ps5-station", renderType: "ps5", typeName: "PS5 Station", x: 0, y: 0, width: 6, height: 6, elevation: 4.5, label: "PS5 1" },
  { id: "ps5-2", catalogId: "ps5-station", renderType: "ps5", typeName: "PS5 Station", x: 0, y: 6, width: 6, height: 6, elevation: 4.5, label: "PS5 2" },
  { id: "ps5-3", catalogId: "ps5-station", renderType: "ps5", typeName: "PS5 Station", x: 10.5, y: 0, width: 6, height: 6, elevation: 4.5, label: "PS5 3" },
  { id: "ps5-4", catalogId: "ps5-station", renderType: "ps5", typeName: "PS5 Station", x: 10.5, y: 6, width: 6, height: 6, elevation: 4.5, label: "PS5 4" },
  { id: "ps5-5", catalogId: "ps5-station", renderType: "ps5", typeName: "PS5 Station", x: 30.7, y: 30.3, width: 6, height: 6, elevation: 4.5, label: "PS5 5" },
];

// Entrance decluttering (Shreyas: "as soon as you enter... the beam, the
// cramped counter, the simulator and PS5 right there — too clumsy"):
// - A clear ~4ft buffer of open floor right past the entrance (y: 15.3 to
//   19.3), before anything at all.
// - Counter, cabinet, and PS5-5 are stacked in order down the GLASS WALL,
//   each with a real gap between them (2ft, 1ft) instead of touching —
//   still visible immediately on entry, but read as separate, intentional
//   pieces rather than one crammed row.
// - The racing sim was moved out of this column entirely — see RACING_SIM.
export const COUNTER: FurnitureItem = {
  id: "counter-1",
  catalogId: "counter",
  renderType: "counter",
  typeName: "Counter",
  x: 33.7,
  y: 19.3,
  width: 3, // depth, perpendicular to the glass wall
  height: 5, // width, running along the glass wall
  elevation: 3.2,
  label: "Counter",
};

// New storage cabinet (3x3 ft), placed right after the counter on the same
// glass wall — reads as one deliberate "reception nook" rather than a
// separate, randomly-placed box. Also sits close enough to the entrance
// beam that it visually "claims" that corner instead of leaving the beam
// looking like a bare obstacle.
export const CABINET: FurnitureItem = {
  id: "cabinet-1",
  catalogId: "cabinet",
  renderType: "cabinet",
  typeName: "Storage Cabinet",
  x: 33.7,
  y: 26.3,
  width: 3,
  height: 3,
  elevation: 6,
  label: "Storage Cabinet",
};

// Moved well away from the entrance/glass-wall column entirely — it was the
// single biggest contributor to the "clumsy entrance" complaint. New spot:
// the open floor between the PS5 1-4 cluster and the pool table clearance
// zone, on the LEFT side of the room, nowhere near the entrance sightline
// (which faces the glass wall on the right). rotationSteps: 3 (270°) turns
// the whole rig so its monitor end — not just some edge of its footprint —
// actually faces and sits flush against the left wall (x=0), with the
// seat/wheel/pedals extending away from the wall into the room, per
// Shreyas: "I want it towards the wall, not towards the area here." (Worked
// out from RotatedFootprint's actual rotation formula: at 270°, a local
// point (0,0,lz) maps to world offset (-lz,0,0) — so the monitor, at the
// high end of local z, ends up at the LOW end of world x, i.e. against
// x=0, while the seat — lower local z — ends up further into +x, away
// from the wall. Bounding box becomes x:[0,8] y:[12,18] after the
// footprint swap (odd rotation steps swap width/height) — still clear of
// every PS5 station and the pool-cluster clearance zone.)
export const RACING_SIM: FurnitureItem = {
  id: "racing-1",
  catalogId: "racing-sim",
  renderType: "racingSim",
  typeName: "Racing Simulator",
  x: 0,
  y: 12,
  width: 6,
  height: 8,
  rotationSteps: 3,
  elevation: 4,
  label: "Racing Sim",
};

export const LAYOUT_COUNTS = {
  pool: POOL_TABLES.length,
  ps5: PS5_STATIONS.length,
  racingSim: 1,
};
