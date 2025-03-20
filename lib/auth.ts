import { supabase } from './supabase';
import { getUserIdFromCookie, saveUserIdToCookie, clearUserIdCookie } from './cookieUtils';

/**
 * 現在の認証済みセッションのユーザーIDを取得
 * 認証済みの場合のみユーザーIDを返し、それ以外はnullを返す
 * @returns 認証済みユーザーIDまたはnull
 */
export async function getCurrentUserId() {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error || !data.session) {
      return null;
    }
    
    return data.session.user.id;
  } catch (error) {
    console.error('認証セッション取得エラー:', error);
    return null;
  }
}

/**
 * 認証済みユーザーIDのみを取得する単純化関数
 * 匿名ユーザー識別は行わない - 認証済みユーザーのみサポート
 */
export async function getUserId() {
  try {
    // 認証済みセッションからのみIDを取得
    const userId = await getCurrentUserId();
    if (userId) {
      console.log('認証済みユーザーID:', userId);
      return userId;
    }
    
    // 認証されていない場合はnullを返す
    console.log('認証されていないユーザー - 機能制限あり');
    return null;
  } catch (error) {
    console.error('ユーザーID取得エラー:', error);
    return null;
  }
}

/**
 * セッションのユーザーID、または匿名ユーザー識別子を取得
 * 認証していない場合はクッキーやローカルストレージに保存されたID、
 * またはランダムIDを生成して返す
 * ユーザー識別の優先順位: 認証済みセッション > クッキー > ローカルストレージ > 新規生成
 */
// Explicitly define the function and then export it to avoid potential issues
const getUserIdOrAnonymousId = async () => {
  try {
    // まず認証済みセッションを確認（最優先）
    const userId = await getCurrentUserId();
    if (userId) {
      console.log('認証セッションからユーザーIDを取得:', userId);
      // 認証済みIDをクッキーとローカルストレージに保存して同期
      saveUserIdToCookie(userId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('anonymousUserId', userId);
        } catch (e) {
          console.error('ローカルストレージへの保存に失敗:', e);
        }
      }
      return userId;
    }
    
    // 次にクッキーを確認
    const cookieUserId = getUserIdFromCookie();
    if (cookieUserId) {
      console.log('クッキーからユーザーIDを取得:', cookieUserId);
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
    
    // 次にローカルストレージを確認
    if (typeof window !== 'undefined') {
      try {
        const storageUserId = localStorage.getItem('anonymousUserId');
        if (storageUserId) {
          console.log('ローカルストレージからユーザーIDを取得:', storageUserId);
          // クッキーにも保存して一貫性を確保
          saveUserIdToCookie(storageUserId);
          return storageUserId;
        }
      } catch (e) {
        console.error('ローカルストレージアクセスエラー:', e);
      }
    }
    
    // 新規ID生成（両方の保存先に保存）
    const newUserId = `anon_${Math.random().toString(36).substring(2, 15)}`;
    console.log('新規ユーザーIDを生成:', newUserId);
    
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
    const tempId = `anon_error_${Math.random().toString(36).substring(2, 15)}`;
    return tempId;
  }
}

// Make sure all functions are explicitly exported
// Create a separate index export to ensure all functions are available
const auth = {
  getCurrentUserId,
  getUserId,
  getUserIdOrAnonymousId,
  isAuthenticated,
  clearAuthState
};

export { 
  getCurrentUserId,
  getUserId,
  getUserIdOrAnonymousId,
  isAuthenticated,
  clearAuthState 
};

// Default export as fallback
export default auth;

/**
 * 認証状態を確認し、認証済みの場合はtrueを返す
 * @returns 認証状態のブール値
 */
export async function isAuthenticated() {
  const userId = await getCurrentUserId();
  return !!userId;
}

/**
 * 認証関連の状態をクリア
 * ログアウト時に呼び出す
 */
export function clearAuthState() {
  console.log('認証状態クリアプロセスを実行中...');
  try {
    if (typeof window !== 'undefined') {
      // ローカルストレージからの認証関連データ削除
      localStorage.removeItem('anonymousUserId');
      localStorage.removeItem('old_anonymous_id');
      console.log('認証関連のローカルストレージデータを削除しました');
    }
    // クッキーの削除
    clearUserIdCookie();
  } catch (error) {
    console.error('認証状態クリア中のエラー:', error);
  }
}