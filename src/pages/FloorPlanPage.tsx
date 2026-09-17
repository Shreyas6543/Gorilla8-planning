import { Box, Button, Container, Grid, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import TuneIcon from "@mui/icons-material/Tune";
import { PageHeader } from "../components/PageHeader";
import { FloorPlanSvg } from "../components/FloorPlanSvg";
import { MetricCard } from "../components/MetricCard";
import { FLOOR_HEIGHT_FT, FLOOR_AREA_SQFT } from "../config/floorplan";
import { LAYOUT_COUNTS } from "../config/layout";
import { PROPERTIES, DEFAULT_HOURS } from "../config/properties";
import { calcScenario, formatINR } from "../lib/calculations";
import { useFurnitureLayout } from "../state/furnitureLayout";

export function FloorPlanPage() {
  const { baseItems } = useFurnitureLayout();
  const layoutResult = calcScenario(PROPERTIES.small, {
    pool: LAYOUT_COUNTS.pool,
    ps5: LAYOUT_COUNTS.ps5,
    carrom: 0,
    racingSim: LAYOUT_COUNTS.racingSim,
    hoursPerDay: DEFAULT_HOURS,
  });

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        backgroundImage:
          "radial-gradient(circle at 15% 0%, rgba(57,255,136,0.07), transparent 45%), radial-gradient(circle at 85% 10%, rgba(61,178,255,0.07), transparent 45%)",
        pb: 8,
      }}
    >
      <Container maxWidth="md" sx={{ pt: { xs: 4, md: 6 } }}>
        <PageHeader subtitle="Candidate space floor plan, reconstructed to scale from the hand-measured sketch." />

        <Stack spacing={3}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
            <MetricCard label="Floor area" value={`${FLOOR_AREA_SQFT.toLocaleString("en-IN")} sq ft`} sublabel="from outer wall boundary" />
            <MetricCard label="Ceiling height" value={`${FLOOR_HEIGHT_FT} ft`} />
            <MetricCard label="Glass wall" value="21.2 ft" sublabel="right side" accent="#3DB2FF" />
          </Box>

          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
              Floor plan (to scale)
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              Bird's-eye view. Every dimension shown matches what was measured — check it against your notebook
              sketch before we go further.
            </Typography>
            <FloorPlanSvg />
          </Paper>

          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
              Suggested layout — {LAYOUT_COUNTS.pool} pool tables, {LAYOUT_COUNTS.ps5} PS5s, 1 racing simulator
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              Pool tables grouped together (sharing clearance between them) rather than isolated in separate
              corners — that alone saves well over 100 sq ft. Counter, storage cabinet, and PS5 5 are stacked
              down the glass wall with real gaps between each — visible on entry, but not one crammed row right
              at the doorway. There's a clear ~4 ft buffer of open floor immediately past the entrance before you
              reach any of them. The racing sim moved out of that column entirely, onto the open floor to the
              left, between the PS5 1-4 cluster and the pool tables. Every PS5 backs onto a real wall for its TV,
              no false walls needed.
            </Typography>
            <FloorPlanSvg showFurniture items={baseItems} />
            <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
              <LegendDot color="#2E7D32" label="Pool table (+ shared clearance zone, dashed)" />
              <LegendDot color="#39FF88" label="PS5 station" />
              <LegendDot color="#FF9F43" label="Racing simulator" />
              <LegendDot color="#9AA4B2" label="Counter" />
              <LegendDot color="#B88A4A" label="Storage cabinet" />
            </Stack>
            <Button
              component={RouterLink}
              to="/design"
              variant="outlined"
              size="small"
              startIcon={<TuneIcon />}
              sx={{ mt: 2, borderColor: "rgba(255,255,255,0.2)" }}
            >
              Customize and see
            </Button>
          </Paper>

          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <MetricCard label="Pool tables" value={String(LAYOUT_COUNTS.pool)} sublabel="minimum, by design" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <MetricCard label="PS5 stations" value={String(LAYOUT_COUNTS.ps5)} sublabel="above the min. of 4" accent="#39FF88" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <MetricCard label="Racing simulator" value="1" accent="#FF9F43" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <MetricCard
                label={`Revenue @ ${DEFAULT_HOURS}h/day`}
                value={formatINR(layoutResult.totalRevenue, { compact: true })}
                sublabel="matches the Home page"
                accent="#39FF88"
              />
            </Grid>
          </Grid>

          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: "1px solid rgba(255,107,107,0.3)" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: "#FF6B6B" }}>
              Still approximate — please check
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                • The two beams (marked in red) are placed and sized roughly — their exact position along the wall
                and exact protrusion into the room aren't fully confirmed yet. Fine for a first look; worth pinning
                down before deciding furniture placement right next to either one.
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                • The order of wall segments right before the glass wall (11.6 ft → entrance → 2.4 ft) is my best
                read of where things sit in your sketch, not something you explicitly re-confirmed — check the
                drawing lines up with what you meant.
              </Typography>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
              What's next
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              This layout is computed, not yet draggable — dragging furniture around interactively is still to
              come. In the meantime, walk through it in 3D first-person, at real scale.
            </Typography>
            <Button
              component={RouterLink}
              to="/walkthrough"
              variant="contained"
              startIcon={<ViewInArIcon />}
              sx={{ color: "#04140a" }}
            >
              Enter 3D walkthrough
            </Button>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
      <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
    </Stack>
  );
}
