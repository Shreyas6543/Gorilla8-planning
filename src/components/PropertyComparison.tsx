import { Grid } from "@mui/material";
import { PROPERTIES } from "../config/properties";
import type { ScenarioResult } from "../lib/calculations";
import { PropertyCard } from "./PropertyCard";
import type { PropertyMode } from "./ScenarioControls";

interface PropertyComparisonProps {
  propertyMode: PropertyMode;
  smallResult: ScenarioResult;
  largeResult: ScenarioResult;
  poolLarge: number;
  ps5Large: number;
  carromLarge: number;
  racingSimSmall: number;
  racingSimLarge: number;
}

export function PropertyComparison({
  propertyMode,
  smallResult,
  largeResult,
  poolLarge,
  ps5Large,
  carromLarge,
  racingSimSmall,
  racingSimLarge,
}: PropertyComparisonProps) {
  return (
    <Grid container spacing={3} sx={{ alignItems: "stretch" }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <PropertyCard
          property={PROPERTIES.small}
          result={smallResult}
          pool={PROPERTIES.small.minPool}
          ps5={PROPERTIES.small.minPs5}
          carrom={PROPERTIES.small.minCarrom}
          racingSim={racingSimSmall}
          featured={propertyMode === "small"}
          dimmed={propertyMode === "large"}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <PropertyCard
          property={PROPERTIES.large}
          result={largeResult}
          pool={poolLarge}
          ps5={ps5Large}
          carrom={carromLarge}
          racingSim={racingSimLarge}
          featured={propertyMode === "large"}
          dimmed={propertyMode === "small"}
        />
      </Grid>
    </Grid>
  );
}
