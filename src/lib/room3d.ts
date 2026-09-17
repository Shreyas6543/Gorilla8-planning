import { WALL_SEGMENTS, OUTER_POLYGON, FLOOR_HEIGHT_FT, BEAMS } from "../config/floorplan";

export const EYE_HEIGHT_FT = 5.5;
export const WALK_SPEED_FT_PER_SEC = 6;
const COLLISION_MARGIN_FT = 1;

export { OUTER_POLYGON, FLOOR_HEIGHT_FT, BEAMS };

export interface WallMesh3D {
  id: string;
  isGlass: boolean;
  horizontal: boolean; // true = runs along X, false = runs along Z
  length: number;
  x: number; // world X (center)
  z: number; // world Z (center)
}

// Builds one box per wall segment, in world units (1 unit = 1 ft), skipping
// the entrance opening entirely so it's a real gap you can walk through.
// Every measured segment here is axis-aligned, so no rotation math is
// needed — just swap which axis gets the segment's length.
export function buildWalls(thickness = 0.3): WallMesh3D[] {
  return WALL_SEGMENTS.filter((seg) => !seg.label.includes("entrance")).map((seg, i) => {
    const [x1, y1] = seg.from;
    const [x2, y2] = seg.to;
    const horizontal = y1 === y2;
    const length = horizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
    return {
      id: `wall-${i}`,
      isGlass: seg.label.includes("glass"),
      horizontal,
      length: length + (length > 0.5 ? thickness : 0), // small overlap at corners so they don't gap
      x: (x1 + x2) / 2,
      z: (y1 + y2) / 2,
    };
  });
}

// Room-shape collision test (2D, in the XZ ground plane) with a margin so
// the camera can't walk right up against/through a wall. Does NOT account
// for furniture — a known simplification.
export function isInsideRoom(x: number, z: number, margin = COLLISION_MARGIN_FT): boolean {
  if (x < margin || x > 36.7 - margin || z < margin || z > 36.5 - margin) return false;
  const inNotch = x > 16.5 - margin && z < 15.3 + margin;
  return !inNotch;
}
