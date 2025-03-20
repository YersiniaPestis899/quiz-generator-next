'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import AuthButton from '@/components/AuthButton';

// クライアントサイドのみで実行されるエラーハンドリングコンポーネント
function ErrorParamHandler() {
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  
  // クライアントサイドでのみ window.location を使用
  useEffect(() => {
    // URLからエラーパラメータを直接取得
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const errorDetails = urlParams.get('details');
    
    if (errorDetails) {
      setDetails(decodeURIComponent(errorDetails));
    }
    
    if (errorParam) {
      switch (errorParam) {
        case 'missing_code':
          setError('認証コードが見つかりませんでした。ブラウザの Cookie 設定を確認してください。');
          break;
        case 'auth_failed':
          setError('認証処理に失敗しました。もう一度お試しください。');
          break;
        case 'provider_error':
          setError('Google認証サービスとの通信に問題が発生しました。');
          break;
        case 'session_error':
          setError('セッションの確立に失敗しました。クッキーが有効か確認してください。');
          break;
        default:
          setError('認証中にエラーが発生しました。もう一度お試しください。');
      }
      
      // エラーパラメータをURLから削除
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('error');
      cleanUrl.searchParams.delete('details');
      window.history.replaceState({}, '', cleanUrl.toString());
    }
  }, []);
  
  if (!error) return null;
  
  return (
    <div className="mb-4 p-3 bg-red-900/30 text-red-300 border border-red-500/30 rounded-lg text-center">
      <p className="text-sm font-semibold">{error}</p>
      {details && (
        <p className="text-xs mt-1 opacity-80">詳細: {details}</p>
      )}
    </div>
  );
}

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  // ログイン済みの場合はホームにリダイレクト
  useEffect(() => {
    if (user && !isLoading) {
      router.push('/');
    }
  }, [user, isLoading, router]);
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <div className="card bg-panel border border-border/30 shadow-lg">
        <h1 className="text-2xl text-center font-bold mb-6 text-text-accent">
          アカウント認証
        </h1>
        
        <p className="mb-4 text-text-secondary text-center">
          Googleアカウントでログインすると、クイズの履歴が永続的に保存され、異なるデバイスでも学習の進捗を確認できます。
        </p>
        
        {/* エラーハンドリングをSuspense境界内に配置 */}
        <Suspense fallback={null}>
          <ErrorParamHandler />
        </Suspense>
        
        <div className="flex flex-col items-center space-y-8">
          <div className="bg-background/50 p-5 rounded-xl w-full">
            <h2 className="text-lg font-semibold mb-3 text-text-accent">
              認証のメリット
            </h2>
            
            <ul className="list-disc list-inside space-y-2 text-text-secondary">
              <li>すべてのクイズデータをアカウントに保存</li>
              <li>異なるデバイスでも学習の進捗を同期</li>
              <li>いつでもどこでも学習を再開可能</li>
              <li>長期的な成績の追跡とモニタリング</li>
            </ul>
          </div>
          
          <div className="w-full flex justify-center">
            {isLoading ? (
              <div className="loading">認証情報を確認中...</div>
            ) : (
              <AuthButton />
            )}
          </div>
          
          <div className="text-center text-sm text-text-secondary mt-4">
            <p>
              すでにアカウントをお持ちの方は、上のボタンからログインしてください。
            </p>
            <p className="mt-1">
              <a href="/" className="text-primary hover:text-primary-hover underline">
                ログインせずに続ける
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}