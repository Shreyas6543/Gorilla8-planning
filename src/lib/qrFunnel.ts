import { supabase, isSupabaseConfigured } from "./supabaseClient";

// The two steps past the raw scan (qr_scans, see qrScans.ts) that happen on
// the /coming-soon landing page: tapping "Get Directions" (qr_actions) and
// submitting a phone number to "Notify me when you open" (leads). Both
// writes and reads live here, unlike qrScans.ts which is read-only — this
// app itself is the writer for these two, same as Ledger/Expenses.

export async function logQrAction(bannerId: string, action: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from("qr_actions").insert({ banner_id: bannerId, action });
  } catch {
    // best-effort — never block the actual button's behavior (opening Maps, etc.) on this
  }
}

// Returns false (rather than throwing) on any failure — missing table,
// network hiccup, bad input — so the landing page can show a clear error
// instead of a silent false "Thanks!".
export async function submitLead(phone: string, bannerId: string | null): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const trimmed = phone.trim();
  if (!trimmed) return false;
  try {
    const { error } = await supabase.from("leads").insert({ phone: trimmed, banner_id: bannerId });
    return !error;
  } catch {
    return false;
  }
}

export interface QrAction {
  bannerId: string;
  action: string;
  createdAt: string;
}

export interface Lead {
  id: number;
  phone: string;
  bannerId: string | null;
  createdAt: string;
}

// Same null-vs-[] convention as qrScans.loadQrScans: null means "table
// missing or unreachable", not "zero rows".
export async function loadQrActions(): Promise<QrAction[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from("qr_actions")
      .select("banner_id, action, created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) return null;
    return (data ?? []).map((r) => ({
      bannerId: typeof r.banner_id === "string" ? r.banner_id : "unknown",
      action: typeof r.action === "string" ? r.action : "unknown",
      createdAt: typeof r.created_at === "string" ? r.created_at : new Date(0).toISOString(),
    }));
  } catch {
    return null;
  }
}

export async function loadLeads(): Promise<Lead[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from("leads")
      .select("id, phone, banner_id, created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) return null;
    return (data ?? []).map((r) => ({
      id: Number(r.id),
      phone: typeof r.phone === "string" ? r.phone : "",
      bannerId: typeof r.banner_id === "string" ? r.banner_id : null,
      createdAt: typeof r.created_at === "string" ? r.created_at : new Date(0).toISOString(),
    }));
  } catch {
    return null;
  }
}
