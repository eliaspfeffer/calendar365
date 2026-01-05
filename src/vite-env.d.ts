/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_LEGAL_PROVIDER_NAME?: string;
  readonly VITE_LEGAL_PROVIDER_ADDRESS?: string;
  readonly VITE_LEGAL_PHONE?: string;
  readonly VITE_LEGAL_EMAIL?: string;
  readonly VITE_LEGAL_WEBSITE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
