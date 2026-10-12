import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  PARTNER_SHARES,
  corpusTimeline,
  currentMonthId,
  loadFinance,
  monthDividends,
  monthLabel,
  monthLoss,
  monthNet,
  monthTotalExpense,
  newExpenseLine,
  newMonthEntry,
  saveFinance,
  type ExpenseLine,
  type FinanceState,
  type MonthEntry,
} from "../lib/monthlyFinance";
import { formatINR } from "../lib/calculations";
import { useCapitalStatus } from "../lib/useCapitalStatus";
import { useAdmin } from "../state/adminAuth";
import { PageHeader } from "../components/PageHeader";
import { MetricCard } from "../components/MetricCard";

const ACCENT = "#39FF88";
const LOSS_COLOR = "#FF6B6B";
const SAVE_DEBOUNCE_MS = 700;

function NumberField({
  value,
  onChange,
  label,
  sx,
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  sx?: object;
}) {
  return (
    <TextField
      size="small"
      type="number"
      label={label}
      value={value === 0 ? "" : value}
      placeholder="0"
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? 0 : Math.max(0, Number(v)));
      }}
      slotProps={{ htmlInput: { min: 0, inputMode: "decimal" } }}
      sx={sx}
    />
  );
}

export function FinancePage() {
  const { isAdmin } = useAdmin();
  const [editMode, setEditMode] = useState(false);
  const unlocked = isAdmin && editMode;

  const [state, setState] = useState<FinanceState>({ months: [] });
  const capital = useCapitalStatus(); // remaining setup capital — the corpus's base figure, never hand-typed
  const [loaded, setLoaded] = useState(false);
  const [synced, setSynced] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [addMonthValue, setAddMonthValue] = useState(currentMonthId());

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Same rule as Expenses/Ledger: everyone can view, only an admin gets Edit.
  useEffect(() => {
    if (!isAdmin) setEditMode(false);
  }, [isAdmin]);

  useEffect(() => {
    let cancelled = false;
    loadFinance().then((loadedState) => {
      if (!cancelled) {
        setState(loadedState);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced auto-save — no Save button, a burst of edits settles into one write.
  useEffect(() => {
    if (!loaded) return;
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveFinance(state).then((reachedSupabase) => {
        setSaveStatus("saved");
        setSynced(reachedSupabase);
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, loaded]);

  const mutateMonth = (id: string, fn: (m: MonthEntry) => MonthEntry) => {
    setState((prev) => ({ ...prev, months: prev.months.map((m) => (m.id === id ? fn(m) : m)) }));
  };

  const setRevenue = (id: string, revenue: number) => mutateMonth(id, (m) => ({ ...m, revenue }));

  const setExpenseAmount = (monthId: string, lineId: string, amount: number) =>
    mutateMonth(monthId, (m) => ({ ...m, expenses: m.expenses.map((e) => (e.id === lineId ? { ...e, amount } : e)) }));

  const setExpenseLabel = (monthId: string, lineId: string, label: string) =>
    mutateMonth(monthId, (m) => ({ ...m, expenses: m.expenses.map((e) => (e.id === lineId ? { ...e, label } : e)) }));

  const addExpenseLine = (monthId: string) =>
    mutateMonth(monthId, (m) => ({ ...m, expenses: [...m.expenses, newExpenseLine()] }));

  const removeExpenseLine = (monthId: string, lineId: string) =>
    mutateMonth(monthId, (m) => ({ ...m, expenses: m.expenses.filter((e) => e.id !== lineId) }));

  const addMonth = () => {
    if (!addMonthValue || state.months.some((m) => m.id === addMonthValue)) return;
    setState((prev) => ({ ...prev, months: [...prev.months, newMonthEntry(addMonthValue)] }));
  };

  const removeMonth = (m: MonthEntry) => {
    if (window.confirm(`Delete ${monthLabel(m.id)}? This removes its revenue, expenses and dividend record.`)) {
      setState((prev) => ({ ...prev, months: prev.months.filter((x) => x.id !== m.id) }));
    }
  };

  const sortedDesc = useMemo(
    () => [...state.months].sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)),
    [state.months]
  );

  const { points, current: currentCorpus } = useMemo(
    () => corpusTimeline(state.months, capital.remaining),
    [state.months, capital.remaining]
  );
  const corpusAfterById = useMemo(() => new Map(points.map((p) => [p.monthId, p.corpusAfter])), [points]);

  const totals = useMemo(() => {
    let revenue = 0;
    let expense = 0;
    const dividends: Record<string, number> = { shreyas: 0, tushar: 0, yashwanth: 0 };
    for (const m of state.months) {
      revenue += m.revenue;
      expense += monthTotalExpense(m);
      const d = monthDividends(m);
      for (const p of PARTNER_SHARES) dividends[p.id] += d[p.id];
    }
    return { revenue, expense, net: revenue - expense, dividends };
  }, [state.months]);

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
      <Container maxWidth="md" sx={{ pt: { xs: 4, md: 6 } }}>
        <PageHeader subtitle="Monthly revenue & expenses — net profit splits 50/25/25 between partners; a loss comes out of the corpus instead." />

        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <MetricCard
                label="Corpus"
                value={capital.loaded ? formatINR(currentCorpus, { compact: true }) : "Loading…"}
                accent={currentCorpus < 0 ? LOSS_COLOR : ACCENT}
                sublabel={capital.loaded ? `From ${formatINR(capital.remaining, { compact: true })} remaining setup capital` : undefined}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <MetricCard label="Total revenue" value={formatINR(totals.revenue, { compact: true })} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <MetricCard label="Total expenses" value={formatINR(totals.expense, { compact: true })} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <MetricCard
                label="Net, all-time"
                value={formatINR(totals.net, { compact: true })}
                accent={totals.net < 0 ? LOSS_COLOR : ACCENT}
              />
            </Grid>
          </Grid>

          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
              Dividends paid out, all-time (50 / 25 / 25)
            </Typography>
            <Grid container spacing={2}>
              {PARTNER_SHARES.map((p) => (
                <Grid key={p.id} size={{ xs: 4 }}>
                  <MetricCard label={`${p.name} (${p.pct * 100}%)`} value={formatINR(totals.dividends[p.id], { compact: true })} size="sm" />
                </Grid>
              ))}
            </Grid>
          </Box>

          {unlocked && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid rgba(255,159,67,0.3)" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: "#FF9F43" }}>
                Add a month (admin)
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
                The corpus isn't editable here — it's the remaining setup capital from the Expenses page, reduced by any month's loss.
              </Typography>
              <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 2, alignItems: "center" }}>
                <TextField
                  size="small"
                  type="month"
                  label="New month"
                  value={addMonthValue}
                  onChange={(e) => setAddMonthValue(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ width: 160 }}
                />
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={addMonth}
                  disabled={!addMonthValue || state.months.some((m) => m.id === addMonthValue)}
                  sx={{ color: "#04140a", fontWeight: 700 }}
                >
                  Add month
                </Button>
              </Stack>
            </Paper>
          )}

          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {!loaded
                ? "Loading…"
                : unlocked
                  ? "Edit mode — fill in each month's revenue and expenses as the numbers come in."
                  : "Read-only. An admin can edit this."}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: synced ? "primary.main" : "text.secondary", opacity: 0.8, ml: "auto" }}
            >
              {synced ? "● synced" : "● local only"}
            </Typography>
            {unlocked && saveStatus !== "idle" && (
              <Typography variant="caption" sx={{ color: saveStatus === "saving" ? "text.secondary" : "primary.main" }}>
                {saveStatus === "saving" ? "Saving…" : "Saved"}
              </Typography>
            )}
            {isAdmin && (
              <Button
                size="small"
                variant="outlined"
                startIcon={editMode ? <VisibilityOutlinedIcon /> : <EditOutlinedIcon />}
                onClick={() => setEditMode((e) => !e)}
                sx={{ borderColor: "rgba(255,255,255,0.2)" }}
              >
                {editMode ? "View" : "Edit"}
              </Button>
            )}
          </Stack>

          {loaded && sortedDesc.length === 0 && (
            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, textAlign: "center", border: "1px dashed rgba(255,255,255,0.15)" }}>
              <Typography sx={{ color: "text.secondary" }}>
                {unlocked ? "No months yet. Add one above." : "No months recorded yet."}
              </Typography>
            </Paper>
          )}

          <Stack spacing={2}>
            {sortedDesc.map((m) => {
              const totalExpense = monthTotalExpense(m);
              const net = monthNet(m);
              const loss = monthLoss(m);
              const dividends = monthDividends(m);
              const corpusAfter = corpusAfterById.get(m.id) ?? capital.remaining;
              return (
                <Paper key={m.id} elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 800 }}>{monthLabel(m.id)}</Typography>
                    {unlocked && (
                      <Tooltip title="Delete this month">
                        <IconButton size="small" onClick={() => removeMonth(m)} sx={{ color: LOSS_COLOR }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>

                  <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
                    <Typography variant="body2" sx={{ color: "text.secondary", minWidth: 70 }}>
                      Revenue
                    </Typography>
                    {unlocked ? (
                      <NumberField value={m.revenue} onChange={(v) => setRevenue(m.id, v)} sx={{ width: 140 }} />
                    ) : (
                      <Typography sx={{ fontWeight: 700 }}>{formatINR(m.revenue)}</Typography>
                    )}
                  </Stack>

                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                    Expenses
                  </Typography>
                  <Stack spacing={1} sx={{ mb: 1.5 }}>
                    {m.expenses.map((e: ExpenseLine) => (
                      <Stack key={e.id} direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                        {unlocked ? (
                          <>
                            <TextField
                              size="small"
                              placeholder="Label"
                              value={e.label}
                              onChange={(ev) => setExpenseLabel(m.id, e.id, ev.target.value)}
                              sx={{ width: 140 }}
                            />
                            <NumberField value={e.amount} onChange={(v) => setExpenseAmount(m.id, e.id, v)} sx={{ width: 120 }} />
                            <IconButton size="small" onClick={() => removeExpenseLine(m.id, e.id)} sx={{ color: "text.secondary" }}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </>
                        ) : (
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            {e.label || "(unlabeled)"}: <b style={{ color: "#F2F4F7" }}>{formatINR(e.amount)}</b>
                          </Typography>
                        )}
                      </Stack>
                    ))}
                    {unlocked && (
                      <Button size="small" startIcon={<AddIcon />} onClick={() => addExpenseLine(m.id)} sx={{ alignSelf: "flex-start", color: "text.secondary" }}>
                        Add expense line
                      </Button>
                    )}
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", mb: 1 }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Total expenses: {formatINR(totalExpense)}
                    </Typography>
                    <Typography sx={{ fontWeight: 800, ml: "auto", color: net < 0 ? LOSS_COLOR : ACCENT }}>
                      Net: {formatINR(net)}
                    </Typography>
                  </Stack>

                  {net > 0 ? (
                    <Grid container spacing={1}>
                      {PARTNER_SHARES.map((p) => (
                        <Grid key={p.id} size={{ xs: 4 }}>
                          <MetricCard label={`${p.name} (${p.pct * 100}%)`} value={formatINR(dividends[p.id], { compact: true })} size="sm" accent={ACCENT} />
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body2" sx={{ color: LOSS_COLOR }}>
                      {net < 0
                        ? `No payout this month — ${formatINR(loss)} loss absorbed by the corpus.`
                        : "Break-even — no payout this month."}
                    </Typography>
                  )}

                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
                    Corpus after this month: {formatINR(corpusAfter, { compact: true })}
                  </Typography>
                </Paper>
              );
            })}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
