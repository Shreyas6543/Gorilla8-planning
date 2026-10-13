import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  PAYMENT_METHODS,
  loadLedger,
  newEntryId,
  saveLedger,
  type LedgerEntry,
  type PaymentMethod,
} from "../lib/ledger";
import { loadExpenseCatalog } from "../lib/expenseCatalog";
import { formatINR } from "../lib/calculations";
import { useAdmin } from "../state/adminAuth";
import { PageHeader } from "../components/PageHeader";
import { MetricCard } from "../components/MetricCard";

const ACCENT = "#39FF88";
const OTHER = "Other";

interface Draft {
  id: string | null; // null = new entry
  date: string;
  description: string;
  category: string;
  amount: string; // kept as text while typing
  vendor: string;
  method: PaymentMethod;
  notes: string;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function blankDraft(): Draft {
  return { id: null, date: todayISO(), description: "", category: OTHER, amount: "", vendor: "", method: "UPI", notes: "" };
}

function dateParts(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { dow: "", dom: "—", mon: "" };
  return {
    dow: d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase(),
    dom: String(d.getDate()),
    mon: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
  };
}

export function LedgerPage() {
  const { isAdmin } = useAdmin();
  const [editMode, setEditMode] = useState(false);
  const unlocked = isAdmin && editMode;
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [synced, setSynced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalogCategories, setCatalogCategories] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Same rule as the Expenses page: everyone can view, only admins get Edit.
  // If admin mode is exited while edit mode was on, drop back to view mode.
  useEffect(() => {
    if (!isAdmin) setEditMode(false);
  }, [isAdmin]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadLedger(), loadExpenseCatalog()]).then(([loadedEntries, catalog]) => {
      if (cancelled) return;
      setEntries(loadedEntries);
      setCatalogCategories(catalog.categories.map((c) => c.name));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Each add/edit/delete is a discrete action, so save immediately rather
  // than debouncing — nothing to lose by closing the tab right after.
  const commit = (next: LedgerEntry[]) => {
    setEntries(next);
    setSaving(true);
    saveLedger(next).then((reachedSupabase) => {
      setSynced(reachedSupabase);
      setSaving(false);
    });
  };

  const categoryOptions = useMemo(() => {
    const names = catalogCategories.filter((n) => n !== OTHER);
    if (draft && draft.category !== OTHER && !names.includes(draft.category)) names.push(draft.category);
    return [...names, OTHER];
  }, [catalogCategories, draft]);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [entries]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((e) => {
      if (categoryFilter && e.category !== categoryFilter) return false;
      if (!q) return true;
      return [e.description, e.vendor, e.category, e.notes].some((f) => f.toLowerCase().includes(q));
    });
  }, [sorted, search, categoryFilter]);

  const stats = useMemo(() => {
    const monthPrefix = todayISO().slice(0, 7);
    const total = entries.reduce((s, e) => s + e.amount, 0);
    const thisMonth = entries.filter((e) => e.date.startsWith(monthPrefix)).reduce((s, e) => s + e.amount, 0);
    const byCategory = new Map<string, number>();
    for (const e of entries) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
    return {
      total,
      thisMonth,
      byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [entries]);

  const visibleTotal = useMemo(() => visible.reduce((s, e) => s + e.amount, 0), [visible]);
  const filtering = search.trim() !== "" || categoryFilter !== null;

  const openEdit = (e: LedgerEntry) =>
    setDraft({
      id: e.id,
      date: e.date,
      description: e.description,
      category: e.category,
      amount: String(e.amount),
      vendor: e.vendor,
      method: e.method,
      notes: e.notes,
    });

  const draftAmount = draft ? Number(draft.amount) : 0;
  const draftValid = !!draft && draft.description.trim() !== "" && draft.date !== "" && draftAmount > 0;

  const submitDraft = () => {
    if (!draft || !draftValid) return;
    const entry: LedgerEntry = {
      id: draft.id ?? newEntryId(),
      date: draft.date,
      description: draft.description.trim(),
      category: draft.category,
      amount: draftAmount,
      vendor: draft.vendor.trim(),
      method: draft.method,
      notes: draft.notes.trim(),
    };
    // New entries go on the front so same-date entries list newest first.
    commit(draft.id ? entries.map((e) => (e.id === draft.id ? entry : e)) : [entry, ...entries]);
    setDraft(null);
  };

  const removeEntry = (e: LedgerEntry) => {
    if (window.confirm(`Delete "${e.description}" (${formatINR(e.amount)})?`)) {
      commit(entries.filter((x) => x.id !== e.id));
    }
  };

  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));

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
        <PageHeader subtitle="Ledger — every rupee actually spent, by date." />

        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 4 }}>
              <MetricCard label="Total spent" value={formatINR(stats.total)} accent={ACCENT} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <MetricCard label="This month" value={formatINR(stats.thisMonth)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <MetricCard label="Entries" value={entries.length} />
            </Grid>
          </Grid>

          {stats.byCategory.length > 0 && (
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                By category — tap to filter
              </Typography>
              <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
                {stats.byCategory.map(([name, total]) => {
                  const active = categoryFilter === name;
                  return (
                    <Chip
                      key={name}
                      clickable
                      size="small"
                      label={`${name} · ${formatINR(total, { compact: true })}`}
                      onClick={() => setCategoryFilter(active ? null : name)}
                      variant={active ? "filled" : "outlined"}
                      sx={active ? { bgcolor: ACCENT, color: "#04140a", fontWeight: 700 } : undefined}
                    />
                  );
                })}
              </Stack>
            </Box>
          )}

          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="Search description, vendor, notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1 }}
            />
            {isAdmin && (
              <Button
                size="small"
                variant="outlined"
                startIcon={editMode ? <VisibilityOutlinedIcon /> : <EditOutlinedIcon />}
                onClick={() => setEditMode((e) => !e)}
                sx={{ borderColor: "rgba(255,255,255,0.2)", flexShrink: 0 }}
              >
                {editMode ? "View" : "Edit"}
              </Button>
            )}
            {unlocked && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setDraft(blankDraft())}
                sx={{ color: "#04140a", fontWeight: 700, flexShrink: 0 }}
              >
                Add expense
              </Button>
            )}
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {filtering
                ? `${visible.length} of ${entries.length} entries · ${formatINR(visibleTotal)}`
                : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: synced ? "primary.main" : "text.secondary", opacity: 0.8, ml: "auto" }}
            >
              {synced ? "● synced" : "● local only"}
            </Typography>
            {saving && (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Saving…
              </Typography>
            )}
          </Stack>

          {!loaded ? (
            <Typography sx={{ color: "text.secondary" }}>Loading…</Typography>
          ) : visible.length === 0 ? (
            <Paper
              elevation={0}
              sx={{ p: 4, borderRadius: 4, textAlign: "center", border: "1px dashed rgba(255,255,255,0.15)" }}
            >
              <Typography sx={{ color: "text.secondary" }}>
                {entries.length === 0 ? (unlocked ? "No expenses yet. Add your first one." : "No expenses yet.") : "No entries match."}
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={1}>
              {visible.map((e) => {
                const dp = dateParts(e.date);
                return (
                  <Paper
                    key={e.id}
                    elevation={0}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 3,
                      bgcolor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <Box sx={{ textAlign: "center", minWidth: 46, fontFamily: "monospace" }}>
                      <Typography variant="caption" sx={{ display: "block", color: "text.secondary", lineHeight: 1 }}>
                        {dp.dow}
                      </Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: 20, lineHeight: 1.1 }}>{dp.dom}</Typography>
                      <Typography variant="caption" sx={{ display: "block", color: "text.secondary", lineHeight: 1 }}>
                        {dp.mon}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, wordBreak: "break-word" }}>{e.description}</Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", wordBreak: "break-word" }}>
                        {[e.vendor, e.method].filter(Boolean).join(" · ")}
                      </Typography>
                      {e.notes && (
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", wordBreak: "break-word" }}>
                          {e.notes}
                        </Typography>
                      )}
                      <Chip label={e.category} size="small" variant="outlined" sx={{ height: 20, fontSize: 11, mt: 0.5 }} />
                    </Box>
                    <Stack sx={{ alignItems: "flex-end", flexShrink: 0 }}>
                      <Typography sx={{ fontWeight: 800, color: ACCENT }}>{formatINR(e.amount)}</Typography>
                      {unlocked && (
                        <Stack direction="row">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(e)}>
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => removeEntry(e)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Container>

      <Dialog open={unlocked && draft !== null} onClose={() => setDraft(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{draft?.id ? "Edit expense" : "Add expense"}</DialogTitle>
        <DialogContent>
          {draft && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                autoFocus
                label="What was it for?"
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitDraft();
                }}
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Amount"
                  type="number"
                  value={draft.amount}
                  onChange={(e) => patch({ amount: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitDraft();
                  }}
                  slotProps={{
                    input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                    htmlInput: { min: 0, inputMode: "decimal" },
                  }}
                  fullWidth
                />
                <TextField
                  label="Date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => patch({ date: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
              </Stack>
              <TextField select label="Category" value={draft.category} onChange={(e) => patch({ category: e.target.value })} fullWidth>
                {categoryOptions.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
              <Stack direction="row" spacing={2}>
                <TextField label="Paid to (vendor)" value={draft.vendor} onChange={(e) => patch({ vendor: e.target.value })} fullWidth />
                <TextField
                  select
                  label="Paid via"
                  value={draft.method}
                  onChange={(e) => patch({ method: e.target.value as PaymentMethod })}
                  fullWidth
                >
                  {PAYMENT_METHODS.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <TextField label="Notes (optional)" value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} multiline minRows={2} fullWidth />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDraft(null)} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button onClick={submitDraft} variant="contained" disabled={!draftValid} sx={{ color: "#04140a" }}>
            {draft?.id ? "Save" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
