import { useMemo, useState } from "react";
import { Box, Container, Stack, Typography, Chip } from "@mui/material";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { PROPERTIES, DEFAULT_HOURS } from "./config/properties";
import { calcScenario } from "./lib/calculations";
import { ScenarioControls, type PropertyMode } from "./components/ScenarioControls";
import { RecommendationCard } from "./components/RecommendationCard";
import { PropertyComparison } from "./components/PropertyComparison";
import { RevenueChart } from "./components/RevenueChart";
import { OperatingSurplusChart } from "./components/OperatingSurplusChart";
import { CrossoverPanel } from "./components/CrossoverPanel";
import { CapitalAllocation } from "./components/CapitalAllocation";
import { CapacityComparison } from "./components/CapacityComparison";
import { ScenarioSimulator } from "./components/ScenarioSimulator";

function App() {
  const [hoursPerDay, setHoursPerDay] = useState<number>(DEFAULT_HOURS);
  const [propertyMode, setPropertyMode] = useState<PropertyMode>("both");
  const [poolLarge, setPoolLarge] = useState<number>(PROPERTIES.large.minPool);
  const [ps5Large, setPs5Large] = useState<number>(PROPERTIES.large.minPs5);
  const [carromLarge, setCarromLarge] = useState<number>(PROPERTIES.large.maxCarrom);

  const smallResult = useMemo(
    () =>
      calcScenario(PROPERTIES.small, {
        pool: PROPERTIES.small.minPool,
        ps5: PROPERTIES.small.minPs5,
        carrom: PROPERTIES.small.minCarrom,
        hoursPerDay,
      }),
    [hoursPerDay]
  );
  const largeResult = useMemo(
    () => calcScenario(PROPERTIES.large, { pool: poolLarge, ps5: ps5Large, carrom: carromLarge, hoursPerDay }),
    [poolLarge, ps5Large, carromLarge, hoursPerDay]
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        backgroundImage:
          "radial-gradient(circle at 15% 0%, rgba(57,255,136,0.07), transparent 45%), radial-gradient(circle at 85% 10%, rgba(61,178,255,0.07), transparent 45%)",
        pb: 8,
      }}
    >
      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 6 } }}>
        {/* Brand header */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 0.5 }}>
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
            }}
          >
            <SportsEsportsIcon sx={{ color: "primary.main" }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            GORILLA 8
          </Typography>
          <Chip label="Property Decision Dashboard" size="small" sx={{ bgcolor: "rgba(255,255,255,0.08)" }} />
        </Stack>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 3 }}>
          Gaming revenue model — excludes food, memberships, taxes and variable costs. Comparing a 1,350 sq ft and a
          2,000 sq ft property for the gaming + pool café.
        </Typography>

        <Stack spacing={3}>
          <ScenarioControls
            hoursPerDay={hoursPerDay}
            onHoursChange={setHoursPerDay}
            propertyMode={propertyMode}
            onPropertyModeChange={setPropertyMode}
            poolLarge={poolLarge}
            onPoolLargeChange={setPoolLarge}
            ps5Large={ps5Large}
            onPs5LargeChange={setPs5Large}
            carromLarge={carromLarge}
            onCarromLargeChange={setCarromLarge}
          />

          <RecommendationCard
            hoursPerDay={hoursPerDay}
            small={smallResult}
            large={largeResult}
            poolLarge={poolLarge}
            ps5Large={ps5Large}
          />

          <PropertyComparison
            propertyMode={propertyMode}
            smallResult={smallResult}
            largeResult={largeResult}
            poolLarge={poolLarge}
            ps5Large={ps5Large}
            carromLarge={carromLarge}
          />

          <RevenueChart
            hoursPerDay={hoursPerDay}
            poolLarge={poolLarge}
            ps5Large={ps5Large}
            carromLarge={carromLarge}
          />

          <OperatingSurplusChart
            hoursPerDay={hoursPerDay}
            poolLarge={poolLarge}
            ps5Large={ps5Large}
            carromLarge={carromLarge}
          />

          <CrossoverPanel
            hoursPerDay={hoursPerDay}
            poolLarge={poolLarge}
            ps5Large={ps5Large}
            carromLarge={carromLarge}
          />

          <CapitalAllocation />

          <CapacityComparison />

          <ScenarioSimulator initialHours={hoursPerDay} />

          <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center", pt: 2 }}>
            All figures are estimates based on stated rent, setup investment and ₹200/hour per station gaming
            revenue only. Excludes food, memberships, advertising, electricity beyond the stated ₹35k other
            expenses, salaries beyond that figure, and taxes. "Operating surplus" is revenue minus stated fixed
            expenses only — not net profit.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}

export default App;
