import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useAdmin } from "../state/adminAuth";
import { useViewer } from "../state/viewerAuth";
import gorillaIcon from "../assets/gorilla8-icon.png";

// The one entry point past Gate.tsx on a device that's never unlocked
// before — not linked from any nav (PageHeader only renders on pages
// Gate already let through), just a URL to bookmark/share with partners.
// Doesn't need to be a secret path itself (see Gate.tsx's note on why
// route-naming obscurity is moot on a public repo) — the passcode typed
// here is the actual barrier, not the fact that this page is at /team.
//
// Accepts either passcode: the real admin/edit one (-> isAdmin, can also
// edit things site-wide) or the separate, lower-stakes team one (->
// isViewer, view-only). Whichever matches, then back to the real site.
export function TeamAccessPage() {
  const navigate = useNavigate();
  const { unlock } = useAdmin();
  const { unlockViewer } = useViewer();
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit() {
    const ok = unlock(input) || unlockViewer(input);
    if (ok) {
      navigate("/");
    } else {
      setError(true);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper elevation={0} sx={{ p: 4, borderRadius: 4, maxWidth: 360, width: "100%" }}>
        <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center" }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(57,255,136,0.12)",
              border: "1px solid rgba(57,255,136,0.35)",
              overflow: "hidden",
            }}
          >
            <Box component="img" src={gorillaIcon} alt="" sx={{ width: "78%", height: "78%", objectFit: "contain" }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Team access
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Enter your access code to continue.
          </Typography>
          <TextField
            fullWidth
            type="password"
            size="small"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            error={error}
            helperText={error ? "Incorrect code" : " "}
            autoFocus
          />
          <Button fullWidth variant="contained" onClick={handleSubmit} sx={{ color: "#04140a" }}>
            Continue
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
