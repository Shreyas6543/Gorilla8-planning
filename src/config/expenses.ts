// Setup expense checklist — one line per purchasable item, tracked per property.
// No prices are pre-filled here; they're entered and persisted (localStorage)
// from the Expenses page itself as quotes/orders come in.

export interface ExpenseItem {
  id: string;
  name: string;
  category: string;
}

export const EXPENSE_CATEGORIES = [
  "Gaming Equipment",
  "Furniture",
  "Interior & Decor",
  "Lighting",
  "Electrical & Climate",
  "Tech & Security",
  "F&B Setup",
  "Marketing & Digital",
  "Business & Admin",
  "Branding & Signage",
  "Safety & Compliance",
] as const;

export const EXPENSE_ITEMS: ExpenseItem[] = [
  // Gaming Equipment
  { id: "ps5", name: "PS5", category: "Gaming Equipment" },
  { id: "poolTables", name: "Pool tables", category: "Gaming Equipment" },
  { id: "poolTableChairs", name: "Pool table chairs", category: "Gaming Equipment" },
  { id: "poolTableLight", name: "Pool table light", category: "Gaming Equipment" },

  // Furniture
  { id: "frontDesk", name: "Front desk", category: "Furniture" },
  { id: "sofa", name: "Sofa", category: "Furniture" },
  { id: "table", name: "Table", category: "Furniture" },
  { id: "chair", name: "Regular chairs", category: "Furniture" },
  { id: "beanChairs", name: "Bean chairs", category: "Furniture" },
  { id: "shoeRack", name: "Shoe / slipper rack", category: "Furniture" },

  // Interior & Decor
  { id: "carpet", name: "Carpet", category: "Interior & Decor" },
  { id: "wallPartition", name: "Wall partition", category: "Interior & Decor" },
  { id: "paintings", name: "Paintings", category: "Interior & Decor" },
  { id: "postersInterior", name: "Posters — interior design", category: "Interior & Decor" },
  { id: "glassWallSticker", name: "Glass wall sticker", category: "Interior & Decor" },

  // Lighting
  { id: "neonLights", name: "Neon lights", category: "Lighting" },
  { id: "ledLight", name: "LED light", category: "Lighting" },
  { id: "generalLighting", name: "General lighting", category: "Lighting" },
  { id: "aestheticLights", name: "Aesthetic lights", category: "Lighting" },

  // Electrical & Climate
  { id: "ac", name: "AC", category: "Electrical & Climate" },
  { id: "electricMaterials", name: "Electric materials", category: "Electrical & Climate" },
  { id: "powerBackup", name: "Power backup", category: "Electrical & Climate" },
  { id: "ups", name: "UPS", category: "Electrical & Climate" },

  // Tech & Security
  { id: "cctv", name: "CCTV", category: "Tech & Security" },
  { id: "wifi", name: "Wi-Fi", category: "Tech & Security" },
  { id: "tv", name: "TV", category: "Tech & Security" },
  { id: "speakers", name: "Speakers", category: "Tech & Security" },
  { id: "phoneSim", name: "Phone & SIM", category: "Tech & Security" },

  // F&B Setup
  { id: "snacksTable", name: "Snacks table", category: "F&B Setup" },
  { id: "glassFridge", name: "Glass fridge", category: "F&B Setup" },
  { id: "snacksCabinet", name: "Snacks cabinet", category: "F&B Setup" },

  // Marketing & Digital
  { id: "website", name: "Website", category: "Marketing & Digital" },
  { id: "bookingAccount", name: "Booking account", category: "Marketing & Digital" },
  { id: "instaFacebook", name: "Insta / Facebook page", category: "Marketing & Digital" },
  { id: "postersAd", name: "Posters — advertisement", category: "Marketing & Digital" },
  { id: "pamphlets", name: "Pamphlets", category: "Marketing & Digital" },
  { id: "fbInstaAdCampaign", name: "Facebook & Insta ad campaign", category: "Marketing & Digital" },

  // Business & Admin
  { id: "bankingAccount", name: "Banking account", category: "Business & Admin" },

  // Branding & Signage
  { id: "signboard", name: "Signboard / exterior branding", category: "Branding & Signage" },

  // Safety & Compliance
  { id: "fireExtinguisher", name: "Fire extinguisher / safety compliance", category: "Safety & Compliance" },
];
