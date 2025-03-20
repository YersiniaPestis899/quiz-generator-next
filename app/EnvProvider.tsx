'use client';

import Script from 'next/script';

/**
 * 強化版環境変数プロバイダー
 * 環境診断とブラウザへの環境変数公開機能
 */
export function EnvProvider() {
  // NEXT_PUBLIC_ で始まる環境変数のみをクライアントに公開
  const safeEnvVars = {
    SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || '',
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    // SUPABASE_ANON_KEY は公開しても安全（クライアントサイドで使用する匿名キー）
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    NODE_ENV: process.env.NODE_ENV || 'development',
  };

  // 拡張スクリプト: 環境変数設定と環境診断機能
  const envScript = `
    // 環境変数をグローバルに設定
    window.ENV_VARS = ${JSON.stringify(safeEnvVars)};
    console.log('環境変数をクライアントに設定しました', window.ENV_VARS);
    
    // 環境診断関数
    window.runEnvironmentDiagnostics = function() {
      try {
        const diagnostics = {
          timestamp: new Date().toISOString(),
          environment: window.ENV_VARS,
          url: window.location.href,
          userAgent: navigator.userAgent,
          cookiesEnabled: navigator.cookieEnabled,
          localStorage: typeof localStorage !== 'undefined',
          sessionStorage: typeof sessionStorage !== 'undefined',
        };
        
        console.log('環境診断結果:', diagnostics);
        
        // Cookieデバッグ
        if (document.cookie) {
          const cookies = document.cookie.split(';').map(c => c.trim());
          console.log('現在のCookie一覧 (名前のみ):', cookies.map(c => c.split('=')[0]));
        } else {
          console.warn('Cookieが存在しません。認証に影響する可能性があります。');
        }
        
        return diagnostics;
      } catch (error) {
        console.error('環境診断エラー:', error);
        return { error: String(error) };
      }
    };
    
    // 自動変数確認機能
    window.checkRequiredEnvVars = function() {
      const required = ['SITE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
      const missing = required.filter(key => !window.ENV_VARS[key]);
      
      if (missing.length > 0) {
        console.warn('必要な環境変数が不足しています:', missing);
        return false;
      }
      return true;
    };
    
    // 初期化時に自動診断を実行
    if (window.ENV_VARS.NODE_ENV === 'development' || new URLSearchParams(window.location.search).has('debug')) {
      setTimeout(() => {
        console.group('🛠️ 自動環境診断');
        window.runEnvironmentDiagnostics();
        window.checkRequiredEnvVars();
        console.groupEnd();
      }, 1000);
    }
  `;

  return (
    <Script
      id="environment-variables"
      dangerouslySetInnerHTML={{ __html: envScript }}
      strategy="beforeInteractive"
    />
  );
}