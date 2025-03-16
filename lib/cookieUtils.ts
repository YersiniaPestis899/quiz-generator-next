/**
 * 注意: このクッキーユーティリティは非推奨となりました。
 * 認証システムはGoogle OAuth認証のみを使用するように最適化されています。
 * クッキーベースのユーザーID管理は使用しないでください。
 */

// 以下の関数は後方互換性のためだけに維持されています

/**
 * ユーザーIDをクッキーに保存（非推奨）
 * @deprecated Google認証を優先的に使用してください
 */
export function saveUserIdToCookie(userId: string): void {
  console.warn('警告: クッキーベースのユーザーID保存は非推奨です。Google認証を使用してください。');
  // 実際には保存操作を行わない
}

/**
 * クッキーからユーザーIDを取得（非推奨）
 * @deprecated Google認証を優先的に使用してください
 * @returns 常にnull
 */
export function getUserIdFromCookie(): string | null {
  console.warn('警告: クッキーベースのユーザーID取得は非推奨です。Google認証を使用してください。');
  return null; // 常にnullを返す
}

/**
 * ユーザーIDのクッキーを削除
 */
export function clearUserIdCookie(): void {
  // 実際には操作を行わない
  console.log('クッキーベースのユーザーIDクリア操作は無効化されています');
}