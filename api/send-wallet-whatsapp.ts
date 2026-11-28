// Vercel serverless function — NOT part of the Vite app, not type-checked by
// `tsc -b` (see api/qr/[banner].ts for the same note). Called from
// src/lib/qrFunnel.ts: sendWalletWhatsApp() right after a wallet is
// created, to deliver the /wallet/<token> link over WhatsApp.
//
// STATUS AS OF 2026-11-28: going direct with Meta's own Cloud API (no
// third-party BSP) — business number +91 82969 62200, migrated off the
// WhatsApp Business app per Shreyas's call. Template `gorilla8_wallet_link`
// (Utility category, English) uses a NAMED variable `{{link}}`, not a
// positional `{{1}}` — that's why the request below references it by
// `parameter_name`, not just position. Until
// WHATSAPP_API_URL/WHATSAPP_API_TOKEN/WHATSAPP_PHONE_NUMBER_ID/
// WHATSAPP_TEMPLATE_NAME are all set as Vercel env vars (and the template
// is actually approved — it was "In review" as of this writing), this
// returns { sent: false } and the landing page falls back to showing the
// wallet link on-screen instead — the feature works end-to-end either way,
// this just upgrades delivery once configured.
//
// Written against Meta's official WhatsApp Cloud API request shape. If a
// different provider ever replaces this, only the fetch() call below needs
// to change — everything else in this file (and the rest of the app)
// depends on the HTTP contract (POST phone+walletToken -> {sent: boolean}),
// not on Meta specifically.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Same relative-path reasoning as api/qr/[banner].ts's LANDING_PATH — works
// on preview deployments too, not just the pinned production domain.
function walletLink(req: any, token: string): string {
  const host = req.headers?.host ?? "gorilla8-planning.vercel.app";
  return `https://${host}/wallet/${encodeURIComponent(token)}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ sent: false, reason: "method_not_allowed" });
    return;
  }

  const { phone, walletToken } = req.body ?? {};
  if (typeof phone !== "string" || typeof walletToken !== "string" || !phone || !walletToken) {
    res.status(400).json({ sent: false, reason: "bad_request" });
    return;
  }

  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME; // e.g. "gorilla8_wallet_link"

  if (!apiUrl || !apiToken || !phoneNumberId || !templateName) {
    // Not configured yet — tell the caller plainly rather than pretending.
    res.status(200).json({ sent: false, reason: "not_configured" });
    return;
  }

  const link = walletLink(req, walletToken);

  try {
    const waResponse = await fetch(`${apiUrl}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: `91${phone}`, // India country code — phone is already the normalized 10-digit form
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" }, // template's language is plain "English" in WhatsApp Manager, which maps to "en" (not "en_US")
          // Named parameter, not positional — gorilla8_wallet_link's body
          // uses {{link}}, and Meta's API requires named variables to be
          // referenced by parameter_name rather than just array position.
          components: [{ type: "body", parameters: [{ type: "text", parameter_name: "link", text: link }] }],
        },
      }),
    });

    const ok = waResponse.ok;

    // Best-effort log so a failed send is visible somewhere, without
    // blocking the response on it.
    if (supabase) {
      void supabase.from("qr_actions").insert({
        banner_id: "whatsapp",
        action: ok ? "wallet_whatsapp_sent" : "wallet_whatsapp_failed",
      });
    }

    res.status(200).json({ sent: ok });
  } catch {
    res.status(200).json({ sent: false, reason: "provider_error" });
  }
}
