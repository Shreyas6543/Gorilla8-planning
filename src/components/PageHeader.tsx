import { Box, Chip, Stack, Typography } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/comparison", label: "Comparison" },
];

interface PageHeaderProps {
  subtitle: string;
}

export function PageHeader({ subtitle }: PageHeaderProps) {
  const location = useLocation();

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 0.5, flexWrap: "wrap", rowGap: 1 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(57,255,136,0.12)",
            border: "1px solid rgba(57,255,136,0.35)",
            flexShrink: 0,
          }}
        >
          <SportsEsportsIcon sx={{ color: "primary.main" }} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
          GORILLA 8
        </Typography>

        <Stack direction="row" spacing={1} sx={{ ml: { sm: 1 } }}>
          {NAV_LINKS.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Chip
                key={link.to}
                component={Link}
                to={link.to}
                label={link.label}
                clickable
                size="small"
                sx={{
                  bgcolor: active ? "primary.main" : "rgba(255,255,255,0.08)",
                  color: active ? "#04140a" : "text.primary",
                  fontWeight: 700,
                  "&:hover": { bgcolor: active ? "primary.main" : "rgba(255,255,255,0.15)" },
                }}
              />
            );
          })}
        </Stack>
      </Stack>
      <Typography variant="body1" sx={{ color: "text.secondary" }}>
        {subtitle}
      </Typography>
    </Box>
  );
}
