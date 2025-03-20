'use client';

import Script from 'next/script';

/**
 * 環境変数をブラウザに公開するコンポーネント
 * window.ENV_VARS オブジェクトを通じて環境変数にアクセス可能にする
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

  // インラインスクリプトでブラウザのグローバル変数に環境変数を設定
  const envScript = `
    window.ENV_VARS = ${JSON.stringify(safeEnvVars)};
    console.log('環境変数をクライアントに設定しました', window.ENV_VARS);
  `;

  return (
    <Script
      id="environment-variables"
      dangerouslySetInnerHTML={{ __html: envScript }}
      strategy="beforeInteractive"
    />
  );
}