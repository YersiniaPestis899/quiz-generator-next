'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import AuthButton from '@/components/AuthButton';

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
        
        <p className="mb-8 text-text-secondary text-center">
          Googleアカウントでログインすると、クイズの履歴が永続的に保存され、異なるデバイスでも学習の進捗を確認できます。
        </p>
        
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