/**
 * 統合エラー監視システム
 * 認証関連エラーの構造化キャプチャと分析
 */

// エラーログの保持構造
type ErrorEntry = {
  timestamp: string;
  context: string;
  message: string;
  details?: any;
  stack?: string;
};

// メモリ内エラーログストレージ
const errorLogs: ErrorEntry[] = [];
const MAX_ERROR_LOGS = 50; // 最大保持数

/**
 * 認証エラーの構造化ログ記録
 */
export function logAuthError(context: string, error: any, details?: any) {
  try {
    const errorEntry: ErrorEntry = {
      timestamp: new Date().toISOString(),
      context,
      message: error instanceof Error ? error.message : String(error),
      details,
    };
    
    if (error instanceof Error && error.stack) {
      errorEntry.stack = error.stack;
    }
    
    // コンソールに詳細ログ
    console.error(`認証エラー [${context}]:`, error, details || '');
    
    // メモリ内ログに保存
    errorLogs.unshift(errorEntry);
    
    // 最大保持数を超えた場合は古いログを削除
    if (errorLogs.length > MAX_ERROR_LOGS) {
      errorLogs.pop();
    }
    
    // グローバルエラーイベントの発火 (任意のハンドラが使用可能)
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('auth-error', { 
        detail: { ...errorEntry }
      });
      window.dispatchEvent(event);
    }
  } catch (logError) {
    // メタエラー (エラーログ記録自体の失敗) を通常のコンソールに記録
    console.error('エラーログ記録プロセス障害:', logError);
  }
}

/**
 * エラーログの取得
 */
export function getErrorLogs() {
  return [...errorLogs];
}

/**
 * エラーログの消去
 */
export function clearErrorLogs() {
  errorLogs.length = 0;
  return true;
}

/**
 * 認証エラーイベントハンドラの登録
 */
export function registerAuthErrorHandler(handler: (error: ErrorEntry) => void) {
  if (typeof window === 'undefined') return () => {};
  
  const eventHandler = (event: Event) => {
    const customEvent = event as CustomEvent;
    handler(customEvent.detail);
  };
  
  window.addEventListener('auth-error', eventHandler);
  
  // クリーンアップ関数を返す
  return () => {
    window.removeEventListener('auth-error', eventHandler);
  };
}

/**
 * グローバルエラーハンドラの設定
 * 未捕捉のエラーやPromiseリジェクションを検出
 */
export function setupGlobalErrorHandler() {
  if (typeof window === 'undefined') return;
  
  // 未捕捉のエラー
  window.addEventListener('error', (event) => {
    logAuthError('未捕捉例外', event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
  
  // 未処理のPromiseリジェクション
  window.addEventListener('unhandledrejection', (event) => {
    logAuthError('未処理Promise拒否', event.reason, {
      type: 'unhandledrejection'
    });
  });
  
  console.log('グローバルエラーハンドラを設定しました');
}

/**
 * 認証診断情報の収集
 */
export async function collectAuthDiagnostics() {
  try {
    const diagnostics: Record<string, any> = {
      timestamp: new Date().toISOString(),
      errorLogs: getErrorLogs(),
      environment: typeof window !== 'undefined' ? window.ENV_VARS : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      url: typeof window !== 'undefined' ? window.location.href : null,
    };
    
    // Cookieアクセス可能性テスト
    if (typeof document !== 'undefined') {
      try {
        const testCookie = 'auth_diagnostic_test=1';
        document.cookie = testCookie;
        diagnostics.cookieWritable = document.cookie.includes('auth_diagnostic_test');
        
        // テストCookieを削除
        document.cookie = 'auth_diagnostic_test=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      } catch (e) {
        diagnostics.cookieWritable = false;
        diagnostics.cookieError = String(e);
      }
    }
    
    // ローカルストレージアクセス可能性テスト
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('auth_diagnostic_test', '1');
        diagnostics.localStorageWritable = localStorage.getItem('auth_diagnostic_test') === '1';
        localStorage.removeItem('auth_diagnostic_test');
      } catch (e) {
        diagnostics.localStorageWritable = false;
        diagnostics.localStorageError = String(e);
      }
    }
    
    return diagnostics;
  } catch (error) {
    console.error('診断情報収集エラー:', error);
    return { error: String(error) };
  }
}