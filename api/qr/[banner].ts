// Vercel serverless function — NOT part of the Vite app, not type-checked by
// `tsc -b` (tsconfig.app.json only includes "src"), so no @vercel/node
// dependency needed just for request/response types. See "QR banner scan
// tracking" in CLAUDE.md for the full picture.
//
// A banner's QR code encodes a URL like /api/qr/shop instead of the Google
// Maps link directly. That lets this function log the scan (which banner,
// when, coarse location, device) before redirecting on to Maps — pointing
// the QR straight at Maps would give us zero data, since Google owns that
// redirect, not us.
import { createClient } from "@supabase/supabase-js";

// Destination every banner QR ultimately lands on. Hardcoded rather than a
// new Vercel env var — this is a fixed venue address, not a secret, and
// avoids a manual "add env var in Vercel dashboard" step for something this
// static. Update here if the venue location link ever changes.
const MAPS_URL = "https://maps.app.goo.gl/2UxvATetoRsutd9y9";

// Reuses the same two env vars the Vite client already uses (see
// src/lib/supabaseClient.ts) — the VITE_ prefix only matters for Vite's
// client-side bundling step, Vercel injects env vars into serverless
// functions regardless of prefix. Anon key is fine server-side too: RLS is
// disabled on every table in this project by design (see CLAUDE.md).
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function headerValue(headers: Record<string, string | string[] | undefined>, key: string): string | null {
  const raw = headers[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function handler(req: any, res: any) {
  const bannerParam = req.query?.banner;
  const bannerId = (Array.isArray(bannerParam) ? bannerParam[0] : bannerParam) || "unknown";

  // Log first, but never let a logging failure (missing table, network
  // hiccup, Supabase not configured) block the redirect — the person
  // scanning the banner should always reach Maps.
  if (supabase) {
    try {
      await supabase.from("qr_scans").insert({
        banner_id: bannerId,
        // Vercel's edge network sets these automatically on every request in
        // production, no code/config needed to turn them on. IP-derived,
        // city-level only — not GPS, no permission prompt. Absent in local
        // dev (`vercel dev`) and on some edge cases; qrScans.ts treats
        // missing geo as "unknown" rather than failing.
        city: headerValue(req.headers, "x-vercel-ip-city"),
        region: headerValue(req.headers, "x-vercel-ip-country-region"),
        country: headerValue(req.headers, "x-vercel-ip-country"),
        user_agent: headerValue(req.headers, "user-agent"),
        referrer: headerValue(req.headers, "referer"),
      });
    } catch {
      // swallow — see comment above
    }
  }

  res.writeHead(302, { Location: MAPS_URL });
  res.end();
}
