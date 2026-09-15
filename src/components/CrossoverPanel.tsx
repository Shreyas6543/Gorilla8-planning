import { Box, Grid, Paper, Stack, Typography } from "@mui/material";
import {
  PROPERTIES,
  fixedMonthlyExpense,
  RATE_PER_STATION_PER_HOUR,
  RATE_PER_CARROM_PER_HOUR,
  OPERATING_DAYS_PER_MONTH,
} from "../config/properties";
import { formatINR } from "../lib/calculations";
import { MetricCard } from "./MetricCard";

interface CrossoverPanelProps {
  hoursPerDay: number;
  poolLarge: number;
  ps5Large: number;
  carromLarge: number;
}

export function CrossoverPanel({ hoursPerDay, poolLarge, ps5Large, carromLarge }: CrossoverPanelProps) {
  const extraFixedCost = fixedMonthlyExpense(PROPERTIES.large) - fixedMonthlyExpense(PROPERTIES.small);
  const extraInvestment = PROPERTIES.large.setupInvestment - PROPERTIES.small.setupInvestment;
  const poolDiff = poolLarge - PROPERTIES.small.minPool;
  const ps5Diff = ps5Large - PROPERTIES.small.minPs5;
  const carromDiff = carromLarge - PROPERTIES.small.minCarrom;
  const extraStations = poolDiff + ps5Diff + carromDiff;
  const extraRevenuePerHourPerDay =
    (poolDiff + ps5Diff) * RATE_PER_STATION_PER_HOUR * OPERATING_DAYS_PER_MONTH +
    carromDiff * RATE_PER_CARROM_PER_HOUR * OPERATING_DAYS_PER_MONTH;

  const crossoverHours =
    extraRevenuePerHourPerDay > 0 ? extraFixedCost / extraRevenuePerHourPerDay : null;

  const extraRevenueNow = extraRevenuePerHourPerDay * hoursPerDay;
  const extraSurplusNow = extraRevenueNow - extraFixedCost;
  const isAheadNow = extraSurplusNow > 0;

  return (
    <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        When does 2,000 sq ft become more attractive?
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        Comparing the extra revenue capacity the larger property unlocks against its extra cost.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard
            label="Additional fixed cost"
            value={`+${formatINR(extraFixedCost, { compact: true })}`}
            sublabel="/month vs. 1,350 sq ft"
            accent="#FF6B6B"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard
            label="Additional initial investment"
            value={`+${formatINR(extraInvestment, { compact: true })}`}
            sublabel="one-time capital"
            accent="#FF6B6B"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricCard
            label="Extra stations selected"
            value={`+${extraStations}`}
            sublabel={`${poolDiff} pool, ${ps5Diff} PS5, +${carromDiff} carrom vs. 1,350 sq ft`}
            accent={extraStations > 0 ? PROPERTIES.large.accent : "#9AA4B2"}
          />
        </Grid>
      </Grid>

      <Box
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: `1px solid ${isAheadNow ? PROPERTIES.large.accent : "#FF6B6B"}55`,
          bgcolor: isAheadNow ? "rgba(61,178,255,0.08)" : "rgba(255,107,107,0.08)",
        }}
      >
        {extraRevenuePerHourPerDay === 0 ? (
          <Typography sx={{ fontWeight: 700 }}>
            With the same station count as 1,350 sq ft (no expansion used) and no carrom board, the 2,000 sq ft
            option only adds {formatINR(extraFixedCost, { compact: true })}/month in cost with no extra revenue — it
            can't become more attractive until you add pool tables or PS5 stations beyond the minimum. Use the
            controls above to simulate expansion.
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            <Typography sx={{ fontWeight: 700 }}>
              With {poolDiff + ps5Diff} extra pool/PS5 station{poolDiff + ps5Diff !== 1 ? "s" : ""}
              {carromDiff > 0 ? ` plus its ${carromDiff} carrom board (₹100/hour)` : ""} in
              play, the 2,000 sq ft option's extra revenue crosses its extra{" "}
              {formatINR(extraFixedCost, { compact: true })}/month cost at roughly{" "}
              <b>{crossoverHours !== null ? crossoverHours.toFixed(1) : "—"} paid hours/day</b>.
            </Typography>
            <Typography sx={{ color: "text.secondary" }}>
              At the selected {hoursPerDay}h/day, that's {formatINR(extraRevenueNow, { compact: true })} extra
              revenue vs. {formatINR(extraFixedCost, { compact: true })} extra fixed cost —{" "}
              <b style={{ color: isAheadNow ? PROPERTIES.large.accent : "#FF6B6B" }}>
                {isAheadNow ? "+" : ""}
                {formatINR(extraSurplusNow, { compact: true })} additional operating surplus
              </b>{" "}
              from choosing 2,000 sq ft at this configuration.
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5 }}>
              This does not yet account for recovering the extra {formatINR(extraInvestment, { compact: true })}{" "}
              initial investment.
            </Typography>
          </Stack>
        )}
      </Box>
    </Paper>
  );
}
