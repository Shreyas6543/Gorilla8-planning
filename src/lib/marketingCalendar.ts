import { supabase, isSupabaseConfigured } from "./supabaseClient";

// Pre-opening social media posting schedule. Fixed content (dates/ideas) —
// same shape as expenseCatalog.ts's SEED_ITEMS: hardcoded here, not
// admin-editable, since this is a one-time launch plan, not an ongoing
// checklist. Only which posts are DONE is persisted (table marketing_posts,
// same singleton-row-of-jsonb pattern as expense_data/furniture_layout).

export type Phase = "hype" | "build" | "countdown" | "launch";
export type Platform = "igfb" | "linkedin";

export interface MarketingPost {
  id: string;
  date: string; // ISO yyyy-mm-dd
  phase: Phase;
  platform: Platform;
  format: string;
  title: string;
  note: string;
}

export const OPENING_DATE = "2026-10-26";

export const PHASE_LABELS: Record<Phase, string> = {
  hype: "Hype — no site footage yet",
  build: "Build week — equipment arriving",
  countdown: "Final countdown",
  launch: "Launch day",
};

export const MARKETING_POSTS: MarketingPost[] = [
  { id: "p1", date: "2026-09-22", phase: "hype", platform: "igfb", format: "Graphic", title: "Coming soon", note: "Reveal the name, neighborhood and month — first public mention." },
  { id: "p2", date: "2026-09-24", phase: "hype", platform: "igfb", format: "Poll", title: "Pool or PS5?", note: "Story poll — which are you more hyped to play on day one?" },
  { id: "p3", date: "2026-09-26", phase: "hype", platform: "igfb", format: "Reel", title: "Inside look", note: "Screen-recorded fly-through of the actual floor-plan render." },
  { id: "p4", date: "2026-09-29", phase: "hype", platform: "igfb", format: "Poll", title: "Which PS5 games should we stock?", note: "Genuinely useful — the answers shape the real game library." },
  { id: "p5", date: "2026-10-01", phase: "hype", platform: "igfb", format: "Carousel", title: "What's coming", note: "One card per zone — 3 pool tables, 5 PS5 stations, snack counter." },
  { id: "p6", date: "2026-10-03", phase: "hype", platform: "igfb", format: "Graphic", title: "Tag your crew", note: "“Tag the friend you're bringing on day one.”" },
  { id: "p7", date: "2026-10-06", phase: "hype", platform: "igfb", format: "Poll", title: "What should the snack counter stock?", note: "Drinks/snacks wishlist from followers." },
  { id: "p8", date: "2026-10-08", phase: "hype", platform: "igfb", format: "Graphic", title: "2 weeks out", note: "Countdown check-in — recap what's confirmed so far." },
  { id: "p9", date: "2026-10-10", phase: "hype", platform: "igfb", format: "Poll", title: "When would you actually come?", note: "Weekday evenings vs. weekend afternoons." },
  { id: "p10", date: "2026-10-13", phase: "hype", platform: "igfb", format: "Graphic", title: "Early-bird teaser", note: "First 20 visitors on opening day get a free hour — follow to catch it." },
  { id: "p11", date: "2026-10-15", phase: "build", platform: "igfb", format: "Reel", title: "Work begins", note: "Move-in day — empty space, first equipment on site." },
  { id: "p12", date: "2026-10-17", phase: "build", platform: "igfb", format: "Reel", title: "Pool tables going in", note: "Unboxing / assembly footage." },
  { id: "p13", date: "2026-10-20", phase: "countdown", platform: "igfb", format: "Reel", title: "PS5 stations going up", note: "Setup reel." },
  { id: "p14", date: "2026-10-22", phase: "countdown", platform: "igfb", format: "Reel", title: "4 days out", note: "Real walkthrough of the half-finished space." },
  { id: "p15", date: "2026-10-24", phase: "countdown", platform: "igfb", format: "Graphic", title: "2 days out", note: "Hours, address, opening-day offer." },
  { id: "p16", date: "2026-10-26", phase: "launch", platform: "igfb", format: "Reel + Story", title: "Opening day", note: "Launch reel, plus stories running all day." },
  { id: "l1", date: "2026-09-22", phase: "hype", platform: "linkedin", format: "Post", title: "Building something new", note: "Professional-angle announcement of the venture." },
  { id: "l2", date: "2026-10-26", phase: "launch", platform: "linkedin", format: "Post", title: "Grand opening", note: "Announcement for your professional network." },
];

// Keyed by post id -> done. Missing id defaults to false (getDone below).
export type MarketingState = Record<string, boolean>;

const STORAGE_KEY = "gorilla8-marketing-v1";
const SUPABASE_ROW_ID = "singleton";

export function getDone(state: MarketingState, id: string): boolean {
  return state[id] ?? false;
}

function loadLocalBackup(): MarketingState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MarketingState) : null;
  } catch {
    return null;
  }
}

function saveLocalBackup(state: MarketingState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable/full — Supabase (if configured) is still the source of truth
  }
}

export async function loadMarketingState(): Promise<MarketingState> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("marketing_posts")
        .select("data")
        .eq("id", SUPABASE_ROW_ID)
        .maybeSingle();
      if (!error && data?.data) {
        const state = data.data as MarketingState;
        saveLocalBackup(state);
        return state;
      }
    } catch {
      // fall through to local backup below
    }
  }
  return loadLocalBackup() ?? {};
}

// Returns whether the write actually reached Supabase (vs. only the local
// backup) — e.g. false when the marketing_posts table hasn't been created
// yet. Callers use this to show real sync status instead of just guessing
// from isSupabaseConfigured (which only means the env vars are set, not
// that this specific table exists).
export async function saveMarketingState(state: MarketingState): Promise<boolean> {
  saveLocalBackup(state);
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from("marketing_posts")
        .upsert({ id: SUPABASE_ROW_ID, data: state, updated_at: new Date().toISOString() });
      return !error;
    } catch {
      return false;
    }
  }
  return false;
}
