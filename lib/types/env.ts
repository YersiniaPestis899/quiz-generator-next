/**
 * グローバル環境変数の型定義
 * 
 * 環境変数関連の型定義を一箇所に集約し、
 * 型安全性と再利用性を向上させます。
 */

// 環境変数オブジェクトの型定義
export interface EnvVars {
  SITE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  NODE_ENV: string;
}

// 環境変数キーの型エイリアス
export type EnvVarKey = keyof EnvVars;

// 実行環境情報の型定義
export interface EnvironmentInfo {
  nodeEnv: string;
  isProduction: boolean;
  isServerSide: boolean;
  isBrowser: boolean;
  isVercel: boolean;
}

// 環境診断結果の型定義
export interface EnvDiagnostics {
  timestamp: string;
  environment: Partial<EnvVars>;
  requiredVarsPresent: boolean;
  missingVars: string[];
}

// グローバルWindowオブジェクト拡張の型定義
declare global {
  interface Window {
    ENV_VARS?: EnvVars;
    runEnvironmentDiagnostics?: () => EnvDiagnostics;
    checkRequiredEnvVars?: () => [boolean, string[]];
  }
}