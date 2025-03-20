'use client';

import { useEffect, useState } from 'react';

/**
 * 認証システム診断ページ
 * 認証関連の環境変数とクッキー状態を詳細に分析
 */
export default function AuthDebugPage() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function runDiagnostics() {
      try {
        setLoading(true);
        // 認証診断APIを呼び出し
        const response = await fetch('/api/auth/diagnose');
        
        if (!response.ok) {
          throw new Error(`診断API呼び出し失敗: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setDiagnostics(data);
        setError(null);
      } catch (e) {
        console.error('診断実行エラー:', e);
        setError(e instanceof Error ? e.message : '不明なエラー');
      } finally {
        setLoading(false);
      }
    }

    runDiagnostics();
  }, []);

  // 環境情報の構造化表示
  const renderEnvironment = (env: any) => {
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-medium">環境変数</h3>
        <div className="grid grid-cols-2 gap-2 bg-background/50 p-3 rounded text-sm">
          {Object.entries(env).map(([key, value]) => (
            <div key={key} className="contents">
              <div className="font-mono">{key}</div>
              <div className="font-mono text-accent-foreground">{String(value)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Cookie状態の評価関数
  const evaluateCookieHealth = (cookieData: any) => {
    const issues = [];
    
    if (!cookieData.hasSbAuthCookie) {
      issues.push('Supabase認証Cookieが見つかりません');
    }
    
    if (!cookieData.hasRefreshToken) {
      issues.push('リフレッシュトークンCookieが見つかりません');
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  };

  // Cookieデータの構造化表示
  const renderCookies = (cookieData: any) => {
    const health = evaluateCookieHealth(cookieData);
    
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Cookie状態</h3>
        <div className="bg-background/50 p-3 rounded text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${health.healthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div>{health.healthy ? '正常' : '問題あり'}</div>
          </div>
          
          {!health.healthy && (
            <ul className="list-disc list-inside text-red-500 mb-3">
              {health.issues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            <div>Cookie総数</div>
            <div className="font-medium">{cookieData.count}</div>
            
            <div>認証Cookie</div>
            <div className={`font-medium ${cookieData.hasSbAuthCookie ? 'text-green-500' : 'text-red-500'}`}>
              {cookieData.hasSbAuthCookie ? '存在' : '不在'}
            </div>
            
            <div>リフレッシュトークン</div>
            <div className={`font-medium ${cookieData.hasRefreshToken ? 'text-green-500' : 'text-red-500'}`}>
              {cookieData.hasRefreshToken ? '存在' : '不在'}
            </div>
          </div>
          
          {cookieData.details && cookieData.details.length > 0 && (
            <div className="mt-3">
              <h4 className="font-medium mb-1">詳細Cookie情報</h4>
              <div className="max-h-60 overflow-y-auto">
                {cookieData.details.map((cookie: any, idx: number) => (
                  <div key={idx} className="text-xs mb-2 p-2 bg-panel rounded border border-border/30">
                    <div><span className="font-medium">名前:</span> {cookie.name}</div>
                    <div><span className="font-medium">Secure:</span> {cookie.secure ? 'はい' : 'いいえ'}</div>
                    <div><span className="font-medium">HttpOnly:</span> {cookie.httpOnly ? 'はい' : 'いいえ'}</div>
                    <div><span className="font-medium">SameSite:</span> {cookie.sameSite || 'なし'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // セッション情報の構造化表示
  const renderSession = (sessionData: any) => {
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-medium">セッション状態</h3>
        <div className="bg-background/50 p-3 rounded text-sm">
          {sessionData ? (
            <div className="grid grid-cols-2 gap-2">
              <div>セッション</div>
              <div className={`font-medium ${sessionData.hasSession ? 'text-green-500' : 'text-red-500'}`}>
                {sessionData.hasSession ? '有効' : '無効'}
              </div>
              
              {sessionData.expiresAt && (
                <>
                  <div>有効期限</div>
                  <div className="font-medium">
                    {new Date(sessionData.expiresAt * 1000).toLocaleString()}
                  </div>
                </>
              )}
              
              {sessionData.provider && (
                <>
                  <div>認証プロバイダー</div>
                  <div className="font-medium">{sessionData.provider}</div>
                </>
              )}
            </div>
          ) : (
            <div className="text-red-500">セッション情報なし</div>
          )}
          
          {sessionData?.sessionError && (
            <div className="mt-3 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-500">
              <div className="font-medium">セッションエラー</div>
              <div>{sessionData.sessionError.message}</div>
              {sessionData.sessionError.status && (
                <div>ステータス: {sessionData.sessionError.status}</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">認証システム診断</h1>
        <p className="text-text-secondary">認証関連の設定とサブシステム状態を分析します</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="loading">診断データ取得中...</div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded">
          <h2 className="text-lg font-bold text-red-500 mb-2">診断エラー</h2>
          <p>{error}</p>
        </div>
      ) : diagnostics ? (
        <div className="space-y-6">
          {diagnostics.environment && renderEnvironment(diagnostics.environment)}
          {diagnostics.auth?.config && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">認証設定</h3>
              <div className="grid grid-cols-2 gap-2 bg-background/50 p-3 rounded text-sm">
                <div>リダイレクトURL</div>
                <div className="font-mono break-all">{diagnostics.auth.config.redirectUrl}</div>
                
                <div>Cookie Secure</div>
                <div>{diagnostics.auth.config.cookieSecure ? 'はい' : 'いいえ'}</div>
                
                <div>Cookie SameSite</div>
                <div>{diagnostics.auth.config.cookieSameSite}</div>
              </div>
            </div>
          )}
          {diagnostics.auth?.session && renderSession(diagnostics.auth.session)}
          {diagnostics.cookies && renderCookies(diagnostics.cookies)}
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">リクエスト情報</h3>
            <div className="bg-background/50 p-3 rounded text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>URL</div>
                <div className="font-mono break-all">{diagnostics.request?.url}</div>
                
                <div>オリジン</div>
                <div className="font-mono">{diagnostics.request?.headers?.origin || 'なし'}</div>
                
                <div>ホスト</div>
                <div className="font-mono">{diagnostics.request?.headers?.host}</div>
                
                <div>リファラー</div>
                <div className="font-mono break-all">{diagnostics.request?.headers?.referer || 'なし'}</div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              診断実行: {new Date(diagnostics.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-text-secondary">診断データが取得できませんでした</div>
      )}
    </div>
  );
}