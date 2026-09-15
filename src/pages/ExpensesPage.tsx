import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { PROPERTIES } from "../config/properties";
import { EXPENSE_CATEGORIES, EXPENSE_ITEMS } from "../config/expenses";
import {
  createEmptyState,
  loadExpenseState,
  saveExpenseState,
  rowExpectedTotal,
  rowFinalTotal,
  rowIsOrdered,
  type ExpenseRow,
  type ExpenseState,
  type PropertyKey,
} from "../lib/expenses";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { checkPasscode, isUnlocked, setUnlocked } from "../lib/editAccess";
import { formatINR } from "../lib/calculations";
import { PageHeader } from "../components/PageHeader";
import { MetricCard } from "../components/MetricCard";

const SAVE_DEBOUNCE_MS = 700;

function NumInput({
  value,
  onChange,
  accent,
  fullWidth,
}: {
  value: number;
  onChange: (v: number) => void;
  accent?: string;
  fullWidth?: boolean;
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
        width: fullWidth ? "100%" : 68,
        boxSizing: "border-box",
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${accent ? accent + "40" : "rgba(255,255,255,0.14)"}`,
        borderRadius: 6,
        color: "#F2F4F7",
        padding: "6px 6px",
        textAlign: "right",
        fontSize: 13,
        fontFamily: "inherit",
      }}
    />
  );
}

function ReadOnlyValue({ value }: { value: number }) {
  return (
    <Typography variant="body2" sx={{ color: value > 0 ? "text.primary" : "text.secondary", textAlign: "right" }}>
      {value > 0 ? value.toLocaleString("en-IN") : "—"}
    </Typography>
  );
}

function EditableValue({
  value,
  onChange,
  unlocked,
  accent,
  fullWidth,
}: {
  value: number;
  onChange: (v: number) => void;
  unlocked: boolean;
  accent?: string;
  fullWidth?: boolean;
}) {
  return unlocked ? (
    <NumInput value={value} onChange={onChange} accent={accent} fullWidth={fullWidth} />
  ) : (
    <ReadOnlyValue value={value} />
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
  const [state, setState] = useState<ExpenseState>(() => createEmptyState());
  const [loaded, setLoaded] = useState(false);
  const [unlocked, setUnlockedState] = useState<boolean>(() => isUnlocked());
  const [gateOpen, setGateOpen] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial load — from Supabase if configured, else local backup/defaults.
  useEffect(() => {
    let cancelled = false;
    loadExpenseState().then((loadedState) => {
      if (!cancelled) {
        setState(loadedState);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced auto-save: every edit resets the timer, so a burst of typing
  // only triggers one write after things go quiet — never an all-at-once
  // "click Save or lose everything" step. Skipped until the initial load
  // completes, so we don't immediately overwrite real data with blanks.
  useEffect(() => {
    if (!loaded) return;
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveExpenseState(state).then(() => setSaveStatus("saved"));
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, loaded]);

  const updateField = (id: string, field: keyof ExpenseRow, value: number) => {
    setState((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleUnlockSubmit = () => {
    if (checkPasscode(passcodeInput)) {
      setUnlocked(true);
      setUnlockedState(true);
      setGateOpen(false);
      setPasscodeInput("");
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  const handleLock = () => {
    setUnlocked(false);
    setUnlockedState(false);
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
        <PageHeader subtitle="Setup expenses checklist — expected vs. final (ordered) price, quantities, side by side for both properties. Saved automatically." />

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
                expected setup spend than {PROPERTIES.small.shortLabel}.
              </Typography>
            </Paper>
          )}

          <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2.5 }, borderRadius: 4 }}>
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, px: { xs: 1, md: 0.5 } }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Item-by-item breakdown
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {!loaded
                    ? "Loading…"
                    : unlocked
                      ? "Edit mode — fill in quantity and price per unit as you get quotes."
                      : "Read-only. Click Edit and enter the passcode to make changes."}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography
                  variant="caption"
                  sx={{ color: isSupabaseConfigured ? "primary.main" : "text.secondary", opacity: 0.8 }}
                >
                  {isSupabaseConfigured ? "● synced" : "● local only"}
                </Typography>
                {unlocked && saveStatus !== "idle" && (
                  <Typography variant="caption" sx={{ color: saveStatus === "saving" ? "text.secondary" : "primary.main" }}>
                    {saveStatus === "saving" ? "Saving…" : "Saved"}
                  </Typography>
                )}
                {unlocked ? (
                  <Button size="small" startIcon={<LockOutlinedIcon />} onClick={handleLock} sx={{ color: "text.secondary" }}>
                    Lock
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditOutlinedIcon />}
                    onClick={() => setGateOpen(true)}
                    sx={{ borderColor: "rgba(255,255,255,0.2)" }}
                  >
                    Edit
                  </Button>
                )}
              </Stack>
            </Stack>

            {/* Mobile card layout (xs–sm) */}
            <Box sx={{ display: { xs: "block", md: "none" }, mt: 2 }}>
              {EXPENSE_CATEGORIES.map((category) => {
                const items = EXPENSE_ITEMS.filter((i) => i.category === category);
                return (
                  <Box key={category} sx={{ mb: 2.5 }}>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "text.secondary" }}
                    >
                      {category}
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {items.map((item) => {
                        const row = state[item.id];
                        return (
                          <Paper key={item.id} elevation={0} sx={{ p: 1.5, borderRadius: 3, border: "1px solid rgba(255,255,255,0.08)" }}>
                            <Typography sx={{ fontWeight: 700, mb: 1 }}>{item.name}</Typography>
                            <Grid container spacing={1.5}>
                              <Grid size={6}>
                                <Typography variant="caption" sx={{ color: PROPERTIES.small.accent, fontWeight: 700 }}>
                                  {PROPERTIES.small.shortLabel}
                                </Typography>
                                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                  <Box>
                                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Qty</Typography>
                                    <EditableValue value={row.qtySmall} onChange={(v) => updateField(item.id, "qtySmall", v)} unlocked={unlocked} accent={PROPERTIES.small.accent} fullWidth />
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Expected/unit</Typography>
                                    <EditableValue value={row.expSmall} onChange={(v) => updateField(item.id, "expSmall", v)} unlocked={unlocked} accent={PROPERTIES.small.accent} fullWidth />
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Final/unit</Typography>
                                    <EditableValue value={row.finSmall} onChange={(v) => updateField(item.id, "finSmall", v)} unlocked={unlocked} accent={PROPERTIES.small.accent} fullWidth />
                                  </Box>
                                </Stack>
                              </Grid>
                              <Grid size={6}>
                                <Typography variant="caption" sx={{ color: PROPERTIES.large.accent, fontWeight: 700 }}>
                                  {PROPERTIES.large.shortLabel}
                                </Typography>
                                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                  <Box>
                                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Qty</Typography>
                                    <EditableValue value={row.qtyLarge} onChange={(v) => updateField(item.id, "qtyLarge", v)} unlocked={unlocked} accent={PROPERTIES.large.accent} fullWidth />
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Expected/unit</Typography>
                                    <EditableValue value={row.expLarge} onChange={(v) => updateField(item.id, "expLarge", v)} unlocked={unlocked} accent={PROPERTIES.large.accent} fullWidth />
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Final/unit</Typography>
                                    <EditableValue value={row.finLarge} onChange={(v) => updateField(item.id, "finLarge", v)} unlocked={unlocked} accent={PROPERTIES.large.accent} fullWidth />
                                  </Box>
                                </Stack>
                              </Grid>
                            </Grid>
                          </Paper>
                        );
                      })}
                    </Stack>
                  </Box>
                );
              })}
            </Box>

            {/* Desktop table layout (md+) */}
            <Box sx={{ display: { xs: "none", md: "block" }, mt: 2 }}>
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
                                  <EditableValue value={row.qtySmall} onChange={(v) => updateField(item.id, "qtySmall", v)} unlocked={unlocked} accent={PROPERTIES.small.accent} />
                                </TableCell>
                                <TableCell align="right">
                                  <EditableValue value={row.expSmall} onChange={(v) => updateField(item.id, "expSmall", v)} unlocked={unlocked} accent={PROPERTIES.small.accent} />
                                </TableCell>
                                <TableCell align="right">
                                  <EditableValue value={row.finSmall} onChange={(v) => updateField(item.id, "finSmall", v)} unlocked={unlocked} accent={PROPERTIES.small.accent} />
                                </TableCell>
                                <TableCell align="right" sx={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                                  <EditableValue value={row.qtyLarge} onChange={(v) => updateField(item.id, "qtyLarge", v)} unlocked={unlocked} accent={PROPERTIES.large.accent} />
                                </TableCell>
                                <TableCell align="right">
                                  <EditableValue value={row.expLarge} onChange={(v) => updateField(item.id, "expLarge", v)} unlocked={unlocked} accent={PROPERTIES.large.accent} />
                                </TableCell>
                                <TableCell align="right">
                                  <EditableValue value={row.finLarge} onChange={(v) => updateField(item.id, "finLarge", v)} unlocked={unlocked} accent={PROPERTIES.large.accent} />
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
            </Box>
          </Paper>

          <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center", pt: 1 }}>
            "Expected" is your planning-stage price estimate; "Final" is what you actually pay once an order is
            placed (leave at 0 until then). Grand totals only count Final for items with a final price entered.
            Edits save automatically a moment after you stop typing.
          </Typography>
        </Stack>
      </Container>

      <Dialog open={gateOpen} onClose={() => setGateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Enter passcode to edit</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="Passcode"
            value={passcodeInput}
            onChange={(e) => {
              setPasscodeInput(e.target.value);
              setPasscodeError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUnlockSubmit();
            }}
            error={passcodeError}
            helperText={passcodeError ? "Wrong passcode" : " "}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGateOpen(false)} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button onClick={handleUnlockSubmit} variant="contained" sx={{ color: "#04140a" }}>
            Unlock
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
