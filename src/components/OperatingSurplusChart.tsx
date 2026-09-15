import { Paper, Typography, Box } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { ChartsReferenceLine } from "@mui/x-charts";
import { HOUR_OPTIONS, PROPERTIES } from "../config/properties";
import { calcScenario } from "../lib/calculations";

interface OperatingSurplusChartProps {
  hoursPerDay: number;
  poolLarge: number;
  ps5Large: number;
  carromLarge: number;
}

export function OperatingSurplusChart({ hoursPerDay, poolLarge, ps5Large, carromLarge }: OperatingSurplusChartProps) {
  const hours: number[] = [...HOUR_OPTIONS];

  const smallSeries = hours.map(
    (h) =>
      calcScenario(PROPERTIES.small, {
        pool: PROPERTIES.small.minPool,
        ps5: PROPERTIES.small.minPs5,
        carrom: PROPERTIES.small.minCarrom,
        hoursPerDay: h,
      }).operatingSurplus
  );
  const largeSeries = hours.map(
    (h) =>
      calcScenario(PROPERTIES.large, { pool: poolLarge, ps5: ps5Large, carrom: carromLarge, hoursPerDay: h })
        .operatingSurplus
  );

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        Operating surplus vs. utilization
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
        Monthly operating surplus (profit before variable costs/tax) at each paid utilization level.{" "}
        {PROPERTIES.small.shortLabel}: fixed at {PROPERTIES.small.minPool} pool + {PROPERTIES.small.minPs5} PS5.{" "}
        {PROPERTIES.large.shortLabel}: {poolLarge} pool + {ps5Large} PS5{carromLarge > 0 ? ` + ${carromLarge} carrom` : ""} — set via the
        Pool tables / PS5 stations / Carrom board selectors above.
      </Typography>
      <Box sx={{ width: "100%", height: 320 }}>
        <LineChart
          height={320}
          series={[
            {
              data: smallSeries,
              label: PROPERTIES.small.shortLabel,
              color: PROPERTIES.small.accent,
              curve: "linear",
              valueFormatter: (v) => (v == null ? "" : `₹${(v / 100000).toFixed(2)}L/month`),
            },
            {
              data: largeSeries,
              label: PROPERTIES.large.shortLabel,
              color: PROPERTIES.large.accent,
              curve: "linear",
              valueFormatter: (v) => (v == null ? "" : `₹${(v / 100000).toFixed(2)}L/month`),
            },
          ]}
          xAxis={[{ data: hours, label: "Paid utilization hours/day", scaleType: "point" }]}
          yAxis={[{ label: "Operating surplus (₹/month)", width: 70 }]}
          grid={{ horizontal: true }}
          sx={{
            "& .MuiChartsAxis-tickLabel": { fill: "#9AA4B2" },
            "& .MuiChartsAxis-label": { fill: "#9AA4B2" },
            "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": { stroke: "rgba(255,255,255,0.15)" },
          }}
        >
          <ChartsReferenceLine y={0} lineStyle={{ stroke: "#9AA4B2", strokeDasharray: "3 3" }} />
          {hours.includes(hoursPerDay) && (
            <ChartsReferenceLine x={hoursPerDay} lineStyle={{ stroke: "#F2F4F7", strokeDasharray: "4 4" }} />
          )}
        </LineChart>
      </Box>
    </Paper>
  );
}
