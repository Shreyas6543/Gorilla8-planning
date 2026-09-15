import { useMemo, useState } from "react";
import { Box, Container, Stack, Typography } from "@mui/material";
import { PROPERTIES, DEFAULT_HOURS } from "../config/properties";
import { calcScenario } from "../lib/calculations";
import { PageHeader } from "../components/PageHeader";
import { ScenarioControls, type PropertyMode } from "../components/ScenarioControls";
import { RecommendationCard } from "../components/RecommendationCard";
import { PropertyComparison } from "../components/PropertyComparison";
import { RevenueChart } from "../components/RevenueChart";
import { OperatingSurplusChart } from "../components/OperatingSurplusChart";
import { CrossoverPanel } from "../components/CrossoverPanel";
import { CapitalAllocation } from "../components/CapitalAllocation";
import { CapacityComparison } from "../components/CapacityComparison";
import { ScenarioSimulator } from "../components/ScenarioSimulator";

export function ComparisonPage() {
  const [hoursPerDay, setHoursPerDay] = useState<number>(DEFAULT_HOURS);
  const [propertyMode, setPropertyMode] = useState<PropertyMode>("both");
  const [poolLarge, setPoolLarge] = useState<number>(PROPERTIES.large.minPool);
  const [ps5Large, setPs5Large] = useState<number>(PROPERTIES.large.minPs5);
  const [carromLarge, setCarromLarge] = useState<number>(PROPERTIES.large.maxCarrom);
  const [racingSimSmall, setRacingSimSmall] = useState<number>(PROPERTIES.small.maxRacingSim);

  const smallResult = useMemo(
    () =>
      calcScenario(PROPERTIES.small, {
        pool: PROPERTIES.small.minPool,
        ps5: PROPERTIES.small.minPs5,
        carrom: PROPERTIES.small.minCarrom,
        racingSim: racingSimSmall,
        hoursPerDay,
      }),
    [hoursPerDay, racingSimSmall]
  );
  const largeResult = useMemo(
    () =>
      calcScenario(PROPERTIES.large, {
        pool: poolLarge,
        ps5: ps5Large,
        carrom: carromLarge,
        racingSim: PROPERTIES.large.minRacingSim,
        hoursPerDay,
      }),
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
        <PageHeader subtitle="Gaming revenue model — excludes food, memberships, taxes and variable costs. Full side-by-side comparison of 1,350 sq ft and 2,000 sq ft." />

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
            racingSimSmall={racingSimSmall}
            onRacingSimSmallChange={setRacingSimSmall}
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
            racingSimSmall={racingSimSmall}
            racingSimLarge={PROPERTIES.large.minRacingSim}
          />

          <RevenueChart
            hoursPerDay={hoursPerDay}
            poolLarge={poolLarge}
            ps5Large={ps5Large}
            carromLarge={carromLarge}
            racingSimSmall={racingSimSmall}
          />

          <OperatingSurplusChart
            hoursPerDay={hoursPerDay}
            poolLarge={poolLarge}
            ps5Large={ps5Large}
            carromLarge={carromLarge}
            racingSimSmall={racingSimSmall}
          />

          <CrossoverPanel
            hoursPerDay={hoursPerDay}
            poolLarge={poolLarge}
            ps5Large={ps5Large}
            carromLarge={carromLarge}
            racingSimSmall={racingSimSmall}
          />

          <CapitalAllocation />

          <CapacityComparison />

          <ScenarioSimulator initialHours={hoursPerDay} />

          <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center", pt: 2 }}>
            All figures are estimates based on stated rent, setup investment, ₹200/hour per pool/PS5 station, ₹100/hour
            per carrom board and ₹350/hour per racing simulator rig. Excludes food, memberships, advertising,
            electricity beyond the stated ₹35k other expenses, salaries beyond that figure, and taxes. "Operating
            surplus" is revenue minus stated fixed expenses only — not net profit.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
