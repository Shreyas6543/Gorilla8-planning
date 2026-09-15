import { useMemo, useState } from "react";
import { Box, Grid, Paper, Slider, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { HOUR_OPTIONS, PROPERTIES, type PropertyId } from "../config/properties";
import { calcScenario, formatINR, formatMonths } from "../lib/calculations";
import { MetricCard } from "./MetricCard";

interface ScenarioSimulatorProps {
  initialHours: number;
}

export function ScenarioSimulator({ initialHours }: ScenarioSimulatorProps) {
  const [propertyId, setPropertyId] = useState<PropertyId>("small");
  const [pool, setPool] = useState(PROPERTIES.small.minPool);
  const [ps5, setPs5] = useState(PROPERTIES.small.minPs5);
  const [carrom, setCarrom] = useState(PROPERTIES.small.maxCarrom);
  const [hours, setHours] = useState(initialHours);

  const property = PROPERTIES[propertyId];

  const handlePropertyChange = (id: PropertyId) => {
    setPropertyId(id);
    setPool(PROPERTIES[id].minPool);
    setPs5(PROPERTIES[id].minPs5);
    setCarrom(PROPERTIES[id].maxCarrom);
  };

  const result = useMemo(
    () => calcScenario(property, { pool, ps5, carrom, hoursPerDay: hours }),
    [property, pool, ps5, carrom, hours]
  );

  const poolOptions = Array.from({ length: property.maxPool - property.minPool + 1 }, (_, i) => property.minPool + i);
  const ps5Options = Array.from({ length: property.maxPs5 - property.minPs5 + 1 }, (_, i) => property.minPs5 + i);
  const carromOptions = Array.from(
    { length: property.maxCarrom - property.minCarrom + 1 },
    (_, i) => property.minCarrom + i
  );

  return (
    <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        Try a Scenario
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        Freely combine a property, station counts, and utilization to see the full financial breakdown.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Property
              </Typography>
              <ToggleButtonGroup
                value={propertyId}
                exclusive
                onChange={(_, v) => v && handlePropertyChange(v)}
                fullWidth
                size="small"
              >
                <ToggleButton value="small">{PROPERTIES.small.shortLabel}</ToggleButton>
                <ToggleButton value="large">{PROPERTIES.large.shortLabel}</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Pool tables
              </Typography>
              <ToggleButtonGroup value={pool} exclusive onChange={(_, v) => v && setPool(v)} size="small">
                {poolOptions.map((n) => (
                  <ToggleButton key={n} value={n}>
                    {n}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                PS5 stations
              </Typography>
              <ToggleButtonGroup value={ps5} exclusive onChange={(_, v) => v && setPs5(v)} size="small" sx={{ flexWrap: "wrap" }}>
                {ps5Options.map((n) => (
                  <ToggleButton key={n} value={n}>
                    {n}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Carrom board (₹100/hr)
              </Typography>
              <ToggleButtonGroup
                value={carrom}
                exclusive
                onChange={(_, v) => v !== null && setCarrom(v)}
                size="small"
                disabled={carromOptions.length <= 1}
              >
                {carromOptions.map((n) => (
                  <ToggleButton key={n} value={n}>
                    {n}
                    {carromOptions.length <= 1 ? " (fixed)" : ""}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Paid hours/day
                </Typography>
                <Typography sx={{ fontWeight: 800, color: "primary.main" }}>{hours}h</Typography>
              </Stack>
              <Slider
                value={hours}
                onChange={(_, v) => setHours(v as number)}
                min={2}
                max={12}
                step={1}
                marks={HOUR_OPTIONS.map((h) => ({ value: h }))}
                valueLabelDisplay="auto"
                sx={{ color: "primary.main" }}
              />
            </Box>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6, sm: 4 }}>
              <MetricCard label="Pool revenue" value={formatINR(result.poolRevenue, { compact: true })} size="sm" />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <MetricCard label="PS5 revenue" value={formatINR(result.ps5Revenue, { compact: true })} size="sm" />
            </Grid>
            {carrom > 0 && (
              <Grid size={{ xs: 6, sm: 4 }}>
                <MetricCard
                  label="Carrom revenue"
                  value={formatINR(result.carromRevenue, { compact: true })}
                  sublabel={`${carrom} board @ ₹100/hr`}
                  size="sm"
                />
              </Grid>
            )}
            <Grid size={{ xs: 6, sm: 4 }}>
              <MetricCard
                label="Total revenue"
                value={formatINR(result.totalRevenue, { compact: true })}
                accent={property.accent}
                size="sm"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <MetricCard label="Fixed cost" value={formatINR(result.fixedExpense, { compact: true })} size="sm" />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <MetricCard
                label="Operating surplus"
                value={formatINR(result.operatingSurplus, { compact: true })}
                sublabel="before variable costs/tax"
                accent={result.operatingSurplus >= 0 ? property.accent : "#FF6B6B"}
                size="sm"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <MetricCard
                label="Annual surplus"
                value={formatINR(result.annualOperatingSurplus, { compact: true })}
                size="sm"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <MetricCard
                label="Payback period"
                value={result.paybackMonths !== null ? formatMonths(result.paybackMonths) : "Not reached"}
                sublabel={`on ${formatINR(property.setupInvestment, { compact: true })} initial investment`}
                size="md"
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Paper>
  );
}
