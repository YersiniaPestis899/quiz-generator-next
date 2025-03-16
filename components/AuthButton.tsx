'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

export default function AuthButton() {
  const { user, signInWithGoogle, signOut, isLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  // ログイン処理
  const handleSignIn = async () => {
    setIsProcessing(true);
    await signInWithGoogle();
    setIsProcessing(false);
  };

  // ログアウト処理
  const handleSignOut = async () => {
    setIsProcessing(true);
    await signOut();
    setIsProcessing(false);
  };

  // 匿名データの移行機能
  const migrateAnonymousData = async () => {
    try {
      if (!user) return;
      
      // 匿名IDの取得
      const anonymousId = localStorage.getItem('anonymousUserId');
      if (!anonymousId || !anonymousId.startsWith('anon_')) return;
      
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
        localStorage.removeItem('anonymousUserId');
        console.log('匿名データの移行が完了しました');
      } else {
        console.error('匿名データの移行に失敗しました');
      }
    } catch (error) {
      console.error('データ移行エラー:', error);
    }
  };

  // ログイン直後に移行処理を実行
  useEffect(() => {
    if (user) {
      migrateAnonymousData();
    }
  }, [user]);

  if (isLoading) {
    return (
      <button className="btn bg-gray-200 text-gray-700 opacity-50 cursor-not-allowed">
        読み込み中...
      </button>
    );
  }

  return user ? (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {user.user_metadata?.avatar_url && (
          <img 
            src={user.user_metadata.avatar_url} 
            alt="プロフィール" 
            className="w-8 h-8 rounded-full"
          />
        )}
        <span className="text-sm text-text-secondary truncate max-w-[120px]">
          {user.email || user.user_metadata?.name || 'ユーザー'}
        </span>
      </div>
      <button 
        onClick={handleSignOut}
        disabled={isProcessing}
        className="btn-secondary text-sm py-1 px-3"
      >
        {isProcessing ? 'ログアウト中...' : 'ログアウト'}
      </button>
    </div>
  ) : (
    <button 
      onClick={handleSignIn}
      disabled={isProcessing}
      className="btn-accent flex items-center gap-2"
    >
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path
          fill="currentColor"
          d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2 C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
        />
      </svg>
      {isProcessing ? 'ログイン中...' : 'Googleでログイン'}
    </button>
  );
}