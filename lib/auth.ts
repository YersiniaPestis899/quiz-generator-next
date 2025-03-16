import { supabase } from './supabase';
import { getUserIdFromCookie, saveUserIdToCookie } from './cookieUtils';

/**
 * 現在のセッションのユーザーIDを取得
 * @returns ユーザーIDまたはnull
 */
export async function getCurrentUserId() {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error || !data.session) {
      return null;
    }
    
    return data.session.user.id;
  } catch (error) {
    console.error('Error getting current user session:', error);
    return null;
  }
}

/**
 * セッションのユーザーID、または匿名ユーザー識別子を取得
 * 認証していない場合はクッキーやローカルストレージに保存されたID、
 * またはランダムIDを生成して返す
 * ユーザー識別の優先順位: クッキー > 認証済みセッション > ローカルストレージ > 新規生成
 */
export async function getUserIdOrAnonymousId() {
  try {
    // まずクッキーを確認（最優先）
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
    
    // 次に認証済みセッションを確認
    const userId = await getCurrentUserId();
    if (userId) {
      console.log('認証セッションからユーザーIDを取得:', userId);
      // 認証済みIDもクッキーとローカルストレージに保存
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

/**
 * APIリクエストのクエリパラメータから匿名IDを取得
 * @param requestUrl - リクエストURL
 */
export function getAnonymousIdFromRequest(requestUrl: string) {
  try {
    const url = new URL(requestUrl);
    const anonymousId = url.searchParams.get('anonymousId');
    
    if (anonymousId && anonymousId.startsWith('anon_')) {
      return anonymousId;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing request URL:', error);
    return null;
  }
}