// Single source of truth for all financial assumptions.
// Changing a value here updates every calculation and visualization in the app.

export type PropertyId = "small";

export interface PropertyConfig {
  id: PropertyId;
  name: string;
  shortLabel: string;
  sqft: number;
  rent: number;
  advance: number | null; // null = TBD, not yet specified
  setupInvestment: number;
  remainingCapital: number;
  otherExpenses: number;
  minPool: number;
  maxPool: number;
  minPs5: number;
  maxPs5: number;
  minCarrom: number;
  maxCarrom: number;
  minRacingSim: number;
  maxRacingSim: number;
  accent: string;
  accentSoft: string;
  emoji: string;
}

export const RATE_PER_STATION_PER_HOUR = 200; // ₹ per pool table / PS5 station, per hour
export const RATE_PER_CARROM_PER_HOUR = 100; // ₹ per carrom board, per hour
// Racing simulator rig (steering wheel + pedals setup) — a premium add-on funded
// out of otherwise-idle remaining capital. Priced above plain PS5 (₹200/hr) to
// reflect the added hardware.
export const RATE_PER_RACING_SIM_PER_HOUR = 350; // ₹ per racing simulator rig, per hour
export const OPERATING_DAYS_PER_MONTH = 30;

export const HOUR_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type HourOption = (typeof HOUR_OPTIONS)[number];
export const DEFAULT_HOURS: HourOption = 5;

export const PROPERTIES: Record<PropertyId, PropertyConfig> = {
  small: {
    id: "small",
    name: "1,350 sq ft",
    shortLabel: "1,350 sq ft",
    sqft: 1350,
    rent: 40000,
    advance: 400000,
    setupInvestment: 1500000,
    remainingCapital: 500000,
    otherExpenses: 45000,
    minPool: 3,
    maxPool: 3,
    minPs5: 5,
    maxPs5: 5,
    minCarrom: 0,
    maxCarrom: 0,
    minRacingSim: 0,
    maxRacingSim: 0,
    accent: "#39FF88",
    accentSoft: "rgba(57, 255, 136, 0.14)",
    emoji: "🟢",
  },
};

export function fixedMonthlyExpense(p: PropertyConfig): number {
  return p.rent + p.otherExpenses;
}

// Setup investment + remaining capital sums to the ₹20L total pool of
// available capital — this is what the capital allocation bar visualizes
// (invested vs. remaining, out of the 20L).
export function totalCapitalPool(p: PropertyConfig): number {
  return p.setupInvestment + p.remainingCapital;
}
