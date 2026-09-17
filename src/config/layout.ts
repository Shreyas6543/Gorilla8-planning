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
// This layout: 3 pool tables (minimum — far less profitable per sq ft than
// PS5/racing sim), 5 PS5 stations, 1 racing simulator (₹350/hr ÷ 48 sq ft
// beats ₹200/hr ÷ 36 sq ft, so it's more space-efficient than the PS5s it
// displaces), 1 counter on the glass wall right beside the entrance —
// nothing stands between the doorway and it.

export interface FurnitureItem {
  id: string;
  type: "pool" | "ps5" | "racingSim" | "counter" | "cabinet";
  x: number;
  y: number;
  width: number; // intrinsic — never swapped; see `rotated` for footprint orientation
  height: number;
  label: string;
  rotated?: boolean; // true = footprint is turned 90° (width/height swap on the floor)
}

// The on-floor footprint of an item, accounting for rotation — width/height
// on the item itself are always the intrinsic (unrotated) dimensions.
export function footprint(item: Pick<FurnitureItem, "width" | "height" | "rotated">) {
  return item.rotated ? { w: item.height, h: item.width } : { w: item.width, h: item.height };
}

// Inverse of footprint() — given a desired on-floor width/height (what the
// user sees and drags), returns the intrinsic width/height to store.
export function intrinsicFromFootprint(rotated: boolean | undefined, footW: number, footH: number) {
  return rotated ? { width: footH, height: footW } : { width: footW, height: footH };
}

// The 3 pool tables (8ft "length" running along y here, 4ft "width" along x),
// grouped side-by-side sharing width-side clearance between neighbors.
export const POOL_TABLES: FurnitureItem[] = [
  { id: "pool-1", type: "pool", x: 4, y: 24.5, width: 4, height: 8, label: "Pool 1" },
  { id: "pool-2", type: "pool", x: 12, y: 24.5, width: 4, height: 8, label: "Pool 2" },
  { id: "pool-3", type: "pool", x: 20, y: 24.5, width: 4, height: 8, label: "Pool 3" },
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
  { id: "ps5-1", type: "ps5", x: 0, y: 0, width: 6, height: 6, label: "PS5 1" },
  { id: "ps5-2", type: "ps5", x: 0, y: 6, width: 6, height: 6, label: "PS5 2" },
  { id: "ps5-3", type: "ps5", x: 10.5, y: 0, width: 6, height: 6, label: "PS5 3" },
  { id: "ps5-4", type: "ps5", x: 10.5, y: 6, width: 6, height: 6, label: "PS5 4" },
  { id: "ps5-5", type: "ps5", x: 30.7, y: 30.3, width: 6, height: 6, label: "PS5 5" },
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
  type: "counter",
  x: 33.7,
  y: 19.3,
  width: 3, // depth, perpendicular to the glass wall
  height: 5, // width, running along the glass wall
  label: "Counter",
};

// New storage cabinet (3x3 ft), placed right after the counter on the same
// glass wall — reads as one deliberate "reception nook" rather than a
// separate, randomly-placed box. Also sits close enough to the entrance
// beam that it visually "claims" that corner instead of leaving the beam
// looking like a bare obstacle.
export const CABINET: FurnitureItem = {
  id: "cabinet-1",
  type: "cabinet",
  x: 33.7,
  y: 26.3,
  width: 3,
  height: 3,
  label: "Storage Cabinet",
};

// Moved well away from the entrance/glass-wall column entirely — it was the
// single biggest contributor to the "clumsy entrance" complaint. New spot:
// the open floor between the PS5 1-4 cluster and the pool table clearance
// zone, on the LEFT side of the room, nowhere near the entrance sightline
// (which faces the glass wall on the right). Still 4ft clear of the pool
// tables (pool tables start at y=24.5; this ends at y=20) and just touches
// the bottom edge of the PS5 1-4 cluster (y=12) — no clearance rule
// requires a gap there.
export const RACING_SIM: FurnitureItem = {
  id: "racing-1",
  type: "racingSim",
  x: 5,
  y: 12,
  width: 6,
  height: 8,
  label: "Racing Sim",
};

export const LAYOUT_COUNTS = {
  pool: POOL_TABLES.length,
  ps5: PS5_STATIONS.length,
  racingSim: 1,
};
