import { useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Rotate90DegreesCwIcon from "@mui/icons-material/Rotate90DegreesCw";
import UndoIcon from "@mui/icons-material/Undo";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { PageHeader } from "../components/PageHeader";
import { DesignCanvas } from "../components/DesignCanvas";
import { useFurnitureLayout } from "../state/furnitureLayout";
import { useAdmin } from "../state/adminAuth";
import { footprint } from "../config/layout";
import type { CatalogEntry } from "../lib/furnitureCatalog";

interface CatalogOption extends CatalogEntry {
  isNew?: boolean;
}

function AddObjectControl() {
  const { catalog, addInstance, addCatalogEntry } = useFurnitureLayout();
  const [inputValue, setInputValue] = useState("");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWidth, setNewWidth] = useState(3);
  const [newDepth, setNewDepth] = useState(3);
  const [newElevation, setNewElevation] = useState(3);
  const [newColor, setNewColor] = useState("#4C8BF5");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleSelect = (option: CatalogOption | null) => {
    if (!option) return;
    if (option.isNew) {
      setNewName(inputValue.trim());
      setNewDialogOpen(true);
    } else {
      addInstance(option);
    }
    setInputValue("");
  };

  const handleCreateSubmit = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    const id = `${newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;
    const entry: CatalogEntry = {
      id,
      name: newName.trim(),
      builtin: false,
      renderType: "generic",
      defaultWidth: newWidth,
      defaultDepth: newDepth,
      defaultElevation: newElevation,
      color: newColor,
    };
    const result = await addCatalogEntry(entry);
    setCreating(false);
    if (!result.ok) {
      setCreateError(result.error ?? "Couldn't save this new type");
      return;
    }
    addInstance(entry);
    setNewDialogOpen(false);
  };

  return (
    <>
      <Autocomplete<CatalogOption>
        size="small"
        options={catalog}
        inputValue={inputValue}
        onInputChange={(_, v) => setInputValue(v)}
        onChange={(_, v) => handleSelect(v)}
        value={null}
        getOptionLabel={(o) => o.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        filterOptions={(options, state) => {
          const query = state.inputValue.trim().toLowerCase();
          const matches = query ? options.filter((o) => o.name.toLowerCase().includes(query)) : options;
          if (query && !matches.some((o) => o.name.toLowerCase() === query)) {
            const newOption: CatalogOption = {
              id: "__new__",
              name: state.inputValue.trim(),
              builtin: false,
              renderType: "generic",
              defaultWidth: 3,
              defaultDepth: 3,
              defaultElevation: 3,
              isNew: true,
            };
            return [...matches, newOption];
          }
          return matches;
        }}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            {option.isNew ? (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  + Create "{option.name}"
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  New types show as a plain labeled box in 3D — no detailed model, just size + color.
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2">{option.name}</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {option.defaultWidth}×{option.defaultDepth} ft{option.builtin ? "" : " · custom"}
                </Typography>
              </Box>
            )}
          </li>
        )}
        renderInput={(params) => <TextField {...params} placeholder="Search or add an object…" />}
        sx={{ minWidth: 260, flex: 1 }}
      />

      <Dialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New object type</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info" variant="outlined">
              This will show as a plain labeled box in the 3D walkthrough — not a detailed model like the pool
              table or TV.
            </Alert>
            <TextField label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="Width (ft)" type="number" value={newWidth} onChange={(e) => setNewWidth(Number(e.target.value))} fullWidth />
              <TextField label="Depth (ft)" type="number" value={newDepth} onChange={(e) => setNewDepth(Number(e.target.value))} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <TextField
                label="Height (ft)"
                type="number"
                value={newElevation}
                onChange={(e) => setNewElevation(Number(e.target.value))}
                fullWidth
              />
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                style={{ width: 48, height: 40, border: "none", background: "none", cursor: "pointer" }}
              />
            </Stack>
            {createError && (
              <Typography variant="body2" color="error">
                {createError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDialogOpen(false)} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button onClick={handleCreateSubmit} variant="contained" disabled={creating || !newName.trim()} sx={{ color: "#04140a" }}>
            {creating ? "Creating…" : "Create & add"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function DesignPage() {
  const {
    items,
    removeInstance,
    updatePosition,
    updateFootprintSize,
    updateElevation,
    beginGesture,
    toggleRotation,
    resetOne,
    resetAll,
    isMoved,
    canUndo,
    undo,
    exportCode,
    importCode,
    publishing,
    publishAsDefault,
  } = useFurnitureLayout();
  const { isAdmin } = useAdmin();

  const [copySnack, setCopySnack] = useState(false);
  const [importValue, setImportValue] = useState("");
  const [importError, setImportError] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishSnack, setPublishSnack] = useState<{ ok: boolean; error?: string } | null>(null);

  const handleCopy = async () => {
    const code = exportCode();
    try {
      await navigator.clipboard.writeText(code);
      setCopySnack(true);
    } catch {
      // clipboard API unavailable — nothing we can do silently, user can select-copy manually elsewhere
    }
  };

  const handleImport = () => {
    const ok = importCode(importValue);
    setImportError(!ok);
    if (ok) setImportValue("");
  };

  const handlePublish = async () => {
    setPublishConfirmOpen(false);
    const result = await publishAsDefault();
    setPublishSnack(result);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 8 }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 6 } }}>
        <PageHeader subtitle="Drag any piece of furniture to try a different layout (it snaps flush to walls and neighbours; use the red × to remove one), then walk through it in 3D. This is a personal what-if sandbox — it only changes the committed Floor Plan when an admin publishes it." />

        {isAdmin && (
          <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, mb: 3, border: "1px solid rgba(255,159,67,0.3)" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: "#FF9F43" }}>
              Add an object
            </Typography>
            <Stack direction="row" spacing={1}>
              <AddObjectControl />
            </Stack>
          </Paper>
        )}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Drag to rearrange
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Tooltip title="Undo (Ctrl+Z)">
                    <span>
                      <IconButton size="small" onClick={undo} disabled={!canUndo}>
                        <UndoIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Discard everything above and go back to the published layout from the database">
                    <Button size="small" startIcon={<RestartAltIcon />} onClick={resetAll} sx={{ color: "text.secondary" }}>
                      Reset to published
                    </Button>
                  </Tooltip>
                </Stack>
              </Stack>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                Click and drag any piece. It turns red if it overlaps something else or lands outside the actual
                room shape — that's a warning, not a block, so you can still see how tight a squeeze it'd be.
                Ctrl+Z (Cmd+Z on Mac) undoes the last move, resize, or rotate. Changes here are saved in this
                browser only (they'll survive a normal refresh) — "Reset to published" wipes them and goes back
                to what's actually live on the Floor Plan page.
              </Typography>
              <DesignCanvas />
            </Paper>

            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, mt: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                Share this layout
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
                Copy a code for what you've built here and send it to Shreyas — he can paste it back in to see it
                and decide whether to make it the real layout.
              </Typography>
              <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopy}>
                Copy layout code
              </Button>

              {isAdmin && (
                <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: "#FF9F43" }}>
                    Admin
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Paste a layout code someone sent you"
                      value={importValue}
                      onChange={(e) => {
                        setImportValue(e.target.value);
                        setImportError(false);
                      }}
                      error={importError}
                      helperText={importError ? "That code didn't look right" : " "}
                    />
                    <Button variant="outlined" onClick={handleImport} disabled={!importValue.trim()}>
                      Load
                    </Button>
                  </Stack>
                  <Button
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => setPublishConfirmOpen(true)}
                    disabled={publishing}
                    sx={{ color: "#04140a" }}
                  >
                    {publishing ? "Publishing…" : "Save as default for everyone"}
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Precise positions
                </Typography>
                <Button size="small" startIcon={<RestartAltIcon />} onClick={resetAll} sx={{ color: "text.secondary" }}>
                  Reset all to published
                </Button>
              </Stack>

              <Stack spacing={1.5} sx={{ maxHeight: 520, overflowY: "auto" }}>
                {items.map((item) => {
                  const foot = footprint(item);
                  return (
                    <Stack key={item.id} spacing={0.75} sx={{ p: 1, borderRadius: 2, bgcolor: "rgba(255,255,255,0.03)" }}>
                      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                            {item.label}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {item.typeName}
                            {item.rotationSteps ? ` · turned ${item.rotationSteps * 90}°` : ""}
                          </Typography>
                        </Box>
                        <Stack direction="row">
                          <Tooltip title="Rotate 90°">
                            <span>
                              <IconButton size="small" onClick={() => toggleRotation(item.id)}>
                                <Rotate90DegreesCwIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={isMoved(item.id) ? "Reset to default" : "Not moved"}>
                            <span>
                              <IconButton size="small" onClick={() => resetOne(item.id)} disabled={!isMoved(item.id)}>
                                <RestartAltIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Remove this object (Ctrl+Z to undo)">
                            <IconButton size="small" onClick={() => removeInstance(item.id)} sx={{ color: "#FF6B6B" }}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                        <TextField
                          label="x"
                          type="number"
                          size="small"
                          value={item.x}
                          onFocus={beginGesture}
                          onChange={(e) => updatePosition(item.id, Number(e.target.value), item.y)}
                          sx={{ width: 64 }}
                        />
                        <TextField
                          label="y"
                          type="number"
                          size="small"
                          value={item.y}
                          onFocus={beginGesture}
                          onChange={(e) => updatePosition(item.id, item.x, Number(e.target.value))}
                          sx={{ width: 64 }}
                        />
                        <TextField
                          label="width"
                          type="number"
                          size="small"
                          value={foot.w}
                          onFocus={beginGesture}
                          onChange={(e) => updateFootprintSize(item.id, Number(e.target.value), foot.h)}
                          sx={{ width: 72 }}
                        />
                        <TextField
                          label="length"
                          type="number"
                          size="small"
                          value={foot.h}
                          onFocus={beginGesture}
                          onChange={(e) => updateFootprintSize(item.id, foot.w, Number(e.target.value))}
                          sx={{ width: 72 }}
                        />
                        <TextField
                          label="height"
                          type="number"
                          size="small"
                          value={item.elevation}
                          onFocus={beginGesture}
                          onChange={(e) => updateElevation(item.id, Number(e.target.value))}
                          sx={{ width: 72 }}
                        />
                      </Stack>
                    </Stack>
                  );
                })}
              </Stack>

              <Button
                component={RouterLink}
                to="/walkthrough"
                variant="contained"
                fullWidth
                startIcon={<ViewInArIcon />}
                sx={{ color: "#04140a", mt: 3 }}
              >
                See it in 3D
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Dialog open={publishConfirmOpen} onClose={() => setPublishConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Publish this layout?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This replaces the layout every visitor sees on the Floor Plan page (and the Walkthrough's starting
            point) — not just your own browser. Your local sandbox tweaks will be cleared since they're baked in
            now.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishConfirmOpen(false)} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button onClick={handlePublish} variant="contained" sx={{ color: "#04140a" }}>
            Publish
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={copySnack} autoHideDuration={2500} onClose={() => setCopySnack(false)} message="Layout code copied" />
      <Snackbar open={publishSnack !== null} autoHideDuration={7000} onClose={() => setPublishSnack(null)}>
        <Alert severity={publishSnack?.ok ? "success" : "error"} onClose={() => setPublishSnack(null)}>
          {publishSnack?.ok
            ? "Published — this is now the default for everyone."
            : `Publish failed${publishSnack?.error ? `: ${publishSnack.error}` : ""}`}
        </Alert>
      </Snackbar>
    </Box>
  );
}
