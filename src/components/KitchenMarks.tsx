import { kitchenOpenings } from "../lib/kitchenGeometry";
import type { FurnitureItem } from "../config/layout";

const RED = "#E53935";
const WHITE = "#F4F1EA";
const STRIPE_FT = 0.5;

// 2D plan markers for a Kitchen: for each service opening, a red/white
// striped band (the awning over the counter slab) plus an arrow pointing
// out of the opening — so it's obvious on the plan which sides are open,
// and how they turn when the kitchen is rotated. Purely decorative
// (pointer-events off) so it never interferes with dragging.
export function KitchenMarks({ item }: { item: FurnitureItem }) {
  return (
    <g style={{ pointerEvents: "none" }}>
      {kitchenOpenings(item).map((o, idx) => {
        const minX = Math.min(o.wall.x1, o.wall.x2, o.outer.x1, o.outer.x2);
        const maxX = Math.max(o.wall.x1, o.wall.x2, o.outer.x1, o.outer.x2);
        const minY = Math.min(o.wall.y1, o.wall.y2, o.outer.y1, o.outer.y2);
        const maxY = Math.max(o.wall.y1, o.wall.y2, o.outer.y1, o.outer.y2);
        const alongX = o.ny !== 0; // opening runs along x when the normal points up/down
        const len = alongX ? maxX - minX : maxY - minY;
        const n = Math.max(2, 2 * Math.round(len / (STRIPE_FT * 2)));
        const sw = len / n;

        // Arrow just outside the counter's outer edge, centred on the opening.
        const ocx = (o.outer.x1 + o.outer.x2) / 2;
        const ocy = (o.outer.y1 + o.outer.y2) / 2;
        const tip = 0.95;
        const base = 0.35;
        const half = 0.5;
        const tx = ocx + o.nx * tip;
        const ty = ocy + o.ny * tip;
        const bx = ocx + o.nx * base;
        const by = ocy + o.ny * base;
        const px = -o.ny;
        const py = o.nx;
        const arrow = `${tx},${ty} ${bx + px * half},${by + py * half} ${bx - px * half},${by - py * half}`;

        return (
          <g key={idx}>
            {Array.from({ length: n }, (_, i) => (
              <rect
                key={i}
                x={alongX ? minX + sw * i : minX}
                y={alongX ? minY : minY + sw * i}
                width={alongX ? sw : maxX - minX}
                height={alongX ? maxY - minY : sw}
                fill={i % 2 === 0 ? RED : WHITE}
                fillOpacity={0.9}
              />
            ))}
            {/* The opening itself, on the kitchen wall line */}
            <line x1={o.wall.x1} y1={o.wall.y1} x2={o.wall.x2} y2={o.wall.y2} stroke="#FFFFFF" strokeWidth={0.14} strokeLinecap="round" />
            <polygon points={arrow} fill={RED} stroke={WHITE} strokeWidth={0.07} strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  );
}
