import { Paper, Stack, Typography, Box } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import { PROPERTIES } from "../config/properties";
import { formatINR } from "../lib/calculations";
import type { ScenarioResult } from "../lib/calculations";

interface RecommendationCardProps {
  hoursPerDay: number;
  small: ScenarioResult;
  large: ScenarioResult;
  poolLarge: number;
  ps5Large: number;
}

export function RecommendationCard({ hoursPerDay, small, large, poolLarge, ps5Large }: RecommendationCardProps) {
  const revenueDelta = large.totalRevenue - small.totalRevenue;
  const surplusDelta = large.operatingSurplus - small.operatingSurplus;
  const extraInvestment = PROPERTIES.large.setupInvestment - PROPERTIES.small.setupInvestment;
  const extraFixedCost = large.fixedExpense - small.fixedExpense;
  const largeHasMoreStations = poolLarge > PROPERTIES.small.minPool || ps5Large > PROPERTIES.small.minPs5;

  const better = surplusDelta > 0 ? "large" : surplusDelta < 0 ? "small" : "tie";
  const betterName = better === "large" ? PROPERTIES.large.shortLabel : PROPERTIES.small.shortLabel;

  let verdictLine: string;
  if (better === "tie") {
    verdictLine = `At this utilization, both options produce the same operating surplus — the ${
      largeHasMoreStations ? "2,000 sq ft option still carries more expansion headroom" : "smaller footprint carries less capital and cost risk for the same result"
    }.`;
  } else if (better === "large") {
    verdictLine = `At ${hoursPerDay}h/day, the 2,000 sq ft option generates ${formatINR(
      Math.abs(surplusDelta),
      { compact: true }
    )} more operating surplus per month than 1,350 sq ft, even after its higher fixed cost — it currently makes more financial sense at this configuration.`;
  } else {
    verdictLine = `At ${hoursPerDay}h/day, the 2,000 sq ft option's extra ${formatINR(
      extraFixedCost,
      { compact: true }
    )}/month fixed cost outweighs the extra revenue from its current station count — 1,350 sq ft produces ${formatINR(
      Math.abs(surplusDelta),
      { compact: true }
    )} more operating surplus per month right now. Increasing pool/PS5 count on the larger property changes this.`;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, md: 3 },
        borderRadius: 4,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "linear-gradient(135deg, rgba(57,255,136,0.08), rgba(61,178,255,0.06))",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <BoltIcon sx={{ color: "primary.main" }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: "0.08em" }}>
            Recommendation at {hoursPerDay}h/day paid utilization
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.25 }}>
            {PROPERTIES.small.shortLabel} generates {formatINR(small.totalRevenue, { compact: true })}/month
            &nbsp;·&nbsp; {PROPERTIES.large.shortLabel} generates {formatINR(large.totalRevenue, { compact: true })}/month
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mt: 1, lineHeight: 1.6 }}>
            The 2,000 sq ft option generates{" "}
            <b style={{ color: "#F2F4F7" }}>{formatINR(Math.abs(revenueDelta), { compact: true })}</b>{" "}
            {revenueDelta >= 0 ? "more" : "less"} monthly revenue capacity than 1,350 sq ft at this configuration, but
            requires <b style={{ color: "#F2F4F7" }}>{formatINR(extraInvestment, { compact: true })}</b> more initial
            investment and <b style={{ color: "#F2F4F7" }}>{formatINR(extraFixedCost, { compact: true })}</b> more
            monthly fixed expense.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, fontWeight: 700, color: better === "large" ? PROPERTIES.large.accent : better === "small" ? PROPERTIES.small.accent : "text.primary" }}>
            {verdictLine}
          </Typography>
          {better !== "tie" && (
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
              Recommendation: {betterName} — based on operating surplus only. This excludes food, memberships, taxes
              and variable costs.
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
