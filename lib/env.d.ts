declare global {
  namespace NodeJS {
    interface ProcessEnv {
      AWS_REGION: string;
      AWS_ACCESS_KEY_ID: string;
      AWS_SECRET_ACCESS_KEY: string;
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      NEXT_PUBLIC_SITE_URL?: string;
    }
  }

  interface Window {
    ENV_VARS?: {
      SITE_URL: string;
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
      NODE_ENV: string;
    };
  }
}