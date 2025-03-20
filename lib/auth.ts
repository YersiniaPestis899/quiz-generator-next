import { supabase } from './supabase';
import { clearUserIdCookie } from './cookieUtils';

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