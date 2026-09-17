import { supabase, isSupabaseConfigured } from "./supabaseClient";

// Expense categories + items, admin-manageable via the Expenses page.
// Replaces the old hardcoded config/expenses.ts constants — seeded from
// those exact same ids/names the first time these tables are empty, so
// existing expense_data entries (real quantities/prices already entered)
// keep matching correctly.

export interface ExpenseCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface ExpenseItem {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
}

// Exact ids/names/order this app has always used — seeded once.
const SEED_CATEGORIES: ExpenseCategory[] = [
  { id: "gaming-equipment", name: "Gaming Equipment", sortOrder: 0 },
  { id: "furniture", name: "Furniture", sortOrder: 1 },
  { id: "interior-decor", name: "Interior & Decor", sortOrder: 2 },
  { id: "lighting", name: "Lighting", sortOrder: 3 },
  { id: "electrical-climate", name: "Electrical & Climate", sortOrder: 4 },
  { id: "tech-security", name: "Tech & Security", sortOrder: 5 },
  { id: "fb-setup", name: "F&B Setup", sortOrder: 6 },
  { id: "marketing-digital", name: "Marketing & Digital", sortOrder: 7 },
  { id: "business-admin", name: "Business & Admin", sortOrder: 8 },
  { id: "branding-signage", name: "Branding & Signage", sortOrder: 9 },
  { id: "safety-compliance", name: "Safety & Compliance", sortOrder: 10 },
];

const SEED_ITEMS: ExpenseItem[] = [
  { id: "ps5", categoryId: "gaming-equipment", name: "PS5", sortOrder: 0 },
  { id: "poolTables", categoryId: "gaming-equipment", name: "Pool tables", sortOrder: 1 },
  { id: "poolTableChairs", categoryId: "gaming-equipment", name: "Pool table chairs", sortOrder: 2 },
  { id: "poolTableLight", categoryId: "gaming-equipment", name: "Pool table light", sortOrder: 3 },

  { id: "frontDesk", categoryId: "furniture", name: "Front desk", sortOrder: 0 },
  { id: "sofa", categoryId: "furniture", name: "Sofa", sortOrder: 1 },
  { id: "table", categoryId: "furniture", name: "Table", sortOrder: 2 },
  { id: "chair", categoryId: "furniture", name: "Regular chairs", sortOrder: 3 },
  { id: "beanChairs", categoryId: "furniture", name: "Bean chairs", sortOrder: 4 },
  { id: "shoeRack", categoryId: "furniture", name: "Shoe / slipper rack", sortOrder: 5 },

  { id: "carpet", categoryId: "interior-decor", name: "Carpet", sortOrder: 0 },
  { id: "wallPartition", categoryId: "interior-decor", name: "Wall partition", sortOrder: 1 },
  { id: "paintings", categoryId: "interior-decor", name: "Paintings", sortOrder: 2 },
  { id: "postersInterior", categoryId: "interior-decor", name: "Posters — interior design", sortOrder: 3 },
  { id: "glassWallSticker", categoryId: "interior-decor", name: "Glass wall sticker", sortOrder: 4 },

  { id: "neonLights", categoryId: "lighting", name: "Neon lights", sortOrder: 0 },
  { id: "ledLight", categoryId: "lighting", name: "LED light", sortOrder: 1 },
  { id: "generalLighting", categoryId: "lighting", name: "General lighting", sortOrder: 2 },
  { id: "aestheticLights", categoryId: "lighting", name: "Aesthetic lights", sortOrder: 3 },

  { id: "ac", categoryId: "electrical-climate", name: "AC", sortOrder: 0 },
  { id: "electricMaterials", categoryId: "electrical-climate", name: "Electric materials", sortOrder: 1 },
  { id: "powerBackup", categoryId: "electrical-climate", name: "Power backup", sortOrder: 2 },
  { id: "ups", categoryId: "electrical-climate", name: "UPS", sortOrder: 3 },

  { id: "cctv", categoryId: "tech-security", name: "CCTV", sortOrder: 0 },
  { id: "wifi", categoryId: "tech-security", name: "Wi-Fi", sortOrder: 1 },
  { id: "tv", categoryId: "tech-security", name: "TV", sortOrder: 2 },
  { id: "speakers", categoryId: "tech-security", name: "Speakers", sortOrder: 3 },
  { id: "phoneSim", categoryId: "tech-security", name: "Phone & SIM", sortOrder: 4 },

  { id: "snacksTable", categoryId: "fb-setup", name: "Snacks table", sortOrder: 0 },
  { id: "glassFridge", categoryId: "fb-setup", name: "Glass fridge", sortOrder: 1 },
  { id: "snacksCabinet", categoryId: "fb-setup", name: "Snacks cabinet", sortOrder: 2 },

  { id: "website", categoryId: "marketing-digital", name: "Website", sortOrder: 0 },
  { id: "bookingAccount", categoryId: "marketing-digital", name: "Booking account", sortOrder: 1 },
  { id: "instaFacebook", categoryId: "marketing-digital", name: "Insta / Facebook page", sortOrder: 2 },
  { id: "postersAd", categoryId: "marketing-digital", name: "Posters — advertisement", sortOrder: 3 },
  { id: "pamphlets", categoryId: "marketing-digital", name: "Pamphlets", sortOrder: 4 },
  { id: "fbInstaAdCampaign", categoryId: "marketing-digital", name: "Facebook & Insta ad campaign", sortOrder: 5 },

  { id: "bankingAccount", categoryId: "business-admin", name: "Banking account", sortOrder: 0 },

  { id: "signboard", categoryId: "branding-signage", name: "Signboard / exterior branding", sortOrder: 0 },

  { id: "fireExtinguisher", categoryId: "safety-compliance", name: "Fire extinguisher / safety compliance", sortOrder: 0 },
];

interface CategoryRow {
  id: string;
  name: string;
  sort_order: number;
}
interface ItemRow {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
}

const fromCategoryRow = (r: CategoryRow): ExpenseCategory => ({ id: r.id, name: r.name, sortOrder: r.sort_order });
const toCategoryRow = (c: ExpenseCategory): CategoryRow => ({ id: c.id, name: c.name, sort_order: c.sortOrder });
const fromItemRow = (r: ItemRow): ExpenseItem => ({ id: r.id, categoryId: r.category_id, name: r.name, sortOrder: r.sort_order });
const toItemRow = (i: ExpenseItem): ItemRow => ({ id: i.id, category_id: i.categoryId, name: i.name, sort_order: i.sortOrder });

const LOCAL_KEY = "gorilla8-expense-catalog-backup-v1";

interface CatalogBundle {
  categories: ExpenseCategory[];
  items: ExpenseItem[];
}

function loadLocalBackup(): CatalogBundle | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalBackup(bundle: CatalogBundle) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(bundle));
  } catch {
    // best-effort only
  }
}

export async function loadExpenseCatalog(): Promise<CatalogBundle> {
  if (!isSupabaseConfigured || !supabase) {
    return loadLocalBackup() ?? { categories: SEED_CATEGORIES, items: SEED_ITEMS };
  }
  try {
    const [{ data: catRows, error: catError }, { data: itemRows, error: itemError }] = await Promise.all([
      supabase.from("expense_categories").select("*"),
      supabase.from("expense_items").select("*"),
    ]);
    if (catError) throw catError;
    if (itemError) throw itemError;

    if (!catRows || catRows.length === 0) {
      const { error } = await supabase.from("expense_categories").insert(SEED_CATEGORIES.map(toCategoryRow));
      if (error) throw error;
      const { error: itemInsertError } = await supabase.from("expense_items").insert(SEED_ITEMS.map(toItemRow));
      if (itemInsertError) throw itemInsertError;
      saveLocalBackup({ categories: SEED_CATEGORIES, items: SEED_ITEMS });
      return { categories: SEED_CATEGORIES, items: SEED_ITEMS };
    }

    const categories = (catRows as CategoryRow[]).map(fromCategoryRow).sort((a, b) => a.sortOrder - b.sortOrder);
    const items = ((itemRows as ItemRow[]) ?? []).map(fromItemRow).sort((a, b) => a.sortOrder - b.sortOrder);
    saveLocalBackup({ categories, items });
    return { categories, items };
  } catch (err) {
    console.error("loadExpenseCatalog failed:", err);
    return loadLocalBackup() ?? { categories: SEED_CATEGORIES, items: SEED_ITEMS };
  }
}

type Result = { ok: boolean; error?: string };

function slugify(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function createCategory(name: string, sortOrder: number): Promise<Result & { category?: ExpenseCategory }> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, error: "Supabase isn't configured." };
  const category: ExpenseCategory = { id: slugify(name), name, sortOrder };
  const { error } = await supabase.from("expense_categories").insert(toCategoryRow(category));
  if (error) return { ok: false, error: error.message };
  return { ok: true, category };
}

export async function deleteCategory(id: string): Promise<Result> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, error: "Supabase isn't configured." };
  const { error } = await supabase.from("expense_categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function createItem(categoryId: string, name: string, sortOrder: number): Promise<Result & { item?: ExpenseItem }> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, error: "Supabase isn't configured." };
  const item: ExpenseItem = { id: slugify(name), categoryId, name, sortOrder };
  const { error } = await supabase.from("expense_items").insert(toItemRow(item));
  if (error) return { ok: false, error: error.message };
  return { ok: true, item };
}

export async function deleteItem(id: string): Promise<Result> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, error: "Supabase isn't configured." };
  const { error } = await supabase.from("expense_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
