import { useMemo, useState } from "react";
import { Box, Button, Container, Paper, Slider, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import { HOUR_OPTIONS, PROPERTIES, DEFAULT_HOURS } from "../config/properties";
import { calcScenario, formatINR } from "../lib/calculations";
import { useCapitalStatus } from "../lib/useCapitalStatus";
import { PageHeader } from "../components/PageHeader";
import { PropertyCard } from "../components/PropertyCard";
import { CapitalBar } from "../components/CapitalAllocation";
import { SinglePropertyChart } from "../components/SinglePropertyChart";

const PRESETS = [
  { label: "Low utilization", hours: 3 },
  { label: "Moderate", hours: 5 },
  { label: "Good", hours: 7 },
  { label: "Strong", hours: 9 },
  { label: "Full day", hours: 12 },
];

export function HomePage() {
  const property = PROPERTIES.small;
  const [hoursPerDay, setHoursPerDay] = useState<number>(DEFAULT_HOURS);
  const capital = useCapitalStatus();

  const result = useMemo(
    () =>
      calcScenario(property, {
        pool: property.minPool,
        ps5: property.minPs5,
        carrom: property.minCarrom,
        racingSim: 0,
        hoursPerDay,
      }),
    [hoursPerDay]
  );

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
        <PageHeader subtitle="Your plan: the 1,350 sq ft space — 3 pool tables and 5 PS5 stations." />

        <Stack spacing={3}>
          {/* The plan, in plain language */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: 4,
              border: "1px solid rgba(57,255,136,0.25)",
              background: "linear-gradient(135deg, rgba(57,255,136,0.08), rgba(61,178,255,0.05))",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              The plan
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7 }}>
              1,350 sq ft, ₹40k/month rent, ₹20L total capital — 3 pool tables and 5 PS5 stations to start.
            </Typography>
          </Paper>

          {/* Controls: utilization hours */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: 4,
              background:
                "linear-gradient(160deg, rgba(57,255,136,0.06), rgba(61,178,255,0.05) 60%, rgba(20,23,28,1))",
            }}
          >
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
              onChange={(_, v) => setHoursPerDay(v as number)}
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
                  onClick={() => setHoursPerDay(p.hours)}
                  sx={{
                    borderColor: "rgba(255,255,255,0.15)",
                    color: hoursPerDay === p.hours ? "#04140a" : "text.primary",
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </Stack>
          </Paper>

          {/* The full picture for 1,350 sq ft */}
          <PropertyCard
            property={property}
            result={result}
            pool={property.minPool}
            ps5={property.minPs5}
            carrom={property.minCarrom}
            invested={capital.invested}
            remaining={capital.remaining}
            showBreakdown
          />

          <SinglePropertyChart hoursPerDay={hoursPerDay} />

          <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Capital in play
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              {capital.loaded
                ? `${formatINR(capital.invested, { compact: true })} spent so far, out of a ₹${(capital.totalCapital / 100000).toFixed(0)}L pool.`
                : "Loading actual spend from the Expenses page…"}
            </Typography>
            <CapitalBar property={property} invested={capital.invested} remaining={capital.remaining} />
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3 },
              borderRadius: 4,
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Typography sx={{ color: "text.secondary", mb: 1.5 }}>
              Want to see the actual space this plan is for, to scale?
            </Typography>
            <Button
              component={RouterLink}
              to="/floorplan"
              variant="outlined"
              endIcon={<MapOutlinedIcon />}
              sx={{ borderColor: "rgba(255,255,255,0.2)" }}
            >
              View floor plan
            </Button>
          </Paper>

          <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center", pt: 1 }}>
            Gaming revenue model — excludes food, memberships, taxes and variable costs. ₹200/hour per pool/PS5
            station. "Operating surplus" is revenue minus stated fixed expenses only — not net profit.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
