import { Suspense, useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Canvas } from "@react-three/fiber";
import { Link as RouterLink } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { WalkthroughScene } from "../components/walkthrough/WalkthroughScene";

export function WalkthroughPage() {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const onChange = () => setLocked(Boolean(document.pointerLockElement));
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, []);

  return (
    <Box sx={{ width: "100vw", height: "100vh", position: "relative", bgcolor: "#0B0D10", overflow: "hidden" }}>
      <Canvas shadows camera={{ fov: 75, near: 0.1, far: 200 }}>
        <Suspense fallback={null}>
          <WalkthroughScene />
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
        3D models (CC-BY 3.0, Poly Pizza): pool table — Evol-Love · TV — Alex Safayan · bean bag — J-Toastie
      </Box>
    </Box>
  );
}
