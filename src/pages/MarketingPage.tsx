import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Checkbox, Chip, Container, Grid, Paper, Stack, Typography } from "@mui/material";
import {
  MARKETING_POSTS,
  OPENING_DATE,
  getDone,
  loadMarketingState,
  saveMarketingState,
  type MarketingState,
  type MarketingPost,
  type Phase,
} from "../lib/marketingCalendar";
import { PageHeader } from "../components/PageHeader";
import { MetricCard } from "../components/MetricCard";

const SAVE_DEBOUNCE_MS = 700;
const ACCENT = "#39FF88";
const PHASE_COLOR: Record<Phase, string> = {
  hype: ACCENT,
  build: "#4FC3F7",
  countdown: "#FFB648",
  launch: ACCENT,
};
const PHASE_SHORT: Record<Phase, string> = {
  hype: "Hype",
  build: "Build",
  countdown: "Countdown",
  launch: "Launch",
};

function dateParts(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return {
    dow: d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase(),
    dom: d.getDate(),
    mon: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    time: d.getTime(),
  };
}

function todayMidnight(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function PostRow({
  post,
  done,
  editable,
  onToggle,
}: {
  post: MarketingPost;
  done: boolean;
  editable: boolean;
  onToggle: () => void;
}) {
  const dp = dateParts(post.date);
  const today = todayMidnight();
  const overdue = !done && dp.time < today;
  const isToday = !done && dp.time === today;

  return (
    <Paper
      elevation={0}
      onClick={editable ? onToggle : undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        borderRadius: 3,
        bgcolor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderLeft: `3px solid ${PHASE_COLOR[post.phase]}`,
        cursor: editable ? "pointer" : "default",
        opacity: done ? 0.55 : 1,
      }}
    >
      <Checkbox
        checked={done}
        disabled={!editable}
        onClick={(e) => e.stopPropagation()}
        onChange={onToggle}
        sx={{ p: 0.5, color: "rgba(255,255,255,0.3)", "&.Mui-checked": { color: ACCENT } }}
      />
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
        <Typography
          sx={{ fontWeight: 700, textDecoration: done ? "line-through" : "none" }}
        >
          {post.title}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {post.note}
        </Typography>
      </Box>
      <Stack spacing={0.5} sx={{ alignItems: "flex-end", flexShrink: 0 }}>
        {overdue && <Chip label="Overdue" size="small" sx={{ bgcolor: "rgba(255,107,107,0.15)", color: "#FF6B6B", fontWeight: 700, height: 20 }} />}
        {isToday && <Chip label="Today" size="small" sx={{ bgcolor: "rgba(255,182,72,0.15)", color: "#FFB648", fontWeight: 700, height: 20 }} />}
        <Chip
          label={PHASE_SHORT[post.phase]}
          size="small"
          sx={{ height: 20, fontSize: 11, color: PHASE_COLOR[post.phase], borderColor: PHASE_COLOR[post.phase] }}
          variant="outlined"
        />
        <Chip label={post.platform === "linkedin" ? "LinkedIn" : "IG · FB"} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
        <Chip label={post.format} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
      </Stack>
    </Paper>
  );
}

export function MarketingPage() {
  const [state, setState] = useState<MarketingState>({});
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [synced, setSynced] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMarketingState().then((loadedState) => {
      if (!cancelled) {
        setState(loadedState);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveMarketingState(state).then((reachedSupabase) => {
        setSaveStatus("saved");
        setSynced(reachedSupabase);
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, loaded]);

  const toggle = (id: string) => {
    setState((prev) => ({ ...prev, [id]: !getDone(prev, id) }));
  };

  const igfbPosts = useMemo(() => MARKETING_POSTS.filter((p) => p.platform === "igfb"), []);
  const allPostsByDate = useMemo(
    () => [...MARKETING_POSTS].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    []
  );

  const stats = useMemo(() => {
    const done = igfbPosts.filter((p) => getDone(state, p.id)).length;
    return { total: igfbPosts.length, done, remaining: igfbPosts.length - done };
  }, [state, igfbPosts]);

  const daysLeft = useMemo(() => {
    const opening = new Date(`${OPENING_DATE}T00:00:00`).getTime();
    return Math.max(0, Math.ceil((opening - todayMidnight()) / 86400000));
  }, []);

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
        <PageHeader subtitle="Pre-opening Instagram/Facebook/LinkedIn posting schedule — Tue/Thu/Sat, counting down to opening day." />

        <Stack spacing={3}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: 4,
              background: "linear-gradient(160deg, rgba(57,255,136,0.06), rgba(61,178,255,0.05) 60%, rgba(20,23,28,1))",
              display: "flex",
              flexWrap: "wrap",
              gap: 3,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography sx={{ fontSize: { xs: 48, md: 64 }, fontWeight: 800, color: ACCENT, lineHeight: 1 }}>
                {daysLeft}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                days until opening — Oct 26
              </Typography>
            </Box>
            <Grid container spacing={2} sx={{ width: { xs: "100%", sm: "auto" } }}>
              <Grid size={4}>
                <MetricCard label="Total" value={stats.total} size="sm" />
              </Grid>
              <Grid size={4}>
                <MetricCard label="Posted" value={stats.done} size="sm" accent={ACCENT} />
              </Grid>
              <Grid size={4}>
                <MetricCard label="Left" value={stats.remaining} size="sm" />
              </Grid>
            </Grid>
          </Paper>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Tue · Thu · Sat — 3 posts/week on Instagram + Facebook
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: synced ? "primary.main" : "text.secondary", opacity: 0.8, ml: "auto" }}
            >
              {synced ? "● synced" : "● local only"}
            </Typography>
            {saveStatus !== "idle" && (
              <Typography variant="caption" sx={{ color: saveStatus === "saving" ? "text.secondary" : "primary.main" }}>
                {saveStatus === "saving" ? "Saving…" : "Saved"}
              </Typography>
            )}
          </Stack>

          {!loaded ? (
            <Typography sx={{ color: "text.secondary" }}>Loading…</Typography>
          ) : (
            <Stack spacing={1}>
              {allPostsByDate.map((post) => (
                <PostRow
                  key={post.id}
                  post={post}
                  done={getDone(state, post.id)}
                  editable
                  onToggle={() => toggle(post.id)}
                />
              ))}
            </Stack>
          )}

          <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center", pt: 1 }}>
            Tap a row to mark it posted. Saves automatically.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
