import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import AddIcon from "@mui/icons-material/Add";
import { PROPERTIES, totalCapitalPool } from "../config/properties";
import {
  getRow,
  loadExpenseState,
  saveExpenseState,
  rowExpectedTotal,
  rowFinalTotal,
  rowIsOrdered,
  type ExpenseState,
} from "../lib/expenses";
import {
  loadExpenseCatalog,
  createCategory,
  deleteCategory,
  createItem,
  deleteItem,
  type ExpenseCategory,
  type ExpenseItem,
} from "../lib/expenseCatalog";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { useAdmin } from "../state/adminAuth";
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

function ManageCatalog({
  categories,
  items,
  onCategoriesChange,
  onItemsChange,
}: {
  categories: ExpenseCategory[];
  items: ExpenseItem[];
  onCategoriesChange: (categories: ExpenseCategory[]) => void;
  onItemsChange: (items: ExpenseItem[]) => void;
}) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItemName, setNewItemName] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const result = await createCategory(name, categories.length);
    if (!result.ok || !result.category) {
      setError(result.error ?? "Couldn't add that category");
      return;
    }
    onCategoriesChange([...categories, result.category]);
    setNewCategoryName("");
  };

  const handleDeleteCategory = async (id: string) => {
    const result = await deleteCategory(id);
    if (!result.ok) {
      setError(result.error ?? "Couldn't delete that category");
      return;
    }
    onCategoriesChange(categories.filter((c) => c.id !== id));
  };

  const handleAddItem = async (categoryId: string) => {
    const name = (newItemName[categoryId] ?? "").trim();
    if (!name) return;
    const count = items.filter((i) => i.categoryId === categoryId).length;
    const result = await createItem(categoryId, name, count);
    if (!result.ok || !result.item) {
      setError(result.error ?? "Couldn't add that item");
      return;
    }
    onItemsChange([...items, result.item]);
    setNewItemName((prev) => ({ ...prev, [categoryId]: "" }));
  };

  const handleDeleteItem = async (id: string) => {
    const result = await deleteItem(id);
    if (!result.ok) {
      setError(result.error ?? "Couldn't delete that item");
      return;
    }
    onItemsChange(items.filter((i) => i.id !== id));
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, border: "1px solid rgba(255,159,67,0.3)" }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: "#FF9F43" }}>
        Manage categories & items
      </Typography>
      {error && (
        <Typography variant="body2" color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}
      <Stack spacing={2}>
        {categories.map((category) => {
          const categoryItems = items.filter((i) => i.categoryId === category.id);
          return (
            <Box key={category.id}>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {category.name}
                </Typography>
                <Tooltip title={categoryItems.length > 0 ? "Remove all items in this category first" : "Delete category"}>
                  <span>
                    <IconButton size="small" onClick={() => handleDeleteCategory(category.id)} disabled={categoryItems.length > 0} sx={{ color: "#FF6B6B" }}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
              <Stack spacing={0.5} sx={{ pl: 1, mt: 0.5 }}>
                {categoryItems.map((item) => (
                  <Stack key={item.id} direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {item.name}
                    </Typography>
                    <IconButton size="small" onClick={() => handleDeleteItem(item.id)} sx={{ color: "#FF6B6B" }}>
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Stack>
                ))}
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <TextField
                    size="small"
                    placeholder="New item name"
                    value={newItemName[category.id] ?? ""}
                    onChange={(e) => setNewItemName((prev) => ({ ...prev, [category.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddItem(category.id);
                    }}
                    sx={{ flex: 1 }}
                  />
                  <IconButton size="small" onClick={() => handleAddItem(category.id)}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Box>
          );
        })}
        <Stack direction="row" spacing={1} sx={{ pt: 1, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <TextField
            size="small"
            placeholder="New category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddCategory();
            }}
            sx={{ flex: 1, mt: 1 }}
          />
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={handleAddCategory} sx={{ mt: 1 }}>
            Add category
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export function ExpensesPage() {
  const { isAdmin } = useAdmin();
  const [editMode, setEditMode] = useState(false);
  const unlocked = isAdmin && editMode;
  const [state, setState] = useState<ExpenseState>({});
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If admin mode is exited (header chip, or a refresh) while this page had
  // edit mode on, drop back to view mode too — don't silently re-enter edit
  // mode next time isAdmin flips back true in the same session.
  useEffect(() => {
    if (!isAdmin) setEditMode(false);
  }, [isAdmin]);

  // Initial load — from Supabase if configured, else local backup/defaults.
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadExpenseState(), loadExpenseCatalog()]).then(([loadedState, catalog]) => {
      if (!cancelled) {
        setState(loadedState);
        setCategories(catalog.categories);
        setItems(catalog.items);
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

  const updateField = (id: string, field: keyof ExpenseState[string], value: number) => {
    setState((prev) => ({ ...prev, [id]: { ...getRow(prev, id), [field]: value } }));
  };

  const totals = useMemo(() => {
    let expected = 0;
    let final = 0;
    let ordered = 0;
    for (const item of items) {
      const row = getRow(state, item.id);
      expected += rowExpectedTotal(row, "small");
      final += rowFinalTotal(row, "small");
      if (rowIsOrdered(row, "small")) ordered += 1;
    }
    return { expected, final, ordered };
  }, [state, items]);

  const totalCapital = totalCapitalPool(PROPERTIES.small);
  const remainingCapital = totalCapital - totals.final;

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
        <PageHeader subtitle="Setup expenses checklist — expected vs. final (ordered) price and quantities. Saved automatically." />

        <Stack spacing={3}>
          {isAdmin && (
            <ManageCatalog categories={categories} items={items} onCategoriesChange={setCategories} onItemsChange={setItems} />
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <MetricCard
                label="Expected"
                value={formatINR(totals.expected, { compact: true })}
                sublabel="total setup budget"
                accent={PROPERTIES.small.accent}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <MetricCard
                label="Ordered so far"
                value={formatINR(totals.final, { compact: true })}
                sublabel={`${totals.ordered} of ${items.length} items`}
                accent={PROPERTIES.small.accent}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <MetricCard
                label="Total capital"
                value={formatINR(totalCapital, { compact: true })}
                sublabel="available pool"
                accent={PROPERTIES.small.accent}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <MetricCard
                label="Remaining capital"
                value={formatINR(remainingCapital, { compact: true })}
                sublabel="after money spent so far"
                accent={remainingCapital >= 0 ? PROPERTIES.small.accent : "#FF6B6B"}
              />
            </Grid>
          </Grid>

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
                      : isAdmin
                        ? "Read-only. Click Edit to make changes."
                        : "Read-only. An admin can edit this (tap the logo 5x on any page to unlock admin mode)."}
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
            </Stack>

            {/* Mobile card layout (xs–sm) */}
            <Box sx={{ display: { xs: "block", md: "none" }, mt: 2 }}>
              {categories.map((category) => {
                const categoryItems = items.filter((i) => i.categoryId === category.id);
                if (categoryItems.length === 0) return null;
                return (
                  <Box key={category.id} sx={{ mb: 2.5 }}>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "text.secondary" }}
                    >
                      {category.name}
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {categoryItems.map((item) => {
                        const row = getRow(state, item.id);
                        return (
                          <Paper key={item.id} elevation={0} sx={{ p: 1.5, borderRadius: 3, border: "1px solid rgba(255,255,255,0.08)" }}>
                            <Typography sx={{ fontWeight: 700, mb: 1 }}>{item.name}</Typography>
                            <Grid container spacing={1.5}>
                              <Grid size={4}>
                                <Typography variant="caption" sx={{ color: "text.secondary" }}>Qty</Typography>
                                <EditableValue value={row.qtySmall} onChange={(v) => updateField(item.id, "qtySmall", v)} unlocked={unlocked} accent={PROPERTIES.small.accent} fullWidth />
                              </Grid>
                              <Grid size={4}>
                                <Typography variant="caption" sx={{ color: "text.secondary" }}>Expected/unit</Typography>
                                <EditableValue value={row.expSmall} onChange={(v) => updateField(item.id, "expSmall", v)} unlocked={unlocked} accent={PROPERTIES.small.accent} fullWidth />
                              </Grid>
                              <Grid size={4}>
                                <Typography variant="caption" sx={{ color: "text.secondary" }}>Final/unit</Typography>
                                <EditableValue value={row.finSmall} onChange={(v) => updateField(item.id, "finSmall", v)} unlocked={unlocked} accent={PROPERTIES.small.accent} fullWidth />
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
                <Table size="small" sx={{ minWidth: 520 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...headCellSx, minWidth: 180 }}>Item</TableCell>
                      <TableCell align="right" sx={{ ...headCellSx, borderLeft: "1px solid rgba(255,255,255,0.12)" }}>Qty</TableCell>
                      <TableCell align="right" sx={headCellSx}>Expected/unit</TableCell>
                      <TableCell align="right" sx={headCellSx}>Final/unit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categories.map((category) => {
                      const categoryItems = items.filter((i) => i.categoryId === category.id);
                      if (categoryItems.length === 0) return null;
                      const catExpSmall = categoryItems.reduce((s, i) => s + rowExpectedTotal(getRow(state, i.id), "small"), 0);
                      const catFinSmall = categoryItems.reduce((s, i) => s + rowFinalTotal(getRow(state, i.id), "small"), 0);
                      return (
                        <Fragment key={category.id}>
                          <TableRow>
                            <TableCell
                              colSpan={4}
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
                              {category.name}
                            </TableCell>
                          </TableRow>
                          {categoryItems.map((item) => {
                            const row = getRow(state, item.id);
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
                              </TableRow>
                            );
                          })}
                          <TableRow>
                            <TableCell sx={{ color: "text.secondary", fontWeight: 700, fontStyle: "italic" }}>
                              {category.name} subtotal
                            </TableCell>
                            <TableCell colSpan={2} align="right" sx={{ borderLeft: "1px solid rgba(255,255,255,0.06)", color: PROPERTIES.small.accent, fontWeight: 700 }}>
                              {formatINR(catExpSmall, { compact: true })} exp.
                            </TableCell>
                            <TableCell align="right" sx={{ color: PROPERTIES.small.accent, fontWeight: 700 }}>
                              {catFinSmall > 0 ? `${formatINR(catFinSmall, { compact: true })} fin.` : "—"}
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
                        {formatINR(totals.expected, { compact: true })} exp.
                      </TableCell>
                      <TableCell align="right" sx={{ borderTop: "2px solid rgba(255,255,255,0.2)", color: PROPERTIES.small.accent, fontWeight: 800, fontSize: 14 }}>
                        {totals.final > 0 ? `${formatINR(totals.final, { compact: true })} fin.` : "—"}
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
    </Box>
  );
}
