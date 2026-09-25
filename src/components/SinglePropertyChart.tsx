import { Paper, Typography, Box } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { ChartsReferenceLine } from "@mui/x-charts";
import { HOUR_OPTIONS, PROPERTIES } from "../config/properties";
import { calcScenario } from "../lib/calculations";

interface SinglePropertyChartProps {
  hoursPerDay: number;
  pool: number; // pool tables placed in the venue layout
  ps5: number; // PS5 stations placed in the venue layout
}

export function SinglePropertyChart({ hoursPerDay, pool, ps5 }: SinglePropertyChartProps) {
  const hours: number[] = [...HOUR_OPTIONS];
  const property = PROPERTIES.small;

  const revenueSeries = hours.map(
    (h) =>
      calcScenario(property, {
        pool,
        ps5,
        carrom: property.minCarrom,
        racingSim: 0,
        hoursPerDay: h,
      }).totalRevenue
  );
  const surplusSeries = hours.map(
    (h) =>
      calcScenario(property, {
        pool,
        ps5,
        carrom: property.minCarrom,
        racingSim: 0,
        hoursPerDay: h,
      }).operatingSurplus
  );

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        Revenue &amp; profit vs. utilization — 1,350 sq ft
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
        How your numbers change as paid hours/day goes up.
      </Typography>
      <Box sx={{ width: "100%", height: 320 }}>
        <LineChart
          height={320}
          series={[
            {
              data: revenueSeries,
              label: "Monthly revenue",
              color: property.accent,
              curve: "linear",
              valueFormatter: (v) => (v == null ? "" : `₹${(v / 100000).toFixed(2)}L/month`),
            },
            {
              data: surplusSeries,
              label: "Operating surplus (profit)",
              color: "#F2C744",
              curve: "linear",
              valueFormatter: (v) => (v == null ? "" : `₹${(v / 100000).toFixed(2)}L/month`),
            },
          ]}
          xAxis={[{ data: hours, label: "Paid utilization hours/day", scaleType: "point" }]}
          yAxis={[{ label: "₹/month", width: 70 }]}
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
