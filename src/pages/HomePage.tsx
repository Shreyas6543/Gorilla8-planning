import { useMemo, useState } from "react";
import { Box, Button, Container, Paper, Slider, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { HOUR_OPTIONS, PROPERTIES, DEFAULT_HOURS } from "../config/properties";
import { calcScenario } from "../lib/calculations";
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
  const [racingSim, setRacingSim] = useState<number>(property.maxRacingSim);

  const result = useMemo(
    () =>
      calcScenario(property, {
        pool: property.minPool,
        ps5: property.minPs5,
        carrom: property.minCarrom,
        racingSim,
        hoursPerDay,
      }),
    [hoursPerDay, racingSim]
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
        <PageHeader subtitle="Your plan: the 1,350 sq ft space. Simple numbers first — the full 2,000 sq ft comparison lives on a separate page." />

        <Stack spacing={3}>
          {/* Why this property + new idea, in plain language */}
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
              Why 1,350 sq ft
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7 }}>
              Lower rent (₹40k vs ₹70k/month), a smaller upfront investment (₹15L vs ₹22L), and it pays back faster
              at most utilization levels — see the{" "}
              <Box
                component={RouterLink}
                to="/comparison"
                sx={{ color: "primary.main", fontWeight: 700, textDecoration: "none" }}
              >
                full comparison
              </Box>{" "}
              for the numbers behind that call.
            </Typography>
            <Typography sx={{ color: "text.secondary", lineHeight: 1.7, mt: 1.5 }}>
              <b style={{ color: "#F2F4F7" }}>New idea:</b> 1,350 sq ft leaves ₹15L of capital sitting unused. One
              racing simulator rig (steering wheel + pedals) can turn part of that idle capital into extra revenue —
              at <b style={{ color: "#F2F4F7" }}>₹350/hour</b>, well above a plain PS5 station's ₹200/hour. Toggle it
              below to see the effect.
            </Typography>
          </Paper>

          {/* Controls: hours + racing sim */}
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

            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline", mt: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Racing simulator (new idea, ₹350/hr)
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button
                size="small"
                variant={racingSim === 0 ? "contained" : "outlined"}
                onClick={() => setRacingSim(0)}
                sx={{ color: racingSim === 0 ? "#04140a" : "text.primary", borderColor: "rgba(255,255,255,0.15)" }}
              >
                Off
              </Button>
              <Button
                size="small"
                variant={racingSim === 1 ? "contained" : "outlined"}
                onClick={() => setRacingSim(1)}
                sx={{ color: racingSim === 1 ? "#04140a" : "text.primary", borderColor: "rgba(255,255,255,0.15)" }}
              >
                On (1 rig)
              </Button>
            </Stack>
          </Paper>

          {/* The full picture for 1,350 sq ft */}
          <PropertyCard
            property={property}
            result={result}
            pool={property.minPool}
            ps5={property.minPs5}
            carrom={property.minCarrom}
            racingSim={racingSim}
            showBreakdown
          />

          <SinglePropertyChart hoursPerDay={hoursPerDay} racingSim={racingSim} />

          <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Capital in play
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              ₹15L goes into setup; the rest stays in reserve — the racing simulator idea is a way to put some of that
              reserve to work.
            </Typography>
            <CapitalBar property={property} />
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
              Want to see how this stacks up against the 2,000 sq ft option, with all the same controls?
            </Typography>
            <Button
              component={RouterLink}
              to="/comparison"
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{ color: "#04140a" }}
            >
              Open full comparison
            </Button>
          </Paper>

          <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center", pt: 1 }}>
            Gaming revenue model — excludes food, memberships, taxes and variable costs. ₹200/hour per pool/PS5
            station, ₹350/hour per racing simulator rig. "Operating surplus" is revenue minus stated fixed expenses
            only — not net profit.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
