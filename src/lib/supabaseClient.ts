import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Publishable/anon key only — safe to ship in the client bundle. Row Level
// Security on the underlying tables (or lack thereof, by design here — see
// CLAUDE.md) governs what this key can actually do.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = Boolean(supabase);
