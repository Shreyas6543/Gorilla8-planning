import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Button, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import DirectionsIcon from "@mui/icons-material/Directions";
import { logQrAction, submitLead } from "../lib/qrFunnel";

// Public landing page a banner QR redirects to via api/qr/[banner].ts —
// deliberately standalone (no PageHeader/nav): whoever scans a banner is a
// prospective customer, not someone who should land in the internal admin
// dashboard. Keep the two files' purpose in sync: this page owns the Maps
// link and both trackable actions; the serverless function only logs the
// raw scan and redirects here.
const MAPS_URL = "https://maps.app.goo.gl/2UxvATetoRsutd9y9";

export function ComingSoonPage() {
  const [params] = useSearchParams();
  const bannerId = params.get("banner");
  const [phone, setPhone] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "done" | "error">("idle");

  function handleDirections() {
    void logQrAction(bannerId ?? "unknown", "directions");
    window.location.href = MAPS_URL;
  }

  async function handleNotifyMe() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setSubmitState("error");
      return;
    }
    setSubmitState("submitting");
    const ok = await submitLead(phone, bannerId);
    setSubmitState(ok ? "done" : "error");
  }

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
            A gaming + pool café opening in RR Nagar, Bengaluru — pool tables, PS5 stations, and more. We're not
            open just yet, but you can see exactly where we'll be, and we'll let you know the moment we are.
          </Typography>

          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<DirectionsIcon />}
            onClick={handleDirections}
            sx={{ color: "#04140a", fontWeight: 700 }}
          >
            Get Directions
          </Button>

          <Box sx={{ width: "100%", borderTop: "1px solid rgba(255,255,255,0.1)", pt: 2.5 }}>
            {submitState === "done" ? (
              <Typography variant="body2" sx={{ color: "#39FF88", fontWeight: 600 }}>
                Thanks! We'll message you the moment we open.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Get notified when we open
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="tel"
                  placeholder="Your WhatsApp / phone number"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (submitState === "error") setSubmitState("idle");
                  }}
                  error={submitState === "error"}
                  helperText={submitState === "error" ? "Enter a valid phone number" : " "}
                />
                <Button
                  fullWidth
                  variant="outlined"
                  disabled={submitState === "submitting"}
                  onClick={handleNotifyMe}
                  sx={{ borderColor: "rgba(255,255,255,0.2)" }}
                >
                  {submitState === "submitting" ? "Sending…" : "Notify me"}
                </Button>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  We'll only use this to tell you about our opening — no spam.
                </Typography>
              </Stack>
            )}
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
