import type { FurnitureItem } from "../config/layout";

// How many revenue-earning stations are actually placed in the venue layout.
// Home's revenue/payback math reads these, so adding or removing a pool
// table or PS5 on the Design page changes the numbers directly.
export interface VenueCounts {
  pool: number;
  ps5: number;
}

export function venueCounts(items: FurnitureItem[]): VenueCounts {
  return {
    pool: items.filter((i) => i.renderType === "pool").length,
    ps5: items.filter((i) => i.renderType === "ps5").length,
  };
}
