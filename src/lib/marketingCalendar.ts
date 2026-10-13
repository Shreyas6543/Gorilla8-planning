import { supabase, isSupabaseConfigured } from "./supabaseClient";

// Pre-opening social media posting schedule. Fixed content (dates/ideas) —
// same shape as expenseCatalog.ts's SEED_ITEMS: hardcoded here, not
// admin-editable, since this is a one-time launch plan, not an ongoing
// checklist. Only which posts are DONE is persisted (table marketing_posts,
// same singleton-row-of-jsonb pattern as expense_data/furniture_layout).

export type Phase = "hype" | "build" | "countdown" | "launch" | "live";
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
  live: "Open — first week",
};

export const MARKETING_POSTS: MarketingPost[] = [
  { id: "m1", date: "2026-09-24", phase: "hype", platform: "igfb", format: "Carousel", title: "What is GORILLA 8?", note: "Pool + PS5 + Food — the first proper introduction." },
  { id: "m2", date: "2026-09-26", phase: "hype", platform: "igfb", format: "Reel", title: "Inside GORILLA 8", note: "Screen-recorded fly-through of the floor-plan render." },
  { id: "m3", date: "2026-09-29", phase: "hype", platform: "igfb", format: "Poll", title: "Which PS5 games should we stock?", note: "Genuinely useful — the answers shape the real game library." },
  { id: "m4", date: "2026-10-01", phase: "hype", platform: "igfb", format: "Carousel", title: "What's coming", note: "3 pool tables + 5 PS5 stations + kitchen, one card per zone." },
  { id: "m5", date: "2026-10-03", phase: "hype", platform: "igfb", format: "Graphic", title: "Tag your crew", note: "“Tag the friend you're bringing on day one.”" },
  { id: "m6", date: "2026-10-06", phase: "hype", platform: "igfb", format: "Story Poll", title: "What's your GORILLA 8 combo?", note: "Pool + PS5 + Food — which combo are you?" },
  { id: "m7", date: "2026-10-08", phase: "hype", platform: "igfb", format: "Poll", title: "What should we put on the menu?", note: "Menu wishlist from followers." },
  { id: "m8", date: "2026-10-10", phase: "hype", platform: "igfb", format: "Reel", title: "POV: You just walked into GORILLA 8", note: "First-person walkthrough of the space." },
  { id: "m9", date: "2026-10-13", phase: "hype", platform: "igfb", format: "Graphic", title: "Something special is coming for opening week 👀", note: "Teaser for the opening-week offer — follow to catch it." },
  { id: "m10", date: "2026-10-15", phase: "build", platform: "igfb", format: "Reel", title: "Work begins", note: "Move-in day — empty space, first equipment on site." },
  { id: "m11", date: "2026-10-17", phase: "build", platform: "igfb", format: "Reel", title: "The pool tables are here 🎱", note: "Unboxing / assembly footage." },
  { id: "m12", date: "2026-10-20", phase: "countdown", platform: "igfb", format: "Reel", title: "The gaming zone is coming together 🎮", note: "PS5 stations going up." },
  { id: "m13", date: "2026-10-22", phase: "countdown", platform: "igfb", format: "Reel", title: "The kitchen is taking shape 🍔", note: "Kitchen build progress." },
  { id: "m14", date: "2026-10-24", phase: "countdown", platform: "igfb", format: "Graphic", title: "2 DAYS TO GO", note: "Address, hours, opening-day offer." },
  { id: "m15", date: "2026-10-25", phase: "countdown", platform: "igfb", format: "Reel", title: "TOMORROW. 🦍", note: "Final teaser — see you tomorrow." },
  { id: "m16", date: "2026-10-26", phase: "launch", platform: "igfb", format: "Reel + Story", title: "WE ARE OPEN.", note: "Launch reel, plus stories running all day." },
  { id: "m17", date: "2026-10-27", phase: "live", platform: "igfb", format: "Reel", title: "Day 1 at GORILLA 8", note: "Recap of opening day." },
  { id: "m18", date: "2026-10-29", phase: "live", platform: "igfb", format: "Reel / Carousel", title: "What did you guys play?", note: "Highlights of what people played and ordered." },
  { id: "m19", date: "2026-10-31", phase: "live", platform: "igfb", format: "Reel", title: "First week at GORILLA 8", note: "Week-one recap." },
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
