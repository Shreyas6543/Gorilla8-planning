import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { getWalletByToken, type Wallet } from "../lib/qrFunnel";

// Public, no PageHeader — same reasoning as ComingSoonPage.tsx: whoever has
// this link is a prospective customer, shown their own wallet via an
// unguessable token in the URL (not a login), not dashboard-admin material.
// This is the page a customer shows at the counter; see RedeemPage.tsx for
// the admin-side counterpart that actually deducts credit.
export function WalletPage() {
  const { token } = useParams<{ token: string }>();
  const [wallet, setWallet] = useState<Wallet | null | "loading">("loading");

  useEffect(() => {
    if (!token) {
      setWallet(null);
      return;
    }
    getWalletByToken(token).then(setWallet);
  }, [token]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        backgroundImage:
          "radial-gradient(circle at 15% 0%, rgba(57,255,136,0.1), transparent 45%), radial-gradient(circle at 85% 15%, rgba(61,178,255,0.1), transparent 45%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 4, maxWidth: 420, width: "100%" }}>
        <Stack spacing={2.5} sx={{ alignItems: "center", textAlign: "center" }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(57,255,136,0.12)",
              border: "1px solid rgba(57,255,136,0.35)",
            }}
          >
            <SportsEsportsIcon sx={{ color: "primary.main", fontSize: 28 }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            GORILLA 8 WALLET
          </Typography>

          {wallet === "loading" && <Typography sx={{ color: "text.secondary" }}>Loading…</Typography>}

          {wallet === null && (
            <>
              <Chip label="Not found" size="small" sx={{ bgcolor: "rgba(255,107,107,0.15)", color: "#FF6B6B", fontWeight: 700 }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                This wallet link doesn't match anything — double check the link, or claim a new one from the page
                you scanned.
              </Typography>
            </>
          )}

          {wallet && wallet !== "loading" && (
            <>
              <Typography sx={{ fontSize: "3rem", fontWeight: 800, color: "#39FF88", lineHeight: 1 }}>
                ₹{wallet.creditBalance}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {wallet.creditBalance > 0
                  ? "available to redeem"
                  : "fully redeemed — thanks for stopping by!"}
              </Typography>

              {wallet.creditBalance > 0 && (
                <Box sx={{ width: "100%", borderTop: "1px solid rgba(255,255,255,0.1)", pt: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Show this screen at the counter
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Linked to {maskPhone(wallet.phone)} — we'll redeem it against your session.
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return phone;
  return `••••••${phone.slice(-4)}`;
}
