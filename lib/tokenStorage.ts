/**
 * トークンストレージユーティリティ
 * インメモリでのトークン一時保持と復元メカニズムを提供
 * セッションの継続性を強化するためのフォールバックシステム
 */

// メモリ内トークンストレージ (クライアントサイドのみ)
let memoryRefreshToken: string | null = null;
let memoryAccessToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * トークンをメモリに安全に保存
 * ブラウザの制限を回避するためのインメモリストレージメカニズム
 */
export function storeTokensInMemory(refreshToken: string, accessToken: string, expiresIn: number = 3600) {
  if (typeof window === 'undefined') return false;
  
  try {
    memoryRefreshToken = refreshToken;
    memoryAccessToken = accessToken;
    tokenExpiry = Date.now() + (expiresIn * 1000);
    
    // トークン保存成功を診断ログに記録
    console.log('トークンをメモリに安全に保存しました。有効期限:', new Date(tokenExpiry).toISOString());
    return true;
  } catch (error) {
    console.error('メモリ内トークン保存エラー:', error);
    return false;
  }
}

/**
 * メモリからトークンを取得
 * Cookieが利用できない場合のフォールバックメカニズム
 */
export function getTokensFromMemory() {
  if (typeof window === 'undefined') return null;
  
  try {
    // 期限切れチェック
    if (tokenExpiry && Date.now() > tokenExpiry) {
      console.log('メモリ内トークンが期限切れです');
      clearMemoryTokens();
      return null;
    }
    
    if (!memoryRefreshToken || !memoryAccessToken) {
      return null;
    }
    
    return {
      refreshToken: memoryRefreshToken,
      accessToken: memoryAccessToken,
      expiresAt: tokenExpiry ? new Date(tokenExpiry).toISOString() : null
    };
  } catch (error) {
    console.error('メモリ内トークン取得エラー:', error);
    return null;
  }
}

/**
 * メモリからトークンをクリア
 * ログアウト時やセッション無効化時に使用
 */
export function clearMemoryTokens() {
  if (typeof window === 'undefined') return;
  
  try {
    memoryRefreshToken = null;
    memoryAccessToken = null;
    tokenExpiry = null;
    console.log('メモリ内トークンをクリアしました');
  } catch (error) {
    console.error('メモリ内トークンクリアエラー:', error);
  }
}

/**
 * トークンリフレッシュサイクルを開始
 * シングルページアプリケーションでの長時間セッション維持に使用
 */
export function startTokenRefreshCycle(refreshCallback: () => Promise<boolean>, intervalMinutes: number = 30) {
  if (typeof window === 'undefined') return null;
  
  try {
    // ミリ秒に変換
    const intervalMs = intervalMinutes * 60 * 1000;
    
    // リフレッシュサイクルの開始
    const intervalId = setInterval(async () => {
      console.log('定期的なトークンリフレッシュを実行中...');
      
      try {
        const success = await refreshCallback();
        if (success) {
          console.log('トークンリフレッシュ成功');
        } else {
          console.warn('トークンリフレッシュ失敗 - 次回の実行を待機');
        }
      } catch (error) {
        console.error('トークンリフレッシュ例外:', error);
      }
    }, intervalMs);
    
    console.log(`トークンリフレッシュサイクルを開始: ${intervalMinutes}分間隔`);
    return intervalId;
  } catch (error) {
    console.error('トークンリフレッシュサイクル初期化エラー:', error);
    return null;
  }
}