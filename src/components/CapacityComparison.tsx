import { Box, Grid, Paper, Stack, Typography } from "@mui/material";
import { PROPERTIES } from "../config/properties";

function CapacityCard({ property }: { property: (typeof PROPERTIES)[keyof typeof PROPERTIES] }) {
  const range = (min: number, max: number) => (min === max ? `${min}` : `${min}–${max}`);
  const minTotal = property.minPool + property.minPs5;
  const maxTotal = property.maxPool + property.maxPs5;

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: `1px solid ${property.accent}33`,
        bgcolor: property.accentSoft,
        height: "100%",
      }}
    >
      <Typography sx={{ fontWeight: 800, color: property.accent, mb: 1.5 }}>
        {property.emoji} {property.name}
      </Typography>
      <Stack spacing={1.25}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Typography>🎱 Pool tables</Typography>
          <Typography sx={{ fontWeight: 800 }}>{range(property.minPool, property.maxPool)}</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Typography>🎮 PS5 stations</Typography>
          <Typography sx={{ fontWeight: 800 }}>{range(property.minPs5, property.maxPs5)}</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Typography>🟤 Carrom boards (₹100/hr)</Typography>
          <Typography sx={{ fontWeight: 800 }}>{range(property.minCarrom, property.maxCarrom)}</Typography>
        </Stack>
      </Stack>
      <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Total pool + PS5 stations
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {minTotal === maxTotal ? minTotal : `${minTotal}–${maxTotal}`}
        </Typography>
      </Box>
    </Box>
  );
}

export function CapacityComparison() {
  return (
    <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        Gaming capacity
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        The 2,000 sq ft option's minimum configuration ({PROPERTIES.large.minPool + PROPERTIES.large.minPs5} stations)
        matches 1,350 sq ft's fixed capacity exactly — its advantage is the room to expand up to{" "}
        {PROPERTIES.large.maxPool + PROPERTIES.large.maxPs5} stations.
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <CapacityCard property={PROPERTIES.small} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <CapacityCard property={PROPERTIES.large} />
        </Grid>
      </Grid>
    </Paper>
  );
}
