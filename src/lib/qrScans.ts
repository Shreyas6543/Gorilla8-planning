import { supabase, isSupabaseConfigured } from "./supabaseClient";

// QR banner scan log — read side. Writes happen server-side, in
// api/qr/[banner].ts (a Vercel serverless function, not part of this Vite
// app), on every scan. This file only ever reads qr_scans; it never writes
// to it, unlike the singleton-jsonb tables elsewhere in this app (ledger,
// expenses, etc.) where the dashboard itself is the writer.

export interface QrScan {
  id: number;
  bannerId: string;
  scannedAt: string; // ISO timestamp
  city: string | null;
  region: string | null;
  country: string | null;
  userAgent: string | null;
  referrer: string | null;
}

// Cap how much history one page load pulls back — this is a live scan log,
// not a huge table, but no reason to fetch unbounded rows as it grows.
const MAX_ROWS = 2000;

function normalize(raw: unknown): QrScan[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({
      id: Number(r.id),
      bannerId: typeof r.banner_id === "string" ? r.banner_id : "unknown",
      scannedAt: typeof r.scanned_at === "string" ? r.scanned_at : new Date(0).toISOString(),
      city: typeof r.city === "string" ? r.city : null,
      region: typeof r.region === "string" ? r.region : null,
      country: typeof r.country === "string" ? r.country : null,
      userAgent: typeof r.user_agent === "string" ? r.user_agent : null,
      referrer: typeof r.referrer === "string" ? r.referrer : null,
    }));
}

// Returns `null` (not []) when the table doesn't exist yet or Supabase isn't
// reachable, so the page can show "run the SQL" instead of a false "0 scans".
export async function loadQrScans(): Promise<QrScan[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from("qr_scans")
      .select("id, banner_id, scanned_at, city, region, country, user_agent, referrer")
      .order("scanned_at", { ascending: false })
      .limit(MAX_ROWS);
    if (error) return null;
    return normalize(data);
  } catch {
    return null;
  }
}

export interface BannerCount {
  bannerId: string;
  count: number;
}

export function countsByBanner(scans: QrScan[]): BannerCount[] {
  const counts = new Map<string, number>();
  for (const scan of scans) {
    counts.set(scan.bannerId, (counts.get(scan.bannerId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([bannerId, count]) => ({ bannerId, count }))
    .sort((a, b) => b.count - a.count);
}

// Simple device bucket from the user-agent string, just enough to answer
// "mobile or desktop" — not full device detection.
export function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("android")) return "Android";
  if (ua.includes("mobile")) return "Mobile";
  return "Desktop";
}

export function locationLabel(scan: QrScan): string {
  const parts = [scan.city, scan.region].filter(Boolean);
  if (parts.length) return parts.join(", ");
  return scan.country || "Unknown";
}

// Scans per calendar day (local to the browser viewing the dashboard),
// oldest first — for a simple trend chart. Returns the last `days` days
// even if some had zero scans, so the chart doesn't silently skip gaps.
export function scansByDay(scans: QrScan[], days = 14): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const scan of scans) {
    const day = scan.scannedAt.slice(0, 10); // YYYY-MM-DD
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const result: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return result;
}
