import { Box } from "@mui/material";
import { OUTER_POLYGON, WALL_SEGMENTS, ENTRANCE, GLASS_WALL, BEAMS } from "../config/floorplan";
import { POOL_TABLES, POOL_CLUSTER_CLEARANCE, PS5_STATIONS, RACING_SIM, COUNTER, CABINET, footprint, type FurnitureItem } from "../config/layout";
import type { RenderType } from "../lib/furnitureCatalog";

const DEFAULT_FURNITURE: FurnitureItem[] = [...POOL_TABLES, ...PS5_STATIONS, RACING_SIM, COUNTER, CABINET];

const GENERIC_STYLE = { fill: "rgba(136,153,170,0.3)", stroke: "#8899AA", textFill: "#F2F4F7", fontSize: 0.55 };

const TYPE_STYLE: Record<RenderType, { fill: string; stroke: string; textFill: string; fontSize: number }> = {
  pool: { fill: "#2E7D32", stroke: "#8B5A2B", textFill: "#F2F4F7", fontSize: 0.75 },
  ps5: { fill: "rgba(57,255,136,0.18)", stroke: "#39FF88", textFill: "#39FF88", fontSize: 0.85 },
  racingSim: { fill: "rgba(255,159,67,0.2)", stroke: "#FF9F43", textFill: "#FF9F43", fontSize: 0.7 },
  counter: { fill: "rgba(154,164,178,0.35)", stroke: "#9AA4B2", textFill: "#F2F4F7", fontSize: 0.7 },
  cabinet: { fill: "rgba(184,138,74,0.3)", stroke: "#B88A4A", textFill: "#F2F4F7", fontSize: 0.55 },
  generic: GENERIC_STYLE,
};

const TYPE_DISPLAY_LABEL: Record<RenderType, string | null> = {
  pool: null, // uses the item's own label (Pool 1/2/3)
  ps5: null, // uses the item's own label (PS5 1-5)
  racingSim: "RACING SIM",
  counter: "COUNTER",
  cabinet: "CABINET",
  generic: null, // uses the item's own label
};

export const PAD = 5; // feet of padding around the shape, for labels

export function bounds(points: [number, number][]) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return {
    minX: Math.min(...xs) - PAD,
    minY: Math.min(...ys) - PAD,
    maxX: Math.max(...xs) + PAD,
    maxY: Math.max(...ys) + PAD,
  };
}

function midpoint(a: readonly [number, number], b: readonly [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

// Offsets a dimension label outward from a wall segment, based on whether
// the segment is horizontal or vertical, so text doesn't sit on the wall line.
function labelOffset(a: readonly [number, number], b: readonly [number, number]): [number, number] {
  const isHorizontal = a[1] === b[1];
  return isHorizontal ? [0, -0.9] : [1.1, 0];
}

// Static background — floor outline, glass wall, entrance, beams. Shared by
// the read-only Floor Plan page and the draggable Design page, so both
// always show the exact same room shape.
export function RoomOutline() {
  const pathD = `M ${OUTER_POLYGON.map((p) => p.join(",")).join(" L ")} Z`;
  return (
    <>
      <path d={pathD} fill="rgba(57,255,136,0.06)" stroke="#F2F4F7" strokeWidth={0.15} />

      {/* Glass wall highlight */}
      <line
        x1={GLASS_WALL.from[0]}
        y1={GLASS_WALL.from[1]}
        x2={GLASS_WALL.to[0]}
        y2={GLASS_WALL.to[1]}
        stroke="#3DB2FF"
        strokeWidth={0.35}
        strokeDasharray="0.6,0.4"
      />
      <text x={GLASS_WALL.from[0] + 1} y={midpoint(GLASS_WALL.from, GLASS_WALL.to)[1]} fill="#3DB2FF" fontSize={1} fontWeight={700}>
        GLASS WALL
      </text>

      {/* Entrance — a shutter, not a swinging door: opening drawn as a
          slatted bar across the gap, no swing arc. */}
      <line x1={ENTRANCE.from[0]} y1={ENTRANCE.from[1]} x2={ENTRANCE.to[0]} y2={ENTRANCE.to[1]} stroke="#9AA4B2" strokeWidth={0.25} />
      {Array.from({ length: Math.round(ENTRANCE.width / 0.8) + 1 }, (_, i) => {
        const x = ENTRANCE.from[0] + i * 0.8;
        if (x > ENTRANCE.to[0]) return null;
        return (
          <line key={i} x1={x} y1={ENTRANCE.from[1] - 0.35} x2={x} y2={ENTRANCE.from[1] + 0.35} stroke="#9AA4B2" strokeWidth={0.12} />
        );
      })}
      <text x={ENTRANCE.from[0]} y={ENTRANCE.from[1] - 1.2} fill="#9AA4B2" fontSize={1} fontWeight={700}>
        ENTRANCE (SHUTTER) {ENTRANCE.width} ft
      </text>

      {/* Beams */}
      {BEAMS.map((beam) => {
        const isBottomWall = beam.y > 20;
        const rectY = isBottomWall ? beam.y - beam.depth : beam.y;
        return (
          <g key={beam.id}>
            <rect x={beam.x - beam.width / 2} y={rectY} width={beam.width} height={beam.depth} fill="#FF6B6B" opacity={0.6} />
            <text
              x={beam.x + 0.4}
              y={isBottomWall ? beam.y - beam.depth - 0.3 : beam.y + beam.depth + 1}
              fill="#FF6B6B"
              fontSize={0.9}
              fontWeight={700}
            >
              {beam.label}
            </text>
          </g>
        );
      })}
    </>
  );
}

// Wall dimension labels for every measured segment — kept separate from
// RoomOutline so callers can choose to paint it above their own furniture
// layer (matches the original Floor Plan page's paint order).
export function DimensionLabels() {
  return (
    <>
      {WALL_SEGMENTS.map((seg, i) => {
        const mid = midpoint(seg.from, seg.to);
        const [ox, oy] = labelOffset(seg.from, seg.to);
        const isTiny = seg.length < 1;
        return (
          <text key={i} x={mid[0] + ox} y={mid[1] + oy} fill={isTiny ? "#9AA4B2" : "#F2F4F7"} fontSize={isTiny ? 0.7 : 0.95} textAnchor="middle">
            {seg.label}
          </text>
        );
      })}
    </>
  );
}

interface FloorPlanSvgProps {
  showFurniture?: boolean;
  items?: FurnitureItem[]; // defaults to the hardcoded config; Floor Plan page passes the published layout
}

export function FloorPlanSvg({ showFurniture = false, items = DEFAULT_FURNITURE }: FloorPlanSvgProps) {
  const { minX, minY, maxX, maxY } = bounds(OUTER_POLYGON);
  const width = maxX - minX;
  const height = maxY - minY;

  return (
    <Box sx={{ width: "100%", maxWidth: 720, mx: "auto" }}>
      <svg
        viewBox={`${minX} ${minY} ${width} ${height}`}
        width="100%"
        height="auto"
        style={{ display: "block", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}
      >
        <RoomOutline />

        {showFurniture && (
          <>
            {/* Pool table clearance envelope — a fixed planning guideline,
                not tied to the live positions above */}
            <rect
              x={POOL_CLUSTER_CLEARANCE.x}
              y={POOL_CLUSTER_CLEARANCE.y}
              width={POOL_CLUSTER_CLEARANCE.width}
              height={POOL_CLUSTER_CLEARANCE.height}
              fill="none"
              stroke="#8B5A2B"
              strokeWidth={0.1}
              strokeDasharray="0.4,0.4"
              opacity={0.6}
            />

            {items.map((item) => {
              // Defensive fallback: any item that somehow reaches here
              // without a recognized renderType (e.g. un-migrated data)
              // still renders as a generic box instead of crashing the
              // whole page — see normalizeFurnitureItem() in config/layout.ts
              // for where this should really get fixed up.
              const style = TYPE_STYLE[item.renderType] ?? GENERIC_STYLE;
              const foot = footprint(item);
              const cx = item.x + foot.w / 2;
              const cy = item.y + foot.h / 2;
              const label = TYPE_DISPLAY_LABEL[item.renderType] ?? item.label;
              const fill = item.renderType === "generic" && item.color ? `${item.color}4D` : style.fill;
              const stroke = item.renderType === "generic" && item.color ? item.color : style.stroke;
              // Pool table labels run rotated 90° (tall/narrow footprint) —
              // only rotate the text if the item's on-floor shape is still
              // tall/narrow after any rotation the item itself has.
              const rotateLabel = item.renderType === "pool" && foot.h >= foot.w;
              return (
                <g key={item.id}>
                  <rect x={item.x} y={item.y} width={foot.w} height={foot.h} fill={fill} stroke={stroke} strokeWidth={0.12} />
                  <text
                    x={cx}
                    y={cy}
                    fill={style.textFill}
                    fontSize={style.fontSize}
                    fontWeight={700}
                    textAnchor="middle"
                    transform={rotateLabel ? `rotate(90 ${cx} ${cy})` : undefined}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </>
        )}

        <DimensionLabels />
      </svg>
    </Box>
  );
}
