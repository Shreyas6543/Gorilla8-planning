import { footprint, type FurnitureItem } from "../config/layout";

// Shared geometry for the Kitchen prop, used by both the 3D model
// (WalkthroughScene) and the 2D plan markers (KitchenMarks) so the two can
// never disagree about where the service openings are.
//
// Intrinsic (0° rotation) layout, in the item's own frame with the footprint
// centre at the origin, width along x and depth along z:
//   - the NORTH (z-) and WEST (x-) faces are solid walls, meant to sit
//     against the room's walls in a corner
//   - the SOUTH (z+) and EAST (x+) faces are the open faces: a counter slab
//     `slab` ft deep runs along the outside, and set back behind it is the
//     kitchen wall with a service opening cut through it, leaving `margin`
//     ft of solid wall at each end of the opening
// Rotating the item by 90° steps carries the open faces to the other corners.

export const KITCHEN_SLAB_FT = 1.4;
export const KITCHEN_WALL_FT = 0.5;
export const KITCHEN_MARGIN_FT = 1;

export interface KitchenDims {
  slab: number;
  wall: number;
  margin: number;
}

// Clamped so a small/resized kitchen still leaves a usable opening.
export function kitchenDims(width: number, depth: number): KitchenDims {
  const slab = Math.max(0.6, Math.min(KITCHEN_SLAB_FT, width / 3, depth / 3));
  const shortestWall = Math.min(width, depth) - slab;
  const margin = Math.max(0, Math.min(KITCHEN_MARGIN_FT, (shortestWall - 1) / 2));
  return { slab, wall: KITCHEN_WALL_FT, margin };
}

export interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface KitchenOpening {
  wall: Seg; // the opening's span on the kitchen wall line (world ft)
  outer: Seg; // the same span projected out to the counter's outer edge
  nx: number; // outward unit normal, world axes (y is plan-down)
  ny: number;
}

const clean = (n: number) => Math.round(n * 1e6) / 1e6;

// World-space positions of the two service openings for a placed kitchen.
export function kitchenOpenings(item: Pick<FurnitureItem, "x" | "y" | "width" | "height" | "rotationSteps">): KitchenOpening[] {
  const f = footprint(item);
  const cx = item.x + f.w / 2;
  const cy = item.y + f.h / 2;
  const theta = (item.rotationSteps ?? 0) * (Math.PI / 2);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  // Same mapping the 3D scene's rotation applies: local (px, pz) -> world.
  const toWorld = (px: number, pz: number): [number, number] => [
    clean(cx + px * cos + pz * sin),
    clean(cy - px * sin + pz * cos),
  ];
  const dir = (dx: number, dz: number): [number, number] => [clean(dx * cos + dz * sin), clean(-dx * sin + dz * cos)];

  const W = item.width;
  const D = item.height;
  const { slab: S, margin: M } = kitchenDims(W, D);
  const hw = W / 2;
  const hh = D / 2;

  const seg = (a: [number, number], b: [number, number]): Seg => ({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] });

  // South face: wall line z = hh - S, outer edge z = hh, opening x in [-hw+M, hw-S-M].
  const sx0 = -hw + M;
  const sx1 = hw - S - M;
  const [sn0, sn1] = dir(0, 1);
  // East face: wall line x = hw - S, outer edge x = hw, opening z in [-hh+M, hh-S-M].
  const ez0 = -hh + M;
  const ez1 = hh - S - M;
  const [en0, en1] = dir(1, 0);

  const out: KitchenOpening[] = [];
  if (sx1 > sx0) {
    out.push({
      wall: seg(toWorld(sx0, hh - S), toWorld(sx1, hh - S)),
      outer: seg(toWorld(sx0, hh), toWorld(sx1, hh)),
      nx: sn0,
      ny: sn1,
    });
  }
  if (ez1 > ez0) {
    out.push({
      wall: seg(toWorld(hw - S, ez0), toWorld(hw - S, ez1)),
      outer: seg(toWorld(hw, ez0), toWorld(hw, ez1)),
      nx: en0,
      ny: en1,
    });
  }
  return out;
}
