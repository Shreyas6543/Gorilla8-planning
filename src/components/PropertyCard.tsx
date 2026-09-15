import { Box, Divider, Grid, Paper, Stack, Typography, Chip } from "@mui/material";
import type { PropertyConfig } from "../config/properties";
import { fixedMonthlyExpense } from "../config/properties";
import { formatINR, formatMonths, type ScenarioResult } from "../lib/calculations";
import { MetricCard } from "./MetricCard";

interface PropertyCardProps {
  property: PropertyConfig;
  result: ScenarioResult;
  pool: number;
  ps5: number;
  carrom: number;
  racingSim: number;
  featured?: boolean;
  dimmed?: boolean;
  showBreakdown?: boolean;
}

export function PropertyCard({
  property,
  result,
  pool,
  ps5,
  carrom,
  racingSim,
  featured,
  dimmed,
  showBreakdown,
}: PropertyCardProps) {
  const capacityLabel = (min: number, max: number) => (min === max ? `${min}` : `${min}–${max}`);

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, md: 3.5 },
        borderRadius: 4,
        height: "100%",
        border: `1px solid ${property.accent}${featured ? "66" : "26"}`,
        background: `linear-gradient(160deg, ${property.accentSoft}, rgba(20,23,28,1) 55%)`,
        opacity: dimmed ? 0.55 : 1,
        transition: "opacity 0.25s, transform 0.25s",
        transform: featured ? "scale(1.01)" : "none",
        boxShadow: featured ? `0 0 40px -10px ${property.accent}55` : "none",
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
        <Typography sx={{ fontSize: "1.8rem" }}>{property.emoji}</Typography>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: property.accent, lineHeight: 1.1 }}>
            {property.name}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Property option
          </Typography>
        </Box>
      </Stack>

      {/* Static property facts */}
      <Grid container spacing={1.5} sx={{ mb: 1 }}>
        <Grid size={6}>
          <MetricCard label="Rent" value={formatINR(property.rent, { compact: true })} sublabel="/month" size="sm" />
        </Grid>
        <Grid size={6}>
          <MetricCard
            label="Advance"
            value={property.advance === null ? "TBD" : formatINR(property.advance, { compact: true })}
            sublabel={property.advance === null ? "Not finalized yet" : "one-time"}
            size="sm"
          />
        </Grid>
        <Grid size={6}>
          <MetricCard
            label="Initial investment"
            value={formatINR(property.setupInvestment, { compact: true })}
            sublabel="setup capital"
            size="sm"
          />
        </Grid>
        <Grid size={6}>
          <MetricCard
            label="Remaining capital"
            value={formatINR(property.remainingCapital, { compact: true })}
            sublabel="kept in reserve"
            size="sm"
          />
        </Grid>
      </Grid>

      <MetricCard
        label="Monthly fixed expense"
        value={formatINR(fixedMonthlyExpense(property), { compact: true })}
        sublabel={`₹${property.rent.toLocaleString("en-IN")} rent + ₹${property.otherExpenses.toLocaleString("en-IN")} other`}
        size="sm"
      />

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Chip label={`🎱 Pool ${capacityLabel(property.minPool, property.maxPool)}`} size="small" variant="outlined" />
        <Chip label={`🎮 PS5 ${capacityLabel(property.minPs5, property.maxPs5)}`} size="small" variant="outlined" />
        <Chip
          label={`🟤 Carrom ${capacityLabel(property.minCarrom, property.maxCarrom)}`}
          size="small"
          variant="outlined"
        />
        <Chip
          label={`🏎️ Racing sim ${capacityLabel(property.minRacingSim, property.maxRacingSim)}`}
          size="small"
          variant="outlined"
        />
      </Stack>

      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        Current scenario: {pool} pool table{pool !== 1 ? "s" : ""} · {ps5} PS5 station{ps5 !== 1 ? "s" : ""}
        {carrom > 0 ? ` · ${carrom} carrom board (₹100/hr)` : ""}
        {racingSim > 0 ? ` · ${racingSim} racing sim rig (₹350/hr)` : ""}
      </Typography>

      {showBreakdown && (
        <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricCard label="Pool revenue" value={formatINR(result.poolRevenue, { compact: true })} size="sm" />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <MetricCard label="PS5 revenue" value={formatINR(result.ps5Revenue, { compact: true })} size="sm" />
          </Grid>
          {carrom > 0 && (
            <Grid size={{ xs: 6, sm: 3 }}>
              <MetricCard
                label="Carrom revenue"
                value={formatINR(result.carromRevenue, { compact: true })}
                size="sm"
              />
            </Grid>
          )}
          {racingSim > 0 && (
            <Grid size={{ xs: 6, sm: 3 }}>
              <MetricCard
                label="Racing sim revenue"
                value={formatINR(result.racingSimRevenue, { compact: true })}
                sublabel="new idea"
                accent={property.accent}
                size="sm"
              />
            </Grid>
          )}
        </Grid>
      )}

      <Grid container spacing={1.5} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <MetricCard
            label="Monthly gaming revenue"
            value={formatINR(result.totalRevenue, { compact: true })}
            accent={property.accent}
            size="lg"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <MetricCard
            label="Operating surplus"
            value={formatINR(result.operatingSurplus, { compact: true })}
            sublabel="before variable costs/tax"
            accent={result.operatingSurplus >= 0 ? property.accent : "#FF6B6B"}
            size="lg"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <MetricCard
            label="Annual operating surplus"
            value={formatINR(result.annualOperatingSurplus, { compact: true })}
            size="md"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <MetricCard
            label="Capital payback"
            value={result.paybackMonths !== null ? formatMonths(result.paybackMonths) : "—"}
            sublabel={result.paybackMonths !== null ? "estimated" : "surplus not positive"}
            size="md"
          />
        </Grid>
      </Grid>
    </Paper>
  );
}
