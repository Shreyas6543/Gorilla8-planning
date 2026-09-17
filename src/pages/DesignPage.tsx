import { useState } from "react";
import {
  Alert,
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
import { PageHeader } from "../components/PageHeader";
import { DesignCanvas } from "../components/DesignCanvas";
import { useFurnitureLayout } from "../state/furnitureLayout";
import { useAdmin } from "../state/adminAuth";
import { footprint } from "../config/layout";

const TYPE_LABEL: Record<string, string> = {
  pool: "Pool table",
  ps5: "PS5 station",
  racingSim: "Racing simulator",
  counter: "Counter",
  cabinet: "Cabinet",
};

export function DesignPage() {
  const {
    items,
    updatePosition,
    updateFootprintSize,
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
  const [publishSnack, setPublishSnack] = useState<"ok" | "fail" | null>(null);

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
    const ok = await publishAsDefault();
    setPublishSnack(ok ? "ok" : "fail");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 8 }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 6 } }}>
        <PageHeader subtitle="Drag any piece of furniture to try a different layout, then walk through it in 3D. This is a personal what-if sandbox — it only changes the committed Floor Plan when an admin publishes it." />

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Drag to rearrange
                </Typography>
                <Tooltip title="Undo (Ctrl+Z)">
                  <span>
                    <IconButton size="small" onClick={undo} disabled={!canUndo}>
                      <UndoIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                Click and drag any piece. It turns red if it overlaps something else or lands outside the actual
                room shape — that's a warning, not a block, so you can still see how tight a squeeze it'd be.
                Ctrl+Z (Cmd+Z on Mac) undoes the last move, resize, or rotate.
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
                  Reset all
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
                            {TYPE_LABEL[item.type]}
                            {item.rotated ? " · rotated" : ""}
                          </Typography>
                        </Box>
                        <Stack direction="row">
                          <Tooltip title="Rotate 90°">
                            <IconButton size="small" onClick={() => toggleRotation(item.id)}>
                              <Rotate90DegreesCwIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={isMoved(item.id) ? "Reset to default" : "Not moved"}>
                            <span>
                              <IconButton size="small" onClick={() => resetOne(item.id)} disabled={!isMoved(item.id)}>
                                <RestartAltIcon fontSize="small" />
                              </IconButton>
                            </span>
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
      <Snackbar open={publishSnack !== null} autoHideDuration={4000} onClose={() => setPublishSnack(null)}>
        <Alert severity={publishSnack === "ok" ? "success" : "error"} onClose={() => setPublishSnack(null)}>
          {publishSnack === "ok" ? "Published — this is now the default for everyone." : "Publish failed — check Supabase is configured and try again."}
        </Alert>
      </Snackbar>
    </Box>
  );
}
