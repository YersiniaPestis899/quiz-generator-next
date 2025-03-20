const USER_ID_COOKIE_NAME = 'quiz_generator_user_id';
const COOKIE_EXPIRY_DAYS = 30;

export function saveUserIdToCookie(userId: string): void {
  if (typeof document === 'undefined') return;
  
  try {
    // クッキーの有効期限を設定（30日間）
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + COOKIE_EXPIRY_DAYS);
    
    // クッキー設定を最適化（SameSite=Laxに変更し、より良い互換性を確保）
    document.cookie = `${USER_ID_COOKIE_NAME}=${userId}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    
    console.log('ユーザーIDをクッキーに保存しました:', userId);
  } catch (error) {
    console.error('クッキーへの保存に失敗しました:', error);
  }
}

export function getUserIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  
  try {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(`${USER_ID_COOKIE_NAME}=`)) {
        return cookie.substring(USER_ID_COOKIE_NAME.length + 1);
      }
    }
    return null;
  } catch (error) {
    console.error('クッキーからの読み込みに失敗しました:', error);
    return null;
  }
}

/**
 * ユーザーIDのクッキーを削除
 * ログアウト時やセッション切り替え時に呼び出し
 */
export function clearUserIdCookie(): void {
  if (typeof document === 'undefined') return;
  
  try {
    // 過去の日付を設定してクッキーを削除
    document.cookie = `${USER_ID_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    
    console.log('ユーザーIDのクッキーを削除しました');
  } catch (error) {
    console.error('クッキーの削除に失敗しました:', error);
  }
}