import { useState, useRef, useEffect } from "react";
import { Box } from "@mui/material";
import { OUTER_POLYGON, WALL_SEGMENTS } from "../config/floorplan";
import { footprint, type FurnitureItem } from "../config/layout";
import type { RenderType } from "../lib/furnitureCatalog";
import { useFurnitureLayout } from "../state/furnitureLayout";
import { RoomOutline, DimensionLabels, bounds } from "./FloorPlanSvg";

const FACING_COLOR = "#FFFFFF";

// Which types have a meaningful "front" worth showing. Both PS5 and racing
// sim are rotation-driven — rotating the item actually turns the TV/monitor
// bank in the 3D scene, matching this arrow exactly.
function facingVector(item: FurnitureItem): [number, number] | null {
  if (item.renderType === "racingSim" || item.renderType === "ps5") {
    const theta = (item.rotationSteps ?? 0) * (Math.PI / 2);
    const half = item.height / 2; // intrinsic — matches the 3D scene's own farZ math exactly
    return [half * Math.sin(theta) * 1.35, half * Math.cos(theta) * 1.35];
  }
  return null;
}

const TYPE_COLOR: Record<RenderType, string> = {
  pool: "#2E7D32",
  ps5: "#39FF88",
  racingSim: "#FF9F43",
  counter: "#9AA4B2",
  cabinet: "#B88A4A",
  sofaUnit: "#7A2C20",
  plantPot: "#2E7D32",
  generic: "#8899AA",
};

function colorFor(item: FurnitureItem): string {
  return item.renderType === "generic" && item.color ? item.color : TYPE_COLOR[item.renderType];
}

// Movement/resize snapping. The base grid is fine (0.1 ft) so nothing is
// stuck on coarse steps, and an edge within SNAP_FT of a wall or another
// item's edge is pulled flush onto it — the walls sit at odd positions
// (36.7, 21.2, 16.5 ft...) that no half-foot grid can land on exactly.
const GRID_FT = 0.1;
const SNAP_FT = 0.4;

const round2 = (n: number) => Math.round(n * 100) / 100;
const toGrid = (n: number) => round2(Math.round(n / GRID_FT) * GRID_FT);

// Position (along one axis) for an item of `size` whose grid-rounded start is
// `start`: if its leading or trailing edge is within SNAP_FT of any of
// `edges`, line that edge up exactly; otherwise keep the grid position.
function snapStart(start: number, size: number, edges: number[]): number {
  let best = toGrid(start);
  let bestDist = SNAP_FT;
  for (const e of edges) {
    const dLead = Math.abs(e - start);
    if (dLead < bestDist) {
      bestDist = dLead;
      best = e;
    }
    const dTrail = Math.abs(e - (start + size));
    if (dTrail < bestDist) {
      bestDist = dTrail;
      best = e - size;
    }
  }
  return round2(best);
}

// Same idea for a single moving edge (resize): snap it onto a candidate, else the grid.
function snapEdge(edge: number, edges: number[]): number {
  let best = toGrid(edge);
  let bestDist = SNAP_FT;
  for (const e of edges) {
    const d = Math.abs(e - edge);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return round2(best);
}

const INVALID_COLOR = "#FF3B30";
const GUIDE_COLOR = "#FFD54A";
const HANDLE_HIT_RADIUS = 1.1; // feet — generously bigger than the visible glyph, easy to grab

// Room-boundary test matching the actual L-shaped floor (rectangle with the
// top-right notch excluded) — same rule the 3D walkthrough's collision uses.
function pointInRoom(px: number, py: number): boolean {
  if (px < 0 || py < 0 || px > 36.7 || py > 36.5) return false;
  if (px > 16.5 && py < 15.3) return false;
  return true;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function footprintRect(item: FurnitureItem): Rect {
  const f = footprint(item);
  return { x: item.x, y: item.y, w: f.w, h: f.h };
}

function footprintInRoom(r: Rect): boolean {
  return pointInRoom(r.x, r.y) && pointInRoom(r.x + r.w, r.y) && pointInRoom(r.x, r.y + r.h) && pointInRoom(r.x + r.w, r.y + r.h);
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a1 > b0 && b1 > a0;
}

// Real walls only — the entrance opening isn't a solid boundary.
const VERTICAL_WALLS = WALL_SEGMENTS.filter((s) => s.from[0] === s.to[0] && !s.label.includes("entrance")).map((s) => ({
  x: s.from[0],
  y0: Math.min(s.from[1], s.to[1]),
  y1: Math.max(s.from[1], s.to[1]),
}));
const HORIZONTAL_WALLS = WALL_SEGMENTS.filter((s) => s.from[1] === s.to[1] && !s.label.includes("entrance")).map((s) => ({
  y: s.from[1],
  x0: Math.min(s.from[0], s.to[0]),
  x1: Math.max(s.from[0], s.to[0]),
}));

// Vertical edge positions (x) worth snapping to: real walls whose span
// overlaps [y0, y1], plus every other item's left/right edge.
function xSnapEdges(y0: number, y1: number, others: Rect[]): number[] {
  const edges: number[] = [];
  for (const w of VERTICAL_WALLS) if (rangesOverlap(w.y0, w.y1, y0, y1)) edges.push(w.x);
  for (const o of others) edges.push(o.x, o.x + o.w);
  return edges;
}

function ySnapEdges(x0: number, x1: number, others: Rect[]): number[] {
  const edges: number[] = [];
  for (const w of HORIZONTAL_WALLS) if (rangesOverlap(w.x0, w.x1, x0, x1)) edges.push(w.y);
  for (const o of others) edges.push(o.y, o.y + o.h);
  return edges;
}

// For the dragged item, find the gap to the nearest obstacle (a real wall,
// or another item's facing edge) in each of the 4 directions — Figma-style
// "how much am I leaving here" guides.
function findGaps(rect: Rect, others: Rect[]) {
  let left = Infinity;
  let right = Infinity;
  let top = Infinity;
  let bottom = Infinity;

  for (const w of VERTICAL_WALLS) {
    if (!rangesOverlap(w.y0, w.y1, rect.y, rect.y + rect.h)) continue;
    if (w.x <= rect.x) left = Math.min(left, rect.x - w.x);
    if (w.x >= rect.x + rect.w) right = Math.min(right, w.x - (rect.x + rect.w));
  }
  for (const w of HORIZONTAL_WALLS) {
    if (!rangesOverlap(w.x0, w.x1, rect.x, rect.x + rect.w)) continue;
    if (w.y <= rect.y) top = Math.min(top, rect.y - w.y);
    if (w.y >= rect.y + rect.h) bottom = Math.min(bottom, w.y - (rect.y + rect.h));
  }
  for (const o of others) {
    if (rangesOverlap(o.y, o.y + o.h, rect.y, rect.y + rect.h)) {
      if (o.x + o.w <= rect.x) left = Math.min(left, rect.x - (o.x + o.w));
      if (o.x >= rect.x + rect.w) right = Math.min(right, o.x - (rect.x + rect.w));
    }
    if (rangesOverlap(o.x, o.x + o.w, rect.x, rect.x + rect.w)) {
      if (o.y + o.h <= rect.y) top = Math.min(top, rect.y - (o.y + o.h));
      if (o.y >= rect.y + rect.h) bottom = Math.min(bottom, o.y - (rect.y + rect.h));
    }
  }

  return {
    left: isFinite(left) ? left : null,
    right: isFinite(right) ? right : null,
    top: isFinite(top) ? top : null,
    bottom: isFinite(bottom) ? bottom : null,
  };
}

function clientToSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

// Drag-to-reposition floor plan — every rectangle is a real furniture item
// from the shared layout state. Drag it anywhere; it turns red if it exits
// the actual room shape or overlaps another piece (a warning, not a block
// — this is a what-if tool, not the committed layout). While dragging or
// resizing, gold guide lines show the gap to the nearest wall/item on each
// side. Top-right handle rotates 90°; bottom-right handle resizes (width
// and length independently, top-left corner stays put).
const MIN_SIZE_FT = 1;

export function DesignCanvas() {
  const { items, updatePosition, updateFootprintSize, toggleRotation, removeInstance, beginGesture, undo, canUndo } =
    useFurnitureLayout();
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const resizeRef = useRef<{ id: string; originX: number; originY: number } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { minX, minY, maxX, maxY } = bounds(OUTER_POLYGON);
  const width = maxX - minX;
  const height = maxY - minY;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z";
      if (isUndo && canUndo) {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, canUndo]);

  const rects = new Map(items.map((item) => [item.id, footprintRect(item)] as const));

  const invalidIds = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    const ri = rects.get(items[i].id)!;
    if (!footprintInRoom(ri)) invalidIds.add(items[i].id);
    for (let j = i + 1; j < items.length; j++) {
      const rj = rects.get(items[j].id)!;
      if (rectsOverlap(ri, rj)) {
        invalidIds.add(items[i].id);
        invalidIds.add(items[j].id);
      }
    }
  }

  function onPointerDown(e: React.PointerEvent<SVGRectElement>, item: FurnitureItem) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    beginGesture(); // snapshot before this drag, so one Ctrl+Z undoes the whole move
    const pt = clientToSvgPoint(svg, e.clientX, e.clientY);
    dragRef.current = { id: item.id, dx: pt.x - item.x, dy: pt.y - item.y };
    setActiveId(item.id);
  }

  function onPointerMove(e: React.PointerEvent<SVGRectElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const pt = clientToSvgPoint(svg, e.clientX, e.clientY);
    const item = items.find((i) => i.id === drag.id);
    if (!item) return;
    const { w, h } = footprint(item);
    const others = items.filter((i) => i.id !== drag.id).map((i) => footprintRect(i));
    const rawX = pt.x - drag.dx;
    const rawY = pt.y - drag.dy;
    // Snap x first (against walls/items spanning the item's rows), then y
    // against the snapped x — so a corner can lock flush on both axes at once.
    const nx = snapStart(rawX, w, xSnapEdges(toGrid(rawY), toGrid(rawY) + h, others));
    const ny = snapStart(rawY, h, ySnapEdges(nx, nx + w, others));
    updatePosition(drag.id, nx, ny);
  }

  function onPointerUp(e: React.PointerEvent<SVGRectElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
    setActiveId(null);
  }

  // Resize handle — bottom-right corner. Top-left (x, y) stays fixed; the
  // footprint grows/shrinks toward the corner being dragged, snapped to the
  // same snapping as moving (fine grid + flush to walls/items), with a 1ft floor so it can't collapse to nothing.
  function onResizePointerDown(e: React.PointerEvent<SVGGElement>, item: FurnitureItem, rect: Rect) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    beginGesture(); // snapshot before this resize, so one Ctrl+Z undoes the whole gesture
    resizeRef.current = { id: item.id, originX: rect.x, originY: rect.y };
    setActiveId(item.id);
  }

  function onResizePointerMove(e: React.PointerEvent<SVGGElement>) {
    const resize = resizeRef.current;
    if (!resize) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const pt = clientToSvgPoint(svg, e.clientX, e.clientY);
    const cur = rects.get(resize.id);
    if (!cur) return;
    const others = items.filter((i) => i.id !== resize.id).map((i) => footprintRect(i));
    const rightEdge = snapEdge(pt.x, xSnapEdges(cur.y, cur.y + cur.h, others));
    const bottomEdge = snapEdge(pt.y, ySnapEdges(cur.x, cur.x + cur.w, others));
    const w = Math.max(MIN_SIZE_FT, round2(rightEdge - resize.originX));
    const h = Math.max(MIN_SIZE_FT, round2(bottomEdge - resize.originY));
    updateFootprintSize(resize.id, w, h);
  }

  function onResizePointerUp(e: React.PointerEvent<SVGGElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    resizeRef.current = null;
    setActiveId(null);
  }

  const activeRect = activeId ? rects.get(activeId) : null;
  const gaps = activeRect
    ? findGaps(
        activeRect,
        items.filter((i) => i.id !== activeId).map((i) => rects.get(i.id)!),
      )
    : null;

  return (
    <Box sx={{ width: "100%", maxWidth: 720, mx: "auto" }}>
      <svg
        viewBox={`${minX} ${minY} ${width} ${height}`}
        width="100%"
        height="auto"
        style={{ display: "block", background: "rgba(255,255,255,0.02)", borderRadius: 8, touchAction: "none" }}
      >
        <RoomOutline />

        {items.map((item) => {
          const rect = rects.get(item.id)!;
          const invalid = invalidIds.has(item.id);
          const color = invalid ? INVALID_COLOR : colorFor(item);
          const handleSize = Math.min(0.9, rect.w / 3, rect.h / 3);
          const facing = facingVector(item);
          return (
            <g key={item.id}>
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.h}
                fill={color}
                fillOpacity={0.35}
                stroke={color}
                strokeWidth={0.15}
                style={{ cursor: "grab" }}
                onPointerDown={(e) => onPointerDown(e, item)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              />
              {facing && (
                <FacingArrow cx={rect.x + rect.w / 2} cy={rect.y + rect.h / 2} dx={facing[0]} dy={facing[1]} />
              )}
              <text
                x={rect.x + rect.w / 2}
                y={rect.y + rect.h / 2}
                fill="#F2F4F7"
                fontSize={item.renderType === "pool" ? 0.7 : 0.6}
                fontWeight={700}
                textAnchor="middle"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {item.label}
              </text>

              {/* Delete handle — top-left corner. Undoable (Ctrl+Z). */}
              <g
                transform={`translate(${rect.x} ${rect.y})`}
                style={{ cursor: "pointer" }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  removeInstance(item.id);
                }}
              >
                <circle cx={0} cy={0} r={HANDLE_HIT_RADIUS} fill="#000" fillOpacity={0.001} />
                <circle cx={0} cy={0} r={handleSize / 2} fill="#1a1c1f" stroke={INVALID_COLOR} strokeWidth={0.08} style={{ pointerEvents: "none" }} />
                <text x={0} y={0} fontSize={handleSize * 0.95} textAnchor="middle" dominantBaseline="central" fill={INVALID_COLOR} style={{ pointerEvents: "none" }}>
                  ×
                </text>
              </g>

              {/* Rotate handle — top-right corner. Hit area is deliberately
                  bigger than the visible glyph so it's easy to grab even on
                  a small item or a phone-sized screen. */}
              <g
                transform={`translate(${rect.x + rect.w} ${rect.y})`}
                style={{ cursor: "pointer" }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRotation(item.id);
                }}
              >
                <circle cx={0} cy={0} r={HANDLE_HIT_RADIUS} fill="#000" fillOpacity={0.001} />
                <circle cx={0} cy={0} r={handleSize / 2} fill="#1a1c1f" stroke={color} strokeWidth={0.08} style={{ pointerEvents: "none" }} />
                <text x={0} y={0} fontSize={handleSize * 0.85} textAnchor="middle" dominantBaseline="central" fill={color} style={{ pointerEvents: "none" }}>
                  ↻
                </text>
              </g>

              {/* Resize handle — bottom-right corner, same enlarged hit area. */}
              <g
                transform={`translate(${rect.x + rect.w} ${rect.y + rect.h})`}
                style={{ cursor: "nwse-resize" }}
                onPointerDown={(e) => onResizePointerDown(e, item, rect)}
                onPointerMove={onResizePointerMove}
                onPointerUp={onResizePointerUp}
              >
                <circle cx={0} cy={0} r={HANDLE_HIT_RADIUS} fill="#000" fillOpacity={0.001} />
                <rect
                  x={-handleSize / 2}
                  y={-handleSize / 2}
                  width={handleSize}
                  height={handleSize}
                  fill="#1a1c1f"
                  stroke={color}
                  strokeWidth={0.08}
                  rx={0.08}
                  style={{ pointerEvents: "none" }}
                />
                <line
                  x1={-handleSize * 0.22}
                  y1={handleSize * 0.22}
                  x2={handleSize * 0.22}
                  y2={-handleSize * 0.22}
                  stroke={color}
                  strokeWidth={0.09}
                  style={{ pointerEvents: "none" }}
                />
              </g>
            </g>
          );
        })}

        {/* Live gap guides while dragging */}
        {activeRect && gaps && (
          <>
            {gaps.left !== null && (
              <GapGuide
                x1={activeRect.x - gaps.left}
                y1={activeRect.y + activeRect.h / 2}
                x2={activeRect.x}
                y2={activeRect.y + activeRect.h / 2}
                value={gaps.left}
              />
            )}
            {gaps.right !== null && (
              <GapGuide
                x1={activeRect.x + activeRect.w}
                y1={activeRect.y + activeRect.h / 2}
                x2={activeRect.x + activeRect.w + gaps.right}
                y2={activeRect.y + activeRect.h / 2}
                value={gaps.right}
              />
            )}
            {gaps.top !== null && (
              <GapGuide
                x1={activeRect.x + activeRect.w / 2}
                y1={activeRect.y - gaps.top}
                x2={activeRect.x + activeRect.w / 2}
                y2={activeRect.y}
                value={gaps.top}
              />
            )}
            {gaps.bottom !== null && (
              <GapGuide
                x1={activeRect.x + activeRect.w / 2}
                y1={activeRect.y + activeRect.h}
                x2={activeRect.x + activeRect.w / 2}
                y2={activeRect.y + activeRect.h + gaps.bottom}
                value={gaps.bottom}
              />
            )}
          </>
        )}

        <DimensionLabels />
      </svg>
    </Box>
  );
}

function GapGuide({ x1, y1, x2, y2, value }: { x1: number; y1: number; x2: number; y2: number; value: number }) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const isHorizontal = y1 === y2;
  return (
    <g style={{ pointerEvents: "none" }}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={GUIDE_COLOR} strokeWidth={0.09} strokeDasharray="0.3,0.25" />
      <rect
        x={midX - (isHorizontal ? 1.1 : 1.5)}
        y={midY - (isHorizontal ? 0.55 : 0.4)}
        width={isHorizontal ? 2.2 : 3}
        height={isHorizontal ? 1.1 : 0.8}
        fill="#1a1c1f"
        stroke={GUIDE_COLOR}
        strokeWidth={0.06}
        rx={0.15}
      />
      <text x={midX} y={midY} fill={GUIDE_COLOR} fontSize={0.7} fontWeight={700} textAnchor="middle" dominantBaseline="central">
        {value.toFixed(1)} ft
      </text>
    </g>
  );
}

// A short arrow from an item's center toward whichever direction its
// screen/TV currently faces — drawn on every render (not just while
// dragging), since the whole point is to see it *before* deciding which
// way to rotate, not after.
function FacingArrow({ cx, cy, dx, dy }: { cx: number; cy: number; dx: number; dy: number }) {
  const tipX = cx + dx;
  const tipY = cy + dy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const headLen = 0.6;
  const headWidth = 0.4;
  const baseX = tipX - ux * headLen;
  const baseY = tipY - uy * headLen;
  const p1x = baseX + (px * headWidth) / 2;
  const p1y = baseY + (py * headWidth) / 2;
  const p2x = baseX - (px * headWidth) / 2;
  const p2y = baseY - (py * headWidth) / 2;
  return (
    <g style={{ pointerEvents: "none" }}>
      <line x1={cx} y1={cy} x2={baseX} y2={baseY} stroke={FACING_COLOR} strokeWidth={0.14} />
      <polygon points={`${tipX},${tipY} ${p1x},${p1y} ${p2x},${p2y}`} fill={FACING_COLOR} />
    </g>
  );
}
