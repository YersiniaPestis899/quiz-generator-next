'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserIdFromCookie } from '@/lib/cookieUtils';
import { clearAnonymousId } from '@/lib/auth';

/**
 * 認証ボタンコンポーネント
 * Google認証ログイン/ログアウト機能と状態表示を提供
 */
export default function AuthButton() {
  const { user, signInWithGoogle, signOut, isLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'none' | 'pending' | 'success' | 'error'>('none');

  // 匿名データの移行機能
  const migrateAnonymousData = async () => {
    try {
      if (!user) return;
      
      setMigrationStatus('pending');
      
      // 匿名IDの取得（複数のソースから取得を試みる）
      const localStorageAnonymousId = localStorage.getItem('anonymousUserId');
      const cookieAnonymousId = getUserIdFromCookie();
      
      // 利用可能な最初の匿名IDを使用
      const anonymousId = localStorageAnonymousId || cookieAnonymousId;
      
      if (!anonymousId || !anonymousId.startsWith('anon_') || anonymousId === user.id) {
        // 匿名IDがない、または認証IDと同じ場合は移行不要
        setMigrationStatus('success');
        return;
      }
      
      console.log('匿名データの移行を開始します:', anonymousId, '->', user.id);
      
      // 移行処理のAPIコール
      const response = await fetch('/api/migrate-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          anonymousId,
          userId: user.id,
        }),
      });
      
      if (response.ok) {
        // 移行成功後、匿名IDをクリア
        clearAnonymousId();
        console.log('匿名データの移行が完了しました');
        setMigrationStatus('success');
      } else {
        console.error('匿名データの移行に失敗しました');
        setMigrationStatus('error');
      }
    } catch (error) {
      console.error('データ移行エラー:', error);
      setMigrationStatus('error');
    }
  };
  
  // ログイン直後に移行処理を実行
  useEffect(() => {
    if (user) {
      migrateAnonymousData();
    }
  }, [user]);

  // ログイン処理
  const handleSignIn = async () => {
    try {
      setIsProcessing(true);
      await signInWithGoogle();
      // リダイレクトは signInWithGoogle 内で行われるため、
      // ここでは実行されない
    } catch (error) {
      console.error('ログイン処理エラー:', error);
      // エラー発生時は処理中表示を解除
      setIsProcessing(false);
      
      // ユーザーフレンドリーなエラーメッセージを表示するためにエラーパラメータ付きでリダイレクト
      window.location.href = '/auth?error=provider_error';
    }
  };

  // ログアウト処理
  const handleSignOut = async () => {
    try {
      setIsProcessing(true);
      // ログアウト前に匿名IDをクリアして新しいセッションを開始
      clearAnonymousId();
      await signOut();
    } catch (error) {
      console.error('ログアウト処理エラー:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center px-4 py-2 rounded-lg bg-panel/70 animate-pulse">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-sm">認証状態を確認中...</span>
      </div>
    );
  }

  return user ? (
    <div className="flex flex-col items-center gap-2 bg-panel p-3 rounded-lg shadow-quiz transition-all hover:shadow-quiz-hover">
      <div className="flex items-center gap-2">
        {user.user_metadata?.avatar_url && (
          <img 
            src={user.user_metadata.avatar_url} 
            alt="プロフィール" 
            className="w-10 h-10 rounded-full border-2 border-primary"
          />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-text truncate max-w-[120px]">
            {user.email || user.user_metadata?.name || 'ユーザー'}
          </span>
          <span className="text-xs text-text-secondary">
            ログイン済み
          </span>
        </div>
      </div>
      
      {migrationStatus === 'pending' && (
        <div className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded w-full text-center">
          データ同期中...
        </div>
      )}
      
      {migrationStatus === 'success' && (
        <div className="text-xs bg-green-900/30 text-green-300 px-2 py-1 rounded w-full text-center">
          データ同期完了
        </div>
      )}
      
      {migrationStatus === 'error' && (
        <div className="text-xs bg-red-900/30 text-red-300 px-2 py-1 rounded w-full text-center">
          同期に問題が発生しました
        </div>
      )}
      
      <button 
        onClick={handleSignOut}
        disabled={isProcessing}
        className="btn-secondary text-sm py-1 px-3 w-full"
      >
        {isProcessing ? 'ログアウト中...' : 'ログアウト'}
      </button>
    </div>
  ) : (
    <button 
      onClick={handleSignIn}
      disabled={isProcessing}
      className="btn-accent flex items-center gap-2 px-4 py-3 shadow-lg hover:shadow-xl transition-all"
    >
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          fill="currentColor"
          d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2 C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
        />
      </svg>
      <span className="text-base font-semibold">
        {isProcessing ? 'ログイン中...' : 'Googleでログイン'}
      </span>
    </button>
  );
}