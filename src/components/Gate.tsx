import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAdmin } from "../state/adminAuth";
import { useViewer } from "../state/viewerAuth";

// Wraps every internal/business route (Home, Expenses, Ledger, Finance,
// Marketing, Floor Plan, Design, Walkthrough, QR Scans — see App.tsx).
// Bounces anyone who's neither admin nor a recognized "viewer" to the
// public /coming-soon page instead of rendering the page at all.
//
// This exists because a banner QR now funnels strangers to /coming-soon —
// before that, the only people with this site's URL at all were Shreyas
// and his two partners, so leaving every page world-readable (by design,
// see CLAUDE.md's Supabase RLS notes) was a reasonable tradeoff. It no
// longer is, now that the URL is printed on a public banner and one tap
// of the back button lands on the real site.
//
// NOTE: renaming routes to "unguessable" slugs would NOT have fixed this —
// this repo is public on GitHub, so src/App.tsx (and every route name in
// it) is plainly readable by anyone who checks. This passcode-backed gate
// is the actual barrier; the URL itself doesn't need to be a secret.
//
// Unlock happens at /team (TeamAccessPage.tsx), not here — this component
// only ever redirects away, it never shows a passcode field itself.
export function Gate({ children }: { children: ReactNode }) {
  const { isAdmin } = useAdmin();
  const { isViewer } = useViewer();

  if (isAdmin || isViewer) return <>{children}</>;

  return <Navigate to="/coming-soon" replace />;
}
