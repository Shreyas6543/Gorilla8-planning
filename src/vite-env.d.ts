/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EDIT_PASSCODE: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
