import { getUserIdFromCookie, saveUserIdToCookie } from './cookieUtils';

/**
 * セッションの匿名ユーザー識別子を取得
 * 優先順位: ローカルストレージ > クッキー > 新規生成
 */
export async function getUserIdOrAnonymousId(): Promise<string> {
  try {
    // まずローカルストレージを確認
    if (typeof window !== 'undefined') {
      try {
        const storageUserId = localStorage.getItem('anonymousUserId');
        if (storageUserId) {
          console.log('ローカルストレージから匿名IDを取得:', storageUserId);
          // クッキーにも保存して一貫性を確保
          saveUserIdToCookie(storageUserId);
          return storageUserId;
        }
      } catch (e) {
        console.error('ローカルストレージアクセスエラー:', e);
      }
    }
    
    // 次にクッキーを確認
    const cookieUserId = getUserIdFromCookie();
    if (cookieUserId) {
      console.log('クッキーから匿名IDを取得:', cookieUserId);
      // ローカルストレージにも同期して一貫性を確保
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('anonymousUserId', cookieUserId);
        } catch (e) {
          console.error('ローカルストレージへの保存に失敗:', e);
        }
      }
      return cookieUserId;
    }
    
    // 新規ID生成（両方の保存先に保存）
    const newUserId = `anon_${Math.random().toString(36).substring(2, 15)}`;
    console.log('新規匿名IDを生成:', newUserId);
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('anonymousUserId', newUserId);
      } catch (e) {
        console.error('ローカルストレージへの保存に失敗:', e);
      }
    }
    
    saveUserIdToCookie(newUserId);
    return newUserId;
  } catch (error) {
    console.error('Error in getUserIdOrAnonymousId:', error);
    // エラー発生時も一時的なIDを返す
    const tempId = `anon_${Math.random().toString(36).substring(2, 15)}`;
    return tempId;
  }
}

/**
 * ユーザーIDを取得する単純化関数
 * 匿名ユーザー識別のみをサポート
 */
export async function getUserId(): Promise<string> {
  return getUserIdOrAnonymousId();
}

// シンプル化されたエクスポート
export default { getUserIdOrAnonymousId, getUserId };