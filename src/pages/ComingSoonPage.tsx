import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Button, Chip, Link as MuiLink, Paper, Stack, TextField, Typography } from "@mui/material";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import DirectionsIcon from "@mui/icons-material/Directions";
import RedeemIcon from "@mui/icons-material/Redeem";
import { logQrAction, claimWelcomeCredit, sendWalletWhatsApp, WELCOME_CREDIT, type ClaimResult } from "../lib/qrFunnel";

// Public landing page a banner QR redirects to via api/qr/[banner].ts —
// deliberately standalone (no PageHeader/nav): whoever scans a banner is a
// prospective customer, not someone who should land in the internal admin
// dashboard. Keep the two files' purpose in sync: this page owns the Maps
// link and both trackable actions; the serverless function only logs the
// raw scan and redirects here.
const MAPS_URL = "https://maps.app.goo.gl/2UxvATetoRsutd9y9";

type Phase = "idle" | "working" | "done";

export function ComingSoonPage() {
  const [params] = useSearchParams();
  const bannerId = params.get("banner");
  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [whatsappSent, setWhatsappSent] = useState<boolean | null>(null);
  const [invalid, setInvalid] = useState(false);

  function handleDirections() {
    void logQrAction(bannerId ?? "unknown", "directions");
    window.location.href = MAPS_URL;
  }

  async function handleClaim() {
    setInvalid(false);
    setPhase("working");
    const claim = await claimWelcomeCredit(phone, bannerId);
    if (claim.status === "invalid_phone") {
      setInvalid(true);
      setPhase("idle");
      return;
    }
    setResult(claim);
    if (claim.status === "created") {
      const sent = await sendWalletWhatsApp(claim.wallet.phone, claim.wallet.walletToken);
      setWhatsappSent(sent);
    }
    setPhase("done");
  }

  const walletUrl = result && result.status !== "invalid_phone" && result.status !== "error"
    ? `/wallet/${result.wallet.walletToken}`
    : null;

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

          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
              GORILLA 8
            </Typography>
            <Chip label="Coming Soon" size="small" sx={{ mt: 1, bgcolor: "primary.main", color: "#04140a", fontWeight: 700 }} />
          </Box>

          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            A gaming + pool café opening in RR Nagar, Bengaluru — pool tables, PS5 stations, and more.
          </Typography>

          {/* Primary CTA: claim the welcome credit */}
          <Box sx={{ width: "100%" }}>
            {phase === "done" && result ? (
              <ClaimOutcome result={result} whatsappSent={whatsappSent} walletUrl={walletUrl} />
            ) : (
              <Paper
                elevation={0}
                sx={{
                  width: "100%",
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: "rgba(57,255,136,0.07)",
                  border: "1px solid rgba(57,255,136,0.3)",
                }}
              >
                <Stack spacing={1.5}>
                  <Chip
                    icon={<RedeemIcon sx={{ fontSize: 16 }} />}
                    label="EARLY BIRD OFFER"
                    size="small"
                    sx={{ bgcolor: "rgba(57,255,136,0.18)", color: "#39FF88", fontWeight: 800, alignSelf: "center" }}
                  />
                  <Typography sx={{ fontWeight: 800, fontSize: "1.3rem", lineHeight: 1.25 }}>
                    You found us before we even opened. That's worth ₹{WELCOME_CREDIT}.
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Drop your WhatsApp number and we'll send you a ₹{WELCOME_CREDIT} play credit — show it at the
                    counter on your first visit.
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="tel"
                    placeholder="Your WhatsApp number"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setInvalid(false);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                    error={invalid}
                    helperText={invalid ? "Enter a valid 10-digit mobile number" : " "}
                    sx={{ bgcolor: "rgba(0,0,0,0.2)", borderRadius: 1 }}
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={phase === "working"}
                    onClick={handleClaim}
                    sx={{ color: "#04140a", fontWeight: 800 }}
                  >
                    {phase === "working" ? "Claiming…" : `Claim My ₹${WELCOME_CREDIT} →`}
                  </Button>
                </Stack>
              </Paper>
            )}
          </Box>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<DirectionsIcon />}
            onClick={handleDirections}
            sx={{ borderColor: "rgba(255,255,255,0.2)" }}
          >
            Get Directions
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

function ClaimOutcome({
  result,
  whatsappSent,
  walletUrl,
}: {
  result: ClaimResult;
  whatsappSent: boolean | null;
  walletUrl: string | null;
}) {
  if (result.status === "created") {
    return (
      <Stack spacing={1.5}>
        <Typography sx={{ fontWeight: 800, color: "#39FF88" }}>🎉 You're in!</Typography>
        {whatsappSent ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Check your WhatsApp — we've sent your ₹{WELCOME_CREDIT} wallet link. Show it at the counter on your
            first visit.
          </Typography>
        ) : (
          <>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Your ₹{WELCOME_CREDIT} credit is saved. Here's your wallet — bookmark or screenshot it, show it at
              the counter:
            </Typography>
            {walletUrl && (
              <MuiLink href={walletUrl} sx={{ fontWeight: 700, wordBreak: "break-all" }}>
                {walletUrl}
              </MuiLink>
            )}
          </>
        )}
      </Stack>
    );
  }

  if (result.status === "already_claimed") {
    return (
      <Stack spacing={1.5}>
        <Typography sx={{ fontWeight: 800 }}>You've already claimed your credit 🎮</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          ₹{result.wallet.creditBalance} still available — check the wallet link we sent you earlier, or use it
          below:
        </Typography>
        {walletUrl && (
          <MuiLink href={walletUrl} sx={{ fontWeight: 700, wordBreak: "break-all" }}>
            {walletUrl}
          </MuiLink>
        )}
      </Stack>
    );
  }

  return (
    <Typography variant="body2" sx={{ color: "#FF6B6B" }}>
      Something went wrong on our end — try again in a bit.
    </Typography>
  );
}
