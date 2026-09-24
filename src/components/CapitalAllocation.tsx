import { Box, Stack, Typography } from "@mui/material";
import { PROPERTIES } from "../config/properties";
import { formatINR } from "../lib/calculations";

// invested/remaining are live figures (see useCapitalStatus) — never derived
// from property.setupInvestment/remainingCapital here, so this bar always
// reflects actual Expenses-page spend rather than a fixed planning number.
export function CapitalBar({
  property,
  invested,
  remaining,
}: {
  property: (typeof PROPERTIES)[keyof typeof PROPERTIES];
  invested: number;
  remaining: number;
}) {
  const total = invested + remaining;
  const investedPct = total > 0 ? (invested / total) * 100 : 0;
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
            {formatINR(invested, { compact: true })} invested
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
            {formatINR(remaining, { compact: true })} remaining
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
