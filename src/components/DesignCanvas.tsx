import { useState, useRef, useEffect } from "react";
import { Box } from "@mui/material";
import { OUTER_POLYGON, WALL_SEGMENTS } from "../config/floorplan";
import { footprint, type FurnitureItem } from "../config/layout";
import { useFurnitureLayout } from "../state/furnitureLayout";
import { RoomOutline, DimensionLabels, bounds } from "./FloorPlanSvg";

const TYPE_COLOR: Record<FurnitureItem["type"], string> = {
  pool: "#2E7D32",
  ps5: "#39FF88",
  racingSim: "#FF9F43",
  counter: "#9AA4B2",
  cabinet: "#B88A4A",
};

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
  const { items, updatePosition, updateFootprintSize, toggleRotation, beginGesture, undo, canUndo } = useFurnitureLayout();
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
    const nx = Math.round((pt.x - drag.dx) * 2) / 2; // snap to half-foot grid
    const ny = Math.round((pt.y - drag.dy) * 2) / 2;
    updatePosition(drag.id, nx, ny);
  }

  function onPointerUp(e: React.PointerEvent<SVGRectElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
    setActiveId(null);
  }

  // Resize handle — bottom-right corner. Top-left (x, y) stays fixed; the
  // footprint grows/shrinks toward the corner being dragged, snapped to the
  // same half-foot grid, with a 1ft floor so it can't collapse to nothing.
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
    const w = Math.max(MIN_SIZE_FT, Math.round((pt.x - resize.originX) * 2) / 2);
    const h = Math.max(MIN_SIZE_FT, Math.round((pt.y - resize.originY) * 2) / 2);
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
          const color = invalid ? INVALID_COLOR : TYPE_COLOR[item.type];
          const handleSize = Math.min(0.9, rect.w / 3, rect.h / 3);
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
              <text
                x={rect.x + rect.w / 2}
                y={rect.y + rect.h / 2}
                fill="#F2F4F7"
                fontSize={item.type === "pool" ? 0.7 : 0.6}
                fontWeight={700}
                textAnchor="middle"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {item.label}
              </text>

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
