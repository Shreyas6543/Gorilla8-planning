import { Suspense, useEffect, useState } from "react";
import { Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio, Slider } from "@mui/material";
import { Canvas } from "@react-three/fiber";
import { Link as RouterLink } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { WalkthroughScene } from "../components/walkthrough/WalkthroughScene";

export function WalkthroughPage() {
  const [locked, setLocked] = useState(false);
  const [nearSwitch, setNearSwitch] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [lightMode, setLightMode] = useState<"warm" | "white">("warm");
  const [lightIntensity, setLightIntensity] = useState(0.5);

  useEffect(() => {
    const onChange = () => setLocked(Boolean(document.pointerLockElement));
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, []);

  // "E" opens the light switch panel, but only while actually standing
  // near it — same convention as WASD movement (code-based, not key
  // value, so it still works regardless of keyboard layout). Opening it
  // releases the pointer lock so the mouse is free to use the dialog's
  // controls, same as clicking "Back to floor plan" would.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyE" && locked && nearSwitch && !switchOpen) {
        setSwitchOpen(true);
        document.exitPointerLock();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [locked, nearSwitch, switchOpen]);

  return (
    <Box sx={{ width: "100vw", height: "100vh", position: "relative", bgcolor: "#0B0D10", overflow: "hidden" }}>
      {/* fov 40 (was 75, then 55 — both still too wide). Perspective only
          looks life-sized when the camera's vertical FOV roughly matches
          the angle the monitor actually subtends at the viewer's eye —
          sitting ~2ft from a ~14in-tall screen that's only ~33°. Anything
          wider crams more room into the same pixels, which is what made
          the portrait, the pool tables and the gaps between them all read
          smaller than they measure. 40 stays close to that geometric
          ideal while keeping enough peripheral view to walk around with. */}
      <Canvas shadows camera={{ fov: 40, near: 0.1, far: 200 }}>
        <Suspense fallback={null}>
          <WalkthroughScene lightMode={lightMode} lightIntensity={lightIntensity} onNearSwitchChange={setNearSwitch} />
        </Suspense>
      </Canvas>

      <Box sx={{ position: "absolute", top: 16, left: 16 }}>
        <Button
          component={RouterLink}
          to="/floorplan"
          size="small"
          startIcon={<ArrowBackIcon />}
          variant="contained"
          sx={{ color: "#04140a", bgcolor: "rgba(255,255,255,0.9)", "&:hover": { bgcolor: "#fff" } }}
        >
          Back to floor plan
        </Button>
      </Box>

      {!locked && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(0,0,0,0.45)",
            pointerEvents: "none",
          }}
        >
          <Box sx={{ textAlign: "center", px: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#fff", mb: 1 }}>
              Click anywhere to walk in
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.8)" }}>
              WASD or arrow keys to move · mouse to look around · Esc to release the cursor
            </Typography>
          </Box>
        </Box>
      )}

      {locked && (
        <Box
          sx={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            bgcolor: "rgba(0,0,0,0.5)",
            color: "rgba(255,255,255,0.85)",
            px: 2,
            py: 0.75,
            borderRadius: 2,
            fontSize: 13,
            pointerEvents: "none",
          }}
        >
          WASD to move · mouse to look · Esc to release
        </Box>
      )}

      {locked && nearSwitch && !switchOpen && (
        <Box
          sx={{
            position: "absolute",
            bottom: 56,
            left: "50%",
            transform: "translateX(-50%)",
            bgcolor: "rgba(0,0,0,0.6)",
            color: "#fff",
            px: 2,
            py: 0.75,
            borderRadius: 2,
            fontSize: 13,
            fontWeight: 700,
            pointerEvents: "none",
          }}
        >
          Press E for the light switch
        </Box>
      )}

      <Dialog open={switchOpen} onClose={() => setSwitchOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Light switch</DialogTitle>
        <DialogContent>
          <RadioGroup value={lightMode} onChange={(e) => setLightMode(e.target.value as "warm" | "white")}>
            <FormControlLabel value="warm" control={<Radio />} label="Warm strip lighting" />
            <FormControlLabel value="white" control={<Radio />} label="White lighting" />
          </RadioGroup>
          <Typography sx={{ mt: 2, mb: 1 }} variant="body2" color="text.secondary">
            Intensity
          </Typography>
          <Slider value={lightIntensity} onChange={(_, v) => setLightIntensity(v as number)} min={0} max={2} step={0.05} valueLabelDisplay="auto" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSwitchOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>

      <Box
        sx={{
          position: "absolute",
          bottom: 6,
          right: 10,
          fontSize: 10,
          color: "rgba(255,255,255,0.35)",
          pointerEvents: "none",
        }}
      >
        3D models (Poly Pizza): pool table — Evol-Love (CC-BY 3.0) · TV — Alex Safayan (CC-BY 3.0) · bean bag — J-Toastie (CC-BY 3.0) · chair — Quaternius (CC0)
      </Box>
    </Box>
  );
}
