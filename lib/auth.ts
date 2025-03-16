import { supabase } from './supabase';
import { getUserIdFromCookie, saveUserIdToCookie, clearUserIdCookie } from './cookieUtils';

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
 * ユーザー識別の優先順位: 認証済みセッション > クッキー > ローカルストレージ > 新規生成
 */
export async function getUserIdOrAnonymousId() {
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

/**
 * 匿名ユーザーIDをクリア
 * ログイン後やログアウト時に呼び出す
 */
export function clearAnonymousId() {
  console.log('匿名ID消去プロセスを実行中...');
  try {
    if (typeof window !== 'undefined') {
      // 消去前に現在の匿名IDを保存
      const currentAnonymousId = localStorage.getItem('anonymousUserId');
      if (currentAnonymousId && currentAnonymousId.startsWith('anon_')) {
        localStorage.setItem('old_anonymous_id', currentAnonymousId);
        console.log('参照用に古い匿名IDを保存:', currentAnonymousId);
      }
      
      // 現在の匿名IDを削除
      localStorage.removeItem('anonymousUserId');
      console.log('localStorageから匿名IDを削除しました');
    }
    clearUserIdCookie();
  } catch (error) {
    console.error('localStorageでの匿名ID管理に失敗:', error);
  }
}