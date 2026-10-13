import { Suspense, useEffect, useRef, useState } from "react";
import { Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio, Slider } from "@mui/material";
import { Canvas } from "@react-three/fiber";
import { Link as RouterLink } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { WalkthroughScene } from "../components/walkthrough/WalkthroughScene";
import { DEFAULT_EYE_HEIGHT_FT, DEFAULT_FOV } from "../lib/room3d";
import { useIsTouchDevice, useIsLandscape, tryLockLandscape, VirtualJoystick, TouchLookArea } from "../components/walkthrough/MobileControls";

const VIEW_KEY = "gorilla8-walkthrough-view-v1";

function loadViewSettings(): { fov: number; eyeHeight: number } {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return { fov: DEFAULT_FOV, eyeHeight: DEFAULT_EYE_HEIGHT_FT };
    const parsed = JSON.parse(raw) as Partial<{ fov: number; eyeHeight: number }>;
    return {
      fov: typeof parsed.fov === "number" ? parsed.fov : DEFAULT_FOV,
      eyeHeight: typeof parsed.eyeHeight === "number" ? parsed.eyeHeight : DEFAULT_EYE_HEIGHT_FT,
    };
  } catch {
    return { fov: DEFAULT_FOV, eyeHeight: DEFAULT_EYE_HEIGHT_FT };
  }
}

export function WalkthroughPage() {
  const [locked, setLocked] = useState(false);
  // How big the room/furniture look is inherently viewer-dependent — it
  // depends on your actual screen size and how far you sit from it, which
  // this app has no way to know. Rather than chase one "correct" FOV for
  // everyone (already tried 75 -> 55 -> 40, still wrong for some setups),
  // this is a personal, per-browser calibration you tune once and it's
  // remembered — same "local only, not synced" rule as the Design sandbox.
  const [viewOpen, setViewOpen] = useState(false);
  const [view, setView] = useState(loadViewSettings);
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(view));
    } catch {
      // best-effort only
    }
  }, [view]);
  const [nearSwitch, setNearSwitch] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [lightMode, setLightMode] = useState<"warm" | "white">("warm");
  const [lightIntensity, setLightIntensity] = useState(0.5);
  const isTouch = useIsTouchDevice();
  const isLandscape = useIsLandscape();
  // Touch has no pointer-lock concept at all, so it needs its own "has
  // the player actually started walking" flag instead of piggybacking on
  // `locked` — tapping the start prompt both sets this and fires the
  // best-effort landscape lock (has to happen on a real user gesture;
  // browsers refuse silently otherwise).
  const [touchStarted, setTouchStarted] = useState(false);
  const touchMoveInput = useRef({ x: 0, y: 0 });
  const touchLookDelta = useRef({ dx: 0, dy: 0 });

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

  const showRotatePrompt = isTouch && !isLandscape;
  const showTouchStartPrompt = isTouch && isLandscape && !touchStarted;
  const showTouchControls = isTouch && isLandscape && touchStarted;

  return (
    <Box sx={{ width: "100vw", height: "100vh", position: "relative", bgcolor: "#0B0D10", overflow: "hidden" }}>
      {/* No single FOV looks life-sized for everyone — it depends on the
          viewer's actual screen size and distance, which the app can't
          know (already tried 75 -> 55 -> 40 as one-size-fits-all and it
          still read too spacious for some setups). fov/eyeHeight are now
          a personal per-browser setting instead — see "View settings". */}
      <Canvas shadows camera={{ fov: view.fov, near: 0.1, far: 200 }}>
        <Suspense fallback={null}>
          <WalkthroughScene
            lightMode={lightMode}
            lightIntensity={lightIntensity}
            fov={view.fov}
            eyeHeight={view.eyeHeight}
            onNearSwitchChange={setNearSwitch}
            touchMoveInput={isTouch ? touchMoveInput : undefined}
            touchLookDelta={isTouch ? touchLookDelta : undefined}
          />
        </Suspense>
      </Canvas>

      {/* Touch look-drag area — the whole screen behind everything else
          here, at a low z-index so the buttons/dialogs below (which don't
          set one, so default to sitting above it in DOM order) and the
          joystick (which stops its own touches from bubbling this far)
          still get their taps. Only mounted once the player's actually
          walking, same gating as the joystick — no point capturing drags
          under the start/rotate prompts. */}
      {showTouchControls && (
        <Box sx={{ position: "absolute", inset: 0, zIndex: 1 }}>
          <TouchLookArea onDelta={(dx, dy) => (touchLookDelta.current = { dx, dy })} />
        </Box>
      )}

      <Box sx={{ position: "absolute", top: 16, left: 16, zIndex: 10 }}>
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

      <Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}>
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            setViewOpen(true);
            if (document.pointerLockElement) document.exitPointerLock();
          }}
          sx={{ color: "#04140a", bgcolor: "rgba(255,255,255,0.9)", "&:hover": { bgcolor: "#fff" } }}
        >
          View settings
        </Button>
      </Box>

      {showRotatePrompt && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(0,0,0,0.9)",
          }}
        >
          <Box sx={{ textAlign: "center", px: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#fff", mb: 1 }}>
              Rotate your device
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.8)" }}>Turn to landscape to walk through in 3D</Typography>
          </Box>
        </Box>
      )}

      {showTouchStartPrompt && (
        <Box
          onClick={() => {
            setTouchStarted(true);
            void tryLockLandscape();
          }}
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(0,0,0,0.45)",
          }}
        >
          <Box sx={{ textAlign: "center", px: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#fff", mb: 1 }}>
              Tap to walk in
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.8)" }}>Left joystick to move · drag anywhere else to look around</Typography>
          </Box>
        </Box>
      )}

      {!isTouch && !locked && (
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

      {!isTouch && locked && (
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

      {showTouchControls && <VirtualJoystick onChange={(v) => (touchMoveInput.current = v)} />}

      {nearSwitch && !switchOpen && ((!isTouch && locked) || showTouchControls) && (
        <Box
          sx={{
            position: "absolute",
            bottom: isTouch ? "auto" : 56,
            top: isTouch ? 16 : "auto",
            left: "50%",
            transform: "translateX(-50%)",
            bgcolor: "rgba(0,0,0,0.6)",
            color: "#fff",
            px: 2,
            py: 0.75,
            borderRadius: 2,
            fontSize: 13,
            fontWeight: 700,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            pointerEvents: isTouch ? "auto" : "none",
          }}
        >
          {isTouch ? (
            <>
              <span>Light switch nearby</span>
              <Button
                size="small"
                variant="contained"
                onClick={() => setSwitchOpen(true)}
                sx={{ color: "#04140a", bgcolor: "rgba(255,255,255,0.9)", "&:hover": { bgcolor: "#fff" } }}
              >
                Open
              </Button>
            </>
          ) : (
            "Press E for the light switch"
          )}
        </Box>
      )}

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>View settings</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            How big the room looks depends on your own screen and how far you sit from it — tune these until it looks life-sized to you. Remembered on this device.
          </Typography>
          <Typography sx={{ mt: 2, mb: 1 }} variant="body2" color="text.secondary">
            Field of view ({view.fov}°)
          </Typography>
          <Slider
            value={view.fov}
            onChange={(_, v) => setView((s) => ({ ...s, fov: v as number }))}
            min={25}
            max={65}
            step={1}
            valueLabelDisplay="auto"
          />
          <Typography sx={{ mt: 2, mb: 1 }} variant="body2" color="text.secondary">
            Eye height ({view.eyeHeight.toFixed(1)} ft)
          </Typography>
          <Slider
            value={view.eyeHeight}
            onChange={(_, v) => setView((s) => ({ ...s, eyeHeight: v as number }))}
            min={4.5}
            max={6.5}
            step={0.1}
            valueLabelDisplay="auto"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setView({ fov: DEFAULT_FOV, eyeHeight: DEFAULT_EYE_HEIGHT_FT })} sx={{ color: "text.secondary" }}>
            Reset to default
          </Button>
          <Button onClick={() => setViewOpen(false)} variant="contained" sx={{ color: "#04140a" }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

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
