'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 認証コールバックページ
 * ユーザーが認証プロバイダーから戻ってきた後の画面
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  
  useEffect(() => {
    // コールバック処理は自動的に実行される
    // 処理が完了したら自動的にホームへリダイレクト
    
    // 念のため、一定時間後にホームへ強制リダイレクト（フォールバック）
    const timeout = setTimeout(() => {
      router.push('/');
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [router]);
  
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[50vh]">
      <div className="card bg-panel border border-border/30 shadow-lg max-w-md w-full">
        <h1 className="text-2xl text-center font-bold mb-6 text-text-accent">
          認証処理中...
        </h1>
        
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin w-16 h-16 rounded-full border-4 border-primary border-t-transparent"></div>
          
          <p className="text-text-secondary text-center">
            認証情報を処理しています。しばらくお待ちください...
          </p>
          
          <p className="text-text-secondary text-center text-sm">
            自動的にホームページへリダイレクトします。
          </p>
        </div>
      </div>
    </div>
  );
}