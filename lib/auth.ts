import { supabase } from './supabase';

/**
 * 現在のセッションのユーザーIDを取得
 * @returns ユーザーIDまたはnull
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error || !data.session) {
      console.log('認証セッションが見つかりません。匿名モードで実行します。');
      return null;
    }
    
    // Google OAuth認証されたユーザーIDを返す
    const userId = data.session.user.id;
    console.log('認証済みセッションを検出:', userId);
    return userId;
  } catch (error) {
    console.error('認証セッション取得エラー:', error);
    return null;
  }
}

/**
 * 匿名ユーザーIDを生成
 * @returns 新しい匿名ユーザーID
 */
function generateAnonymousId(): string {
  const newAnonymousId = `anon_${Math.random().toString(36).substring(2, 15)}`;
  console.log('新しい匿名IDを生成:', newAnonymousId);
  
  // ローカルストレージに保存
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('anonymousUserId', newAnonymousId);
    } catch (e) {
      console.error('ローカルストレージへの保存に失敗:', e);
    }
  }
  
  return newAnonymousId;
}

/**
 * 保存済みの匿名IDを取得、または新しく生成
 */
function getStoredOrNewAnonymousId(): string {
  if (typeof window !== 'undefined') {
    try {
      const storedId = localStorage.getItem('anonymousUserId');
      if (storedId && storedId.startsWith('anon_')) {
        console.log('ローカルストレージから匿名IDを取得:', storedId);
        return storedId;
      }
    } catch (e) {
      console.error('ローカルストレージアクセスエラー:', e);
    }
  }
  
  return generateAnonymousId();
}

/**
 * セッションのユーザーID、または匿名ユーザー識別子を取得
 * 認証していない場合は匿名IDを返す
 * Google OAuth認証を最優先とする決定論的アルゴリズム
 */
export async function getUserIdOrAnonymousId(): Promise<string> {
  try {
    // 1. Google認証セッションを最優先で確認
    const userId = await getCurrentUserId();
    if (userId) {
      // 認証済みユーザーIDをローカルにも保存（同期）
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('anonymousUserId', userId);
          console.log('認証済みユーザーIDをローカルストレージに同期:', userId);
        } catch (e) {
          console.error('ローカルストレージへの保存に失敗:', e);
        }
      }
      return userId;
    }
    
    // 2. 認証がない場合は匿名ID（ローカルストレージベース）を使用
    console.log('認証セッションが存在しません。匿名IDを使用します。');
    return getStoredOrNewAnonymousId();
  } catch (error) {
    console.error('ユーザーID解決エラー:', error);
    // エラー発生時も一時的なIDを返す
    return `anon_error_${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * APIリクエストのクエリパラメータから匿名IDを取得
 * @param requestUrl - リクエストURL
 */
export function getAnonymousIdFromRequest(requestUrl: string): string | null {
  try {
    const url = new URL(requestUrl);
    const anonymousId = url.searchParams.get('anonymousId');
    
    if (anonymousId && (anonymousId.startsWith('anon_') || anonymousId.length > 20)) {
      return anonymousId;
    }
    
    return null;
  } catch (error) {
    console.error('リクエストURL解析エラー:', error);
    return null;
  }
}

/**
 * 匿名ユーザーIDをクリア
 * ログアウト時に呼び出す
 */
export function clearAnonymousId(): void {
  console.log('匿名IDクリア処理を実行中...');
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('anonymousUserId');
      console.log('ローカルストレージから匿名IDを削除しました');
    } catch (error) {
      console.error('ローカルストレージからの削除に失敗:', error);
    }
  }
}