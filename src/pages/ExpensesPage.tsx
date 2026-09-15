import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Box,
  Container,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { PROPERTIES } from "../config/properties";
import { EXPENSE_CATEGORIES, EXPENSE_ITEMS } from "../config/expenses";
import {
  loadExpenseState,
  saveExpenseState,
  rowExpectedTotal,
  rowFinalTotal,
  rowIsOrdered,
  type ExpenseState,
  type PropertyKey,
} from "../lib/expenses";
import { formatINR } from "../lib/calculations";
import { PageHeader } from "../components/PageHeader";
import { MetricCard } from "../components/MetricCard";

function NumInput({
  value,
  onChange,
  accent,
}: {
  value: number;
  onChange: (v: number) => void;
  accent?: string;
}) {
  return (
    <input
      type="number"
      min={0}
      inputMode="decimal"
      value={value === 0 ? "" : value}
      placeholder="0"
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? 0 : Math.max(0, Number(v)));
      }}
      style={{
        width: 68,
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${accent ? accent + "40" : "rgba(255,255,255,0.14)"}`,
        borderRadius: 6,
        color: "#F2F4F7",
        padding: "5px 6px",
        textAlign: "right",
        fontSize: 13,
        fontFamily: "inherit",
      }}
    />
  );
}

const headCellSx = {
  color: "text.secondary",
  fontWeight: 700,
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.03em",
  whiteSpace: "nowrap" as const,
  borderBottom: "1px solid rgba(255,255,255,0.12)",
};

export function ExpensesPage() {
  const [state, setState] = useState<ExpenseState>(() => loadExpenseState());

  useEffect(() => {
    saveExpenseState(state);
  }, [state]);

  const updateField = (id: string, field: keyof ExpenseState[string], value: number) => {
    setState((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const totals = useMemo(() => {
    const perProperty: Record<PropertyKey, { expected: number; final: number; ordered: number }> = {
      small: { expected: 0, final: 0, ordered: 0 },
      large: { expected: 0, final: 0, ordered: 0 },
    };
    for (const item of EXPENSE_ITEMS) {
      const row = state[item.id];
      if (!row) continue;
      (["small", "large"] as PropertyKey[]).forEach((p) => {
        perProperty[p].expected += rowExpectedTotal(row, p);
        perProperty[p].final += rowFinalTotal(row, p);
        if (rowIsOrdered(row, p)) perProperty[p].ordered += 1;
      });
    }
    return perProperty;
  }, [state]);

  const expectedDelta = totals.large.expected - totals.small.expected;

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
        <PageHeader subtitle="Setup expenses checklist — expected vs. final (ordered) price, quantities, side by side for both properties. Saved automatically in this browser." />

        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <MetricCard
                label={`${PROPERTIES.small.shortLabel} — expected`}
                value={formatINR(totals.small.expected, { compact: true })}
                sublabel="total setup budget"
                accent={PROPERTIES.small.accent}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <MetricCard
                label={`${PROPERTIES.small.shortLabel} — ordered so far`}
                value={formatINR(totals.small.final, { compact: true })}
                sublabel={`${totals.small.ordered} of ${EXPENSE_ITEMS.length} items`}
                accent={PROPERTIES.small.accent}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <MetricCard
                label={`${PROPERTIES.large.shortLabel} — expected`}
                value={formatINR(totals.large.expected, { compact: true })}
                sublabel="total setup budget"
                accent={PROPERTIES.large.accent}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <MetricCard
                label={`${PROPERTIES.large.shortLabel} — ordered so far`}
                value={formatINR(totals.large.final, { compact: true })}
                sublabel={`${totals.large.ordered} of ${EXPENSE_ITEMS.length} items`}
                accent={PROPERTIES.large.accent}
              />
            </Grid>
          </Grid>

          {(totals.small.expected > 0 || totals.large.expected > 0) && (
            <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4 }}>
              <Typography sx={{ color: "text.secondary" }}>
                At current entries, {PROPERTIES.large.shortLabel} needs{" "}
                <b style={{ color: expectedDelta >= 0 ? "#FF6B6B" : PROPERTIES.large.accent }}>
                  {formatINR(Math.abs(expectedDelta), { compact: true })} {expectedDelta >= 0 ? "more" : "less"}
                </b>{" "}
                expected setup spend than {PROPERTIES.small.shortLabel}. This is separate from the ₹15L / ₹22L
                property setup investment shown on the other pages — this page is the itemized breakdown of what
                that money (and the leftover capital) actually goes toward.
              </Typography>
            </Paper>
          )}

          <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2.5 }, borderRadius: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, px: { xs: 1, md: 0.5 } }}>
              Item-by-item breakdown
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2, px: { xs: 1, md: 0.5 } }}>
              Enter quantity and expected price per unit as you get quotes. Fill in the final price once you've
              actually placed an order — that's what turns into your real committed spend.
            </Typography>

            <TableContainer sx={{ overflowX: "auto", borderRadius: 2, border: "1px solid rgba(255,255,255,0.08)" }}>
              <Table size="small" sx={{ minWidth: 920 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...headCellSx, minWidth: 180 }}>Item</TableCell>
                    <TableCell align="center" colSpan={3} sx={{ ...headCellSx, color: PROPERTIES.small.accent, borderLeft: "1px solid rgba(255,255,255,0.12)" }}>
                      {PROPERTIES.small.shortLabel}
                    </TableCell>
                    <TableCell align="center" colSpan={3} sx={{ ...headCellSx, color: PROPERTIES.large.accent, borderLeft: "1px solid rgba(255,255,255,0.12)" }}>
                      {PROPERTIES.large.shortLabel}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={headCellSx} />
                    <TableCell align="right" sx={{ ...headCellSx, borderLeft: "1px solid rgba(255,255,255,0.12)" }}>Qty</TableCell>
                    <TableCell align="right" sx={headCellSx}>Expected/unit</TableCell>
                    <TableCell align="right" sx={headCellSx}>Final/unit</TableCell>
                    <TableCell align="right" sx={{ ...headCellSx, borderLeft: "1px solid rgba(255,255,255,0.12)" }}>Qty</TableCell>
                    <TableCell align="right" sx={headCellSx}>Expected/unit</TableCell>
                    <TableCell align="right" sx={headCellSx}>Final/unit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {EXPENSE_CATEGORIES.map((category) => {
                    const items = EXPENSE_ITEMS.filter((i) => i.category === category);
                    const catExpSmall = items.reduce((s, i) => s + rowExpectedTotal(state[i.id], "small"), 0);
                    const catFinSmall = items.reduce((s, i) => s + rowFinalTotal(state[i.id], "small"), 0);
                    const catExpLarge = items.reduce((s, i) => s + rowExpectedTotal(state[i.id], "large"), 0);
                    const catFinLarge = items.reduce((s, i) => s + rowFinalTotal(state[i.id], "large"), 0);
                    return (
                      <Fragment key={category}>
                        <TableRow>
                          {/* category header */}
                          <TableCell
                            colSpan={7}
                            sx={{
                              bgcolor: "rgba(255,255,255,0.04)",
                              color: "text.primary",
                              fontWeight: 800,
                              fontSize: 12.5,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              borderBottom: "1px solid rgba(255,255,255,0.1)",
                              borderTop: "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            {category}
                          </TableCell>
                        </TableRow>
                        {items.map((item) => {
                          const row = state[item.id];
                          return (
                            <TableRow key={item.id} hover>
                              <TableCell sx={{ color: "text.primary", whiteSpace: "nowrap" }}>{item.name}</TableCell>
                              <TableCell align="right" sx={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                                <NumInput value={row.qtySmall} onChange={(v) => updateField(item.id, "qtySmall", v)} accent={PROPERTIES.small.accent} />
                              </TableCell>
                              <TableCell align="right">
                                <NumInput value={row.expSmall} onChange={(v) => updateField(item.id, "expSmall", v)} accent={PROPERTIES.small.accent} />
                              </TableCell>
                              <TableCell align="right">
                                <NumInput value={row.finSmall} onChange={(v) => updateField(item.id, "finSmall", v)} accent={PROPERTIES.small.accent} />
                              </TableCell>
                              <TableCell align="right" sx={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                                <NumInput value={row.qtyLarge} onChange={(v) => updateField(item.id, "qtyLarge", v)} accent={PROPERTIES.large.accent} />
                              </TableCell>
                              <TableCell align="right">
                                <NumInput value={row.expLarge} onChange={(v) => updateField(item.id, "expLarge", v)} accent={PROPERTIES.large.accent} />
                              </TableCell>
                              <TableCell align="right">
                                <NumInput value={row.finLarge} onChange={(v) => updateField(item.id, "finLarge", v)} accent={PROPERTIES.large.accent} />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow>
                          <TableCell sx={{ color: "text.secondary", fontWeight: 700, fontStyle: "italic" }}>
                            {category} subtotal
                          </TableCell>
                          <TableCell colSpan={2} align="right" sx={{ borderLeft: "1px solid rgba(255,255,255,0.06)", color: PROPERTIES.small.accent, fontWeight: 700 }}>
                            {formatINR(catExpSmall, { compact: true })} exp.
                          </TableCell>
                          <TableCell align="right" sx={{ color: PROPERTIES.small.accent, fontWeight: 700 }}>
                            {catFinSmall > 0 ? `${formatINR(catFinSmall, { compact: true })} fin.` : "—"}
                          </TableCell>
                          <TableCell colSpan={2} align="right" sx={{ borderLeft: "1px solid rgba(255,255,255,0.06)", color: PROPERTIES.large.accent, fontWeight: 700 }}>
                            {formatINR(catExpLarge, { compact: true })} exp.
                          </TableCell>
                          <TableCell align="right" sx={{ color: PROPERTIES.large.accent, fontWeight: 700 }}>
                            {catFinLarge > 0 ? `${formatINR(catFinLarge, { compact: true })} fin.` : "—"}
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                  <TableRow>
                    <TableCell sx={{ color: "text.primary", fontWeight: 800, fontSize: 14, borderTop: "2px solid rgba(255,255,255,0.2)" }}>
                      GRAND TOTAL
                    </TableCell>
                    <TableCell colSpan={2} align="right" sx={{ borderTop: "2px solid rgba(255,255,255,0.2)", borderLeft: "1px solid rgba(255,255,255,0.06)", color: PROPERTIES.small.accent, fontWeight: 800, fontSize: 14 }}>
                      {formatINR(totals.small.expected, { compact: true })} exp.
                    </TableCell>
                    <TableCell align="right" sx={{ borderTop: "2px solid rgba(255,255,255,0.2)", color: PROPERTIES.small.accent, fontWeight: 800, fontSize: 14 }}>
                      {totals.small.final > 0 ? `${formatINR(totals.small.final, { compact: true })} fin.` : "—"}
                    </TableCell>
                    <TableCell colSpan={2} align="right" sx={{ borderTop: "2px solid rgba(255,255,255,0.2)", borderLeft: "1px solid rgba(255,255,255,0.06)", color: PROPERTIES.large.accent, fontWeight: 800, fontSize: 14 }}>
                      {formatINR(totals.large.expected, { compact: true })} exp.
                    </TableCell>
                    <TableCell align="right" sx={{ borderTop: "2px solid rgba(255,255,255,0.2)", color: PROPERTIES.large.accent, fontWeight: 800, fontSize: 14 }}>
                      {totals.large.final > 0 ? `${formatINR(totals.large.final, { compact: true })} fin.` : "—"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center", pt: 1 }}>
            "Expected" is your planning-stage price estimate; "Final" is what you actually pay once an order is
            placed (leave at 0 until then). Grand totals only count Final for items with a final price entered.
            Values are saved in this browser only — no backend/database yet.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
