import {
  Box,
  Button,
  Paper,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { HOUR_OPTIONS, PROPERTIES, type PropertyId } from "../config/properties";

export type PropertyMode = PropertyId | "both";

interface ScenarioControlsProps {
  hoursPerDay: number;
  onHoursChange: (h: number) => void;
  propertyMode: PropertyMode;
  onPropertyModeChange: (m: PropertyMode) => void;
  poolLarge: number;
  onPoolLargeChange: (n: number) => void;
  ps5Large: number;
  onPs5LargeChange: (n: number) => void;
  carromLarge: number;
  onCarromLargeChange: (n: number) => void;
}

const PRESETS = [
  { label: "Low utilization", hours: 3 },
  { label: "Moderate", hours: 5 },
  { label: "Good", hours: 7 },
  { label: "Strong", hours: 9 },
  { label: "Full day", hours: 12 },
];

export function ScenarioControls({
  hoursPerDay,
  onHoursChange,
  propertyMode,
  onPropertyModeChange,
  poolLarge,
  onPoolLargeChange,
  ps5Large,
  onPs5LargeChange,
  carromLarge,
  onCarromLargeChange,
}: ScenarioControlsProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, md: 3.5 },
        borderRadius: 4,
        background:
          "linear-gradient(160deg, rgba(57,255,136,0.06), rgba(61,178,255,0.05) 60%, rgba(20,23,28,1))",
      }}
    >
      <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: "0.12em" }}>
        Business Scenario
      </Typography>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={4} sx={{ mt: 1 }}>
        {/* Hours control */}
        <Box sx={{ flex: 1.3, minWidth: 0 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Paid utilization hours/day
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main" }}>
              {hoursPerDay}h
            </Typography>
          </Stack>
          <Slider
            value={hoursPerDay}
            onChange={(_, v) => onHoursChange(v as number)}
            min={2}
            max={12}
            step={1}
            marks={HOUR_OPTIONS.map((h) => ({ value: h, label: String(h) }))}
            valueLabelDisplay="auto"
            sx={{
              mt: 1,
              color: "primary.main",
              "& .MuiSlider-thumb": { boxShadow: "0 0 0 8px rgba(57,255,136,0.15)" },
            }}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", gap: 1 }}>
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                size="small"
                variant={hoursPerDay === p.hours ? "contained" : "outlined"}
                onClick={() => onHoursChange(p.hours)}
                sx={{
                  borderColor: "rgba(255,255,255,0.15)",
                  color: hoursPerDay === p.hours ? "#04140a" : "text.primary",
                }}
              >
                {p.label}
              </Button>
            ))}
          </Stack>
        </Box>

        {/* Property mode */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Property
          </Typography>
          <ToggleButtonGroup
            value={propertyMode}
            exclusive
            onChange={(_, v) => v && onPropertyModeChange(v)}
            fullWidth
            size="small"
          >
            <ToggleButton value="small">{PROPERTIES.small.shortLabel}</ToggleButton>
            <ToggleButton value="large">{PROPERTIES.large.shortLabel}</ToggleButton>
            <ToggleButton value="both">Compare both</ToggleButton>
          </ToggleButtonGroup>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 3, mb: 1, color: "text.secondary" }}>
            Pool tables · {PROPERTIES.small.shortLabel}
          </Typography>
          <ToggleButtonGroup value={3} exclusive size="small" disabled>
            <ToggleButton value={3}>3 (fixed)</ToggleButton>
          </ToggleButtonGroup>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 1, color: "text.secondary" }}>
            Pool tables · {PROPERTIES.large.shortLabel}
          </Typography>
          <ToggleButtonGroup
            value={poolLarge}
            exclusive
            size="small"
            onChange={(_, v) => v && onPoolLargeChange(v)}
          >
            <ToggleButton value={3}>3</ToggleButton>
            <ToggleButton value={4}>4</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* PS5 */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, visibility: { xs: "visible", lg: "hidden" } }}>
            PS5 stations
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "text.secondary" }}>
            PS5 stations · {PROPERTIES.small.shortLabel}
          </Typography>
          <ToggleButtonGroup value={5} exclusive size="small" disabled>
            <ToggleButton value={5}>5 (fixed)</ToggleButton>
          </ToggleButtonGroup>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 1, color: "text.secondary" }}>
            PS5 stations · {PROPERTIES.large.shortLabel}
          </Typography>
          <ToggleButtonGroup
            value={ps5Large}
            exclusive
            size="small"
            onChange={(_, v) => v && onPs5LargeChange(v)}
            sx={{ flexWrap: "wrap" }}
          >
            {[5, 6, 7, 8].map((n) => (
              <ToggleButton key={n} value={n}>
                {n}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Carrom */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, visibility: { xs: "visible", lg: "hidden" } }}>
            Carrom board
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "text.secondary" }}>
            Carrom board · {PROPERTIES.small.shortLabel}
          </Typography>
          <ToggleButtonGroup value={0} exclusive size="small" disabled>
            <ToggleButton value={0}>0 (fixed)</ToggleButton>
          </ToggleButtonGroup>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 1, color: "text.secondary" }}>
            Carrom board · {PROPERTIES.large.shortLabel} (₹100/hr)
          </Typography>
          <ToggleButtonGroup
            value={carromLarge}
            exclusive
            size="small"
            onChange={(_, v) => v !== null && onCarromLargeChange(v)}
          >
            <ToggleButton value={0}>0 (none)</ToggleButton>
            <ToggleButton value={1}>1</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Stack>
    </Paper>
  );
}
