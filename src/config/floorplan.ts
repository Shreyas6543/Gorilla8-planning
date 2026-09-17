// GORILLA 8 candidate space — hand-measured floor plan, reconstructed from a
// notebook sketch. All units in feet. Origin (0,0) = top-left corner of the
// sketch; x increases rightward, y increases downward (matches the sketch's
// own bird's-eye/top-down orientation).
//
// Confirmed with Shreyas:
// - Ceiling height: 9.5 ft
// - Right-hand wall (x=36.7, from y=15.3 to y=36.5) is glass
// - Entrance is a 6.2 ft wide opening in the wall between the 11.6 ft and
//   2.4 ft segments (order left-to-right assumed from sketch position, not
//   explicitly re-confirmed — verify against the render)
// - Two structural beams noted as obstacles (approximate placement — exact
//   position/protrusion not fully pinned down yet)
// - The entrance is a shutter (not a swinging door) — no swing arc drawn.

export const FLOOR_HEIGHT_FT = 9.5;

// Outer wall boundary, clockwise from top-left. Resolves to a rectangle
// (36.7 x 36.5 ft) with a notch cut from the top-right corner
// (20.2 ft wide x 15.3 ft deep) — matches the sketch's shape, and closes
// exactly (36.7-16.5=20.2 == 11.6+6.2+2.4, and the right side 15.3+21.2=36.5
// matches the left wall exactly).
export const OUTER_POLYGON: [number, number][] = [
  [0, 0],
  [16.5, 0],
  [16.5, 15.3],
  [36.7, 15.3],
  [36.7, 36.5],
  [0, 36.5],
];

// Every measured wall segment, in walking order, for dimension labels.
export const WALL_SEGMENTS = [
  { from: [0, 0], to: [16.5, 0], length: 16.5, label: "16.5 ft" },
  { from: [16.5, 0], to: [16.5, 15.3], length: 15.3, label: "15.3 ft" },
  { from: [16.5, 15.3], to: [28.1, 15.3], length: 11.6, label: "11.6 ft" },
  { from: [28.1, 15.3], to: [34.3, 15.3], length: 6.2, label: "6.2 ft (entrance)" },
  { from: [34.3, 15.3], to: [36.7, 15.3], length: 2.4, label: "2.4 ft" },
  { from: [36.7, 15.3], to: [36.7, 36.5], length: 21.2, label: "21.2 ft (glass)" },
  { from: [36.7, 36.5], to: [35.4, 36.5], length: 1.3, label: "1.3 ft" },
  { from: [35.4, 36.5], to: [35.29, 36.5], length: 0.11, label: "beam, 0.11 ft" },
  { from: [35.29, 36.5], to: [0, 36.5], length: 35, label: "35 ft" },
  { from: [0, 36.5], to: [0, 0], length: 36.5, label: "36.5 ft" },
] as const;

export const ENTRANCE = {
  from: [28.1, 15.3] as [number, number],
  to: [34.3, 15.3] as [number, number],
  width: 6.2,
};

export const GLASS_WALL = {
  from: [36.7, 15.3] as [number, number],
  to: [36.7, 36.5] as [number, number],
};

// Structural beams / columns — internal obstacles, not part of the outer
// wall boundary. Positions/protrusions are approximate; confirm exact
// placement later once it matters for furniture layout near them.
export const BEAMS = [
  {
    id: "beam-bottom-right",
    x: 35.345, // center of the 35.4→35.29 stretch, embedded in the bottom wall
    y: 36.5,
    width: 0.11,
    depth: 0.3, // rendering guess — protrusion into the room not yet confirmed
    label: "Beam (0.11 ft)",
    note: "In the bottom wall, ~1.3 ft from the bottom-right corner. Exact protrusion into the room not yet confirmed.",
  },
  {
    id: "beam-entrance-side",
    x: 35.5, // rough midpoint of the 2.4 ft segment — exact position along it unconfirmed
    y: 15.3,
    width: 0.11,
    depth: 0.5,
    label: "Beam (0.11 ft)",
    note: "Attached to the wall along the 2.4 ft segment near the entrance, protrudes ~0.5 ft into the room. Exact position along the wall is approximate.",
  },
] as const;

function polygonArea(points: [number, number][]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

export const FLOOR_AREA_SQFT = Math.round(polygonArea(OUTER_POLYGON));
