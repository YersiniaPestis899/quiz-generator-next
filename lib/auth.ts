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
 */
export async function getUserIdOrAnonymousId() {
  try {
    // まず認証済みセッションを確認
    const userId = await getCurrentUserId();
    if (userId) return userId;
    
    // 次にクッキーを確認
    const cookieUserId = getUserIdFromCookie();
    if (cookieUserId) return cookieUserId;
    
    // ブラウザ環境かチェック
    if (typeof window !== 'undefined') {
      try {
        // 既存の匿名IDを確認
        let anonymousId = localStorage.getItem('anonymousUserId');
        
        // 存在しない場合は新規生成して保存
        if (!anonymousId) {
          anonymousId = `anon_${Math.random().toString(36).substring(2, 15)}`;
          localStorage.setItem('anonymousUserId', anonymousId);
          // クッキーにも保存
          saveUserIdToCookie(anonymousId);
        } else {
          // ローカルストレージにあってクッキーにない場合はクッキーにも保存
          saveUserIdToCookie(anonymousId);
        }
        
        return anonymousId;
      } catch (storageError) {
        console.error('Error accessing localStorage:', storageError);
        // ストレージエラーの場合は一時的なIDを返す
        const tempId = `anon_temp_${Math.random().toString(36).substring(2, 15)}`;
        // できればクッキーに保存
        try {
          saveUserIdToCookie(tempId);
        } catch (e) {
          console.error('クッキーへの保存にも失敗しました:', e);
        }
        return tempId;
      }
    }
    
    // サーバーサイドでの実行時は仮のIDを返す
    return `anon_server_${Math.random().toString(36).substring(2, 15)}`;
  } catch (error) {
    console.error('Error in getUserIdOrAnonymousId:', error);
    // エラー発生時も一時的なIDを返す
    return `anon_error_${Math.random().toString(36).substring(2, 15)}`;
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