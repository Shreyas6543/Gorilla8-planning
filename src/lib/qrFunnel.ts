import { supabase, isSupabaseConfigured } from "./supabaseClient";

// The steps past the raw scan (qr_scans, see qrScans.ts) that happen on the
// /coming-soon landing page and beyond: tapping "Get Directions"
// (qr_actions), claiming the ₹100 welcome credit (leads — one row = one
// wallet), and redeeming it at the counter (wallet_redemptions). All
// writes and reads live here, unlike qrScans.ts which is read-only — this
// app itself is the writer for these, same as Ledger/Expenses.

export const WELCOME_CREDIT = 100;

export async function logQrAction(bannerId: string, action: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.from("qr_actions").insert({ banner_id: bannerId, action });
  } catch {
    // best-effort — never block the actual button's behavior (opening Maps, etc.) on this
  }
}

// Canonical form stored/looked-up everywhere: exactly 10 digits, no +91/91/0
// prefix, starting 6-9 (the valid first digit for an Indian mobile number).
// Returns null for anything that doesn't fit — the landing page shows a
// format error rather than storing garbage.
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  return null;
}

function randomToken(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface Wallet {
  phone: string;
  bannerId: string | null;
  walletToken: string;
  creditBalance: number;
  createdAt: string;
}

function toWallet(r: Record<string, unknown>): Wallet {
  return {
    phone: typeof r.phone === "string" ? r.phone : "",
    bannerId: typeof r.banner_id === "string" ? r.banner_id : null,
    walletToken: typeof r.wallet_token === "string" ? r.wallet_token : "",
    creditBalance: Number(r.credit_balance) || 0,
    createdAt: typeof r.created_at === "string" ? r.created_at : new Date(0).toISOString(),
  };
}

export type ClaimResult =
  | { status: "created"; wallet: Wallet }
  | { status: "already_claimed"; wallet: Wallet }
  | { status: "invalid_phone" }
  | { status: "error" };

// Validates, checks for an existing wallet (phone is unique — see
// supabase_new_tables.sql), and if new, creates one with the standard
// welcome credit. Does NOT send the WhatsApp message itself — the caller
// (ComingSoonPage.tsx) does that via sendWalletWhatsApp() so the UI can
// show "creating…" vs. "sending…" separately and fall back gracefully if
// the WhatsApp send fails.
export async function claimWelcomeCredit(rawPhone: string, bannerId: string | null): Promise<ClaimResult> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { status: "invalid_phone" };
  if (!isSupabaseConfigured || !supabase) return { status: "error" };

  try {
    const existing = await supabase.from("leads").select("*").eq("phone", phone).maybeSingle();
    if (existing.data) {
      return { status: "already_claimed", wallet: toWallet(existing.data) };
    }

    const wallet_token = randomToken();
    const { data, error } = await supabase
      .from("leads")
      .insert({ phone, banner_id: bannerId, wallet_token, credit_balance: WELCOME_CREDIT })
      .select("*")
      .single();
    if (error || !data) {
      // Could be a race (two tabs claiming the same number at once) hitting
      // the unique constraint — re-check rather than just failing.
      const retry = await supabase.from("leads").select("*").eq("phone", phone).maybeSingle();
      if (retry.data) return { status: "already_claimed", wallet: toWallet(retry.data) };
      return { status: "error" };
    }
    return { status: "created", wallet: toWallet(data) };
  } catch {
    return { status: "error" };
  }
}

export async function getWalletByToken(token: string): Promise<Wallet | null> {
  if (!isSupabaseConfigured || !supabase || !token) return null;
  try {
    const { data, error } = await supabase.from("leads").select("*").eq("wallet_token", token).maybeSingle();
    if (error || !data) return null;
    return toWallet(data);
  } catch {
    return null;
  }
}

export async function getWalletByPhone(rawPhone: string): Promise<Wallet | null> {
  const phone = normalizePhone(rawPhone);
  if (!phone || !isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.from("leads").select("*").eq("phone", phone).maybeSingle();
    if (error || !data) return null;
    return toWallet(data);
  } catch {
    return null;
  }
}

export type RedeemResult = { ok: true; newBalance: number } | { ok: false; reason: "not_found" | "insufficient" | "error" };

// Called from RedeemPage.tsx (admin-only). Re-reads the current balance
// right before writing rather than trusting a value the caller already has
// in state, so two redemptions in quick succession can't both succeed
// against a stale balance.
export async function redeemCredit(rawPhone: string, amount: number): Promise<RedeemResult> {
  const phone = normalizePhone(rawPhone);
  if (!phone || !isSupabaseConfigured || !supabase) return { ok: false, reason: "error" };
  if (!(amount > 0)) return { ok: false, reason: "error" };

  try {
    const { data: current, error: fetchError } = await supabase
      .from("leads")
      .select("credit_balance")
      .eq("phone", phone)
      .maybeSingle();
    if (fetchError || !current) return { ok: false, reason: "not_found" };

    const balance = Number(current.credit_balance) || 0;
    if (amount > balance) return { ok: false, reason: "insufficient" };

    const newBalance = balance - amount;
    const { error: updateError } = await supabase.from("leads").update({ credit_balance: newBalance }).eq("phone", phone);
    if (updateError) return { ok: false, reason: "error" };

    await supabase.from("wallet_redemptions").insert({ phone, amount });
    return { ok: true, newBalance };
  } catch {
    return { ok: false, reason: "error" };
  }
}

// Sends the wallet link over WhatsApp via a serverless function (needs a
// WhatsApp Business API provider's credentials as Vercel env vars — see
// api/send-wallet-whatsapp.ts). Returns false on ANY failure (provider not
// configured yet, API error, network issue) so the landing page can fall
// back to showing the link on-screen rather than leaving the person with
// nothing.
export async function sendWalletWhatsApp(phone: string, walletToken: string): Promise<boolean> {
  try {
    const res = await fetch("/api/send-wallet-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, walletToken }),
    });
    if (!res.ok) return false;
    const body = await res.json().catch(() => null);
    return Boolean(body?.sent);
  } catch {
    return false;
  }
}

export interface QrAction {
  bannerId: string;
  action: string;
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

export interface Lead extends Wallet {
  id: number;
}

export async function loadLeads(): Promise<Lead[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(2000);
    if (error) return null;
    return (data ?? []).map((r) => ({ id: Number(r.id), ...toWallet(r) }));
  } catch {
    return null;
  }
}
