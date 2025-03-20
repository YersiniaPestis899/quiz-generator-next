import { EnvVarKey } from './types/env';

/**
 * 環境変数アクセスユーティリティ
 * 型安全な環境変数アクセスメカニズムを提供
 */

// 型安全な環境変数アクセス関数
export function getEnvVar(key: EnvVarKey, fallback: string = ''): string {
  // 1. クライアントサイド環境変数オブジェクト
  if (typeof window !== 'undefined' && window.ENV_VARS && key in window.ENV_VARS) {
    return window.ENV_VARS[key] || fallback;
  }
  
  // 2. Next.js 環境変数
  const envKey = `NEXT_PUBLIC_${key}`;
  if (typeof process !== 'undefined' && process.env && envKey in process.env) {
    return (process.env as Record<string, string>)[envKey] || fallback;
  }
  
  // 3. 現在のオリジン (SITE_URLのフォールバック)
  if (typeof window !== 'undefined' && key === 'SITE_URL') {
    return window.location.origin;
  }
  
  return fallback;
}

/**
 * 環境変数の整合性を検証
 * 必須の環境変数が設定されているか確認する
 */
export function validateRequiredEnvVars(): [boolean, string[]] {
  const requiredKeys: EnvVarKey[] = ['SITE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missingKeys: string[] = [];
  
  for (const key of requiredKeys) {
    const value = getEnvVar(key);
    if (!value) {
      missingKeys.push(key);
    }
  }
  
  return [missingKeys.length === 0, missingKeys];
}

/**
 * 実行環境の判定
 * 環境変数と実行コンテキストから環境を判定する
 */
export function getEnvironmentInfo() {
  const nodeEnv = getEnvVar('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  const isServerSide = typeof window === 'undefined';
  const isBrowser = typeof window !== 'undefined';
  
  // デプロイ環境の判定
  const isVercel = typeof process !== 'undefined' && 
                  typeof process.env !== 'undefined' && 
                  'VERCEL' in process.env;
  
  return {
    nodeEnv,
    isProduction,
    isServerSide,
    isBrowser,
    isVercel
  };
}