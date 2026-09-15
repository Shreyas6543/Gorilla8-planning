import { Box, Paper, Stack, Typography } from "@mui/material";
import { PROPERTIES, totalCapitalPool } from "../config/properties";
import { formatINR } from "../lib/calculations";

function CapitalBar({ property }: { property: (typeof PROPERTIES)[keyof typeof PROPERTIES] }) {
  const total = totalCapitalPool(property);
  const investedPct = (property.setupInvestment / total) * 100;
  const remainingPct = 100 - investedPct;

  return (
    <Box sx={{ mb: 2.5 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.75 }}>
        <Typography sx={{ fontWeight: 700 }}>
          {property.emoji} {property.name}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Total pool: {formatINR(total, { compact: true })}
        </Typography>
      </Stack>
      <Box
        sx={{
          display: "flex",
          width: "100%",
          height: 36,
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Box
          sx={{
            width: `${investedPct}%`,
            bgcolor: property.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 0,
            transition: "width 0.3s",
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 800, color: "#04140a", px: 0.5, whiteSpace: "nowrap" }}>
            {formatINR(property.setupInvestment, { compact: true })} invested
          </Typography>
        </Box>
        <Box
          sx={{
            width: `${remainingPct}%`,
            bgcolor: "rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 0,
            transition: "width 0.3s",
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", px: 0.5, whiteSpace: "nowrap" }}>
            {formatINR(property.remainingCapital, { compact: true })} remaining
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export function CapitalAllocation() {
  return (
    <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        Capital deployment
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        Each option is evaluated against the same ₹30L pool of available capital — invested vs. kept in reserve.
      </Typography>
      <CapitalBar property={PROPERTIES.small} />
      <CapitalBar property={PROPERTIES.large} />
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        The 2,000 sq ft option ties up {formatINR(PROPERTIES.large.setupInvestment, { compact: true })} of capital,
        leaving only {formatINR(PROPERTIES.large.remainingCapital, { compact: true })} in reserve — noticeably less
        of a buffer than the {formatINR(PROPERTIES.small.remainingCapital, { compact: true })} left over with 1,350
        sq ft.
      </Typography>
    </Paper>
  );
}
