interface ENV_VARS {
  SITE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  NODE_ENV: string;
}

declare interface Window {
  ENV_VARS?: ENV_VARS;
}
