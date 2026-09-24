import { useRef, useState } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useAdmin } from "../state/adminAuth";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/expenses", label: "Expenses" },
  { to: "/marketing", label: "Marketing" },
  { to: "/floorplan", label: "Floor Plan" },
  { to: "/design", label: "Design" },
];

const TAP_COUNT_REQUIRED = 5;
const TAP_WINDOW_MS = 3000; // taps must land within this window of each other, or the count resets

interface PageHeaderProps {
  subtitle: string;
}

export function PageHeader({ subtitle }: PageHeaderProps) {
  const location = useLocation();
  const { isAdmin, unlock, lock } = useAdmin();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);

  const handleIconClick = () => {
    if (isAdmin) return; // already admin — nothing to tap into
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= TAP_COUNT_REQUIRED) {
      tapCountRef.current = 0;
      setGateOpen(true);
      return;
    }
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, TAP_WINDOW_MS);
  };

  const handleUnlockSubmit = () => {
    if (unlock(passcodeInput)) {
      setGateOpen(false);
      setPasscodeInput("");
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 0.5, flexWrap: "wrap", rowGap: 1 }}>
        <Box
          onClick={handleIconClick}
          sx={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(57,255,136,0.12)",
            border: "1px solid rgba(57,255,136,0.35)",
            flexShrink: 0,
            cursor: isAdmin ? "default" : "pointer",
            userSelect: "none",
          }}
        >
          <SportsEsportsIcon sx={{ color: "primary.main" }} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
          GORILLA 8
        </Typography>

        <Stack direction="row" spacing={1} sx={{ ml: { sm: 1 }, flexWrap: "wrap", rowGap: 1 }}>
          {NAV_LINKS.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Chip
                key={link.to}
                component={Link}
                to={link.to}
                label={link.label}
                clickable
                size="small"
                sx={{
                  bgcolor: active ? "primary.main" : "rgba(255,255,255,0.08)",
                  color: active ? "#04140a" : "text.primary",
                  fontWeight: 700,
                  "&:hover": { bgcolor: active ? "primary.main" : "rgba(255,255,255,0.15)" },
                }}
              />
            );
          })}
        </Stack>

        {isAdmin && (
          <Chip
            icon={<AdminPanelSettingsIcon sx={{ fontSize: 16 }} />}
            label="Admin — tap to exit"
            onClick={lock}
            clickable
            size="small"
            sx={{ bgcolor: "rgba(255,159,67,0.15)", color: "#FF9F43", fontWeight: 700, ml: { sm: "auto" } }}
          />
        )}
      </Stack>
      <Typography variant="body1" sx={{ color: "text.secondary" }}>
        {subtitle}
      </Typography>

      <Dialog open={gateOpen} onClose={() => setGateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Enter admin passcode</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="Passcode"
            value={passcodeInput}
            onChange={(e) => {
              setPasscodeInput(e.target.value);
              setPasscodeError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUnlockSubmit();
            }}
            error={passcodeError}
            helperText={passcodeError ? "Wrong passcode" : " "}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGateOpen(false)} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button onClick={handleUnlockSubmit} variant="contained" sx={{ color: "#04140a" }}>
            Unlock
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
