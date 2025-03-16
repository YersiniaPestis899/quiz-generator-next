const USER_ID_COOKIE_NAME = 'quiz_generator_user_id';
const COOKIE_EXPIRY_DAYS = 30;

export function saveUserIdToCookie(userId: string): void {
  if (typeof document === 'undefined') return;
  
  try {
    // クッキーの有効期限を設定（30日間）
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + COOKIE_EXPIRY_DAYS);
    
    // クッキーを設定
    document.cookie = `${USER_ID_COOKIE_NAME}=${userId}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict${location.protocol === 'https:' ? '; Secure' : ''}`;
    
    console.log('ユーザーIDをクッキーに保存しました');
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