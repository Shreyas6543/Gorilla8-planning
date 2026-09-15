import {
  OPERATING_DAYS_PER_MONTH,
  RATE_PER_STATION_PER_HOUR,
  RATE_PER_CARROM_PER_HOUR,
  RATE_PER_RACING_SIM_PER_HOUR,
  fixedMonthlyExpense,
  type PropertyConfig,
} from "../config/properties";

export interface ScenarioInput {
  pool: number;
  ps5: number;
  carrom: number;
  racingSim: number;
  hoursPerDay: number;
}

export interface ScenarioResult {
  poolRevenue: number;
  ps5Revenue: number;
  carromRevenue: number;
  racingSimRevenue: number;
  totalRevenue: number;
  fixedExpense: number;
  operatingSurplus: number;
  annualOperatingSurplus: number;
  paybackMonths: number | null; // null when surplus <= 0 (no meaningful payback)
}

export function stationRevenue(
  stationCount: number,
  hoursPerDay: number,
  ratePerHour: number = RATE_PER_STATION_PER_HOUR
): number {
  return stationCount * ratePerHour * hoursPerDay * OPERATING_DAYS_PER_MONTH;
}

export function calcScenario(property: PropertyConfig, input: ScenarioInput): ScenarioResult {
  const poolRevenue = stationRevenue(input.pool, input.hoursPerDay);
  const ps5Revenue = stationRevenue(input.ps5, input.hoursPerDay);
  const carromRevenue = stationRevenue(input.carrom, input.hoursPerDay, RATE_PER_CARROM_PER_HOUR);
  const racingSimRevenue = stationRevenue(input.racingSim, input.hoursPerDay, RATE_PER_RACING_SIM_PER_HOUR);
  const totalRevenue = poolRevenue + ps5Revenue + carromRevenue + racingSimRevenue;
  const fixedExpense = fixedMonthlyExpense(property);
  const operatingSurplus = totalRevenue - fixedExpense;
  const annualOperatingSurplus = operatingSurplus * 12;
  const paybackMonths =
    operatingSurplus > 0 ? property.setupInvestment / operatingSurplus : null;

  return {
    poolRevenue,
    ps5Revenue,
    carromRevenue,
    racingSimRevenue,
    totalRevenue,
    fixedExpense,
    operatingSurplus,
    annualOperatingSurplus,
    paybackMonths,
  };
}

export function formatINR(value: number, opts: { compact?: boolean } = {}): string {
  const negative = value < 0;
  const abs = Math.abs(value);
  let out: string;
  if (opts.compact) {
    if (abs >= 100000) {
      out = `₹${(abs / 100000).toFixed(2).replace(/\.00$/, "")}L`;
    } else if (abs >= 1000) {
      out = `₹${(abs / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    } else {
      out = `₹${abs.toFixed(0)}`;
    }
  } else {
    out = `₹${abs.toLocaleString("en-IN")}`;
  }
  return negative ? `-${out}` : out;
}

export function formatMonths(months: number): string {
  if (months < 1) return `${Math.round(months * 30)} days`;
  const years = Math.floor(months / 12);
  const rem = Math.round(months % 12);
  if (years === 0) return `${rem} mo`;
  if (rem === 0) return `${years} yr`;
  return `${years} yr ${rem} mo`;
}
