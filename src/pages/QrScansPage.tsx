import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Box, Container, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { PageHeader } from "../components/PageHeader";
import { MetricCard } from "../components/MetricCard";
import { loadQrScans, countsByBanner, deviceLabel, locationLabel, scansByDay, type QrScan } from "../lib/qrScans";

// The two banners currently live — add to this list as new banners go up.
// Must match the slugs printed on each banner's actual QR code (encoded as
// <QR_BASE_URL>/api/qr/<id>, see api/qr/[banner].ts), and these are just
// display labels — the ids themselves live wherever the QR codes were made.
const KNOWN_BANNERS: { id: string; label: string }[] = [
  { id: "shop", label: "Shop" },
  { id: "others", label: "Others" },
];

// Production domain — the only place these redirect links actually work,
// since api/qr/[banner].ts is a Vercel serverless function (no equivalent
// running in local `npm run dev`).
const QR_BASE_URL = "https://gorilla8-planning.vercel.app";

export function QrScansPage() {
  const [scans, setScans] = useState<QrScan[] | null | "loading">("loading");

  useEffect(() => {
    loadQrScans().then(setScans);
  }, []);

  if (scans === "loading") {
    return (
      <PageShell>
        <Typography sx={{ color: "text.secondary" }}>Loading scans…</Typography>
      </PageShell>
    );
  }

  if (scans === null) {
    return (
      <PageShell>
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: "1px solid rgba(255,107,107,0.3)" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: "#FF6B6B" }}>
            qr_scans table not found
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Run the <code>qr_scans</code> block at the bottom of <code>supabase_new_tables.sql</code> in the
            Supabase SQL editor (same place you've run the others), then reload this page.
          </Typography>
        </Paper>
      </PageShell>
    );
  }

  const banners = countsByBanner(scans);
  const knownIds = new Set(KNOWN_BANNERS.map((b) => b.id));
  const extraBanners = banners.filter((b) => !knownIds.has(b.bannerId));
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = scans.filter((s) => s.scannedAt.slice(0, 10) === todayKey).length;
  const dayData = scansByDay(scans, 14);
  const recent = scans.slice(0, 25);

  return (
    <PageShell>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
        <MetricCard label="Total scans" value={String(scans.length)} accent="#39FF88" />
        <MetricCard label="Today" value={String(todayCount)} />
        <MetricCard label="Banners tracked" value={String(KNOWN_BANNERS.length)} sublabel="distinct QR codes" />
      </Box>

      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          Banner QR links
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          Generate a QR code for each link below (any free QR generator) and print it on that banner. Scanning it
          logs the visit here, then redirects straight to the Google Maps location — no app, no permission
          prompt, no added step for the person scanning.
        </Typography>
        <Stack spacing={1.5}>
          {KNOWN_BANNERS.map((b) => {
            const count = banners.find((c) => c.bannerId === b.id)?.count ?? 0;
            return (
              <Stack
                key={b.id}
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{
                  justifyContent: "space-between",
                  alignItems: { sm: "center" },
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.03)",
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{b.label}</Typography>
                  <Typography
                    component="code"
                    sx={{ fontSize: "0.8rem", color: "#3DB2FF", wordBreak: "break-all" }}
                  >
                    {QR_BASE_URL}/api/qr/{b.id}
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 800, color: "#39FF88" }}>{count} scans</Typography>
              </Stack>
            );
          })}
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          Scans per day — last 14 days
        </Typography>
        <Box sx={{ width: "100%", height: 280 }}>
          <BarChart
            height={280}
            series={[{ data: dayData.map((d) => d.count), label: "Scans", color: "#39FF88" }]}
            xAxis={[{ data: dayData.map((d) => d.date.slice(5)), scaleType: "band" }]}
            grid={{ horizontal: true }}
            sx={{
              "& .MuiChartsAxis-tickLabel": { fill: "#9AA4B2" },
              "& .MuiChartsAxis-label": { fill: "#9AA4B2" },
              "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": { stroke: "rgba(255,255,255,0.15)" },
            }}
          />
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
          Recent scans
        </Typography>
        {recent.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No scans logged yet.
          </Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>When</TableCell>
                  <TableCell>Banner</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Device</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recent.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{new Date(s.scannedAt).toLocaleString("en-IN")}</TableCell>
                    <TableCell>{KNOWN_BANNERS.find((b) => b.id === s.bannerId)?.label ?? s.bannerId}</TableCell>
                    <TableCell>{locationLabel(s)}</TableCell>
                    <TableCell>{deviceLabel(s.userAgent)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {extraBanners.length > 0 && (
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Scans also came in for banner id(s) not in the known list above: {extraBanners.map((b) => b.bannerId).join(", ")}.
            Add them to <code>KNOWN_BANNERS</code> in QrScansPage.tsx to label them properly.
          </Typography>
        </Paper>
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: ReactNode }) {
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
        <PageHeader subtitle="Who's scanning the banner QR codes — which banner, when, roughly where from, and what device." />
        <Stack spacing={3}>{children}</Stack>
      </Container>
    </Box>
  );
}
