import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  accent?: string;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
}

export function MetricCard({ label, value, sublabel, accent, size = "md", icon }: MetricCardProps) {
  const fontSize = size === "lg" ? "2.1rem" : size === "sm" ? "1.1rem" : "1.5rem";
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        minWidth: 0,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
        {icon}
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
        >
          {label}
        </Typography>
      </Stack>
      <Typography
        sx={{
          fontSize,
          fontWeight: 800,
          lineHeight: 1.1,
          color: accent ?? "text.primary",
          textShadow: accent ? `0 0 18px ${accent}55` : "none",
          wordBreak: "break-word",
        }}
      >
        {value}
      </Typography>
      {sublabel && (
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {sublabel}
        </Typography>
      )}
    </Box>
  );
}
