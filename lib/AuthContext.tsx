'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';
import { clearAnonymousId } from './auth';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // セッション状態の初期化
    const initSession = async () => {
      setIsLoading(true);
      
      // 最新のSupabase API形式
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('セッション取得エラー:', error);
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      // リアルタイムセッション監視を設定
      const { data: { subscription } } = await supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log('認証状態変更イベント:', event);
          setSession(session);
          setUser(session?.user ?? null);
          setIsLoading(false);
          
          // サインアウト時に匿名IDをクリア
          if (event === 'SIGNED_OUT') {
            clearAnonymousId();
          }
        }
      );
      
      setIsLoading(false);
      
      // クリーンアップ時にリスナーを解除
      return () => {
        subscription.unsubscribe();
      };
    };
    
    initSession();
  }, []);

  // Google認証でのサインイン
  const signInWithGoogle = async () => {
    try {
      console.log('認証フロー開始: Google OAuth');
      
      // サイトURLを環境変数から取得、なければ現在のオリジンを使用
      const siteUrl = typeof window !== 'undefined' && window.ENV_VARS?.SITE_URL
        ? window.ENV_VARS.SITE_URL
        : typeof window !== 'undefined' ? window.location.origin : '';
      
      // 環境に応じて適切なコールバックURLを選択
      // 本番環境とローカル環境で分岐
      let redirectUrl: string;
      if (siteUrl.includes('vercel.app') || siteUrl.includes('quiz-generator-next')) {
        // Vercel環境用の代替コールバックパス
        redirectUrl = `${siteUrl}/api/auth/callback`;
        console.log('本番環境用代替コールバックパスを使用:', redirectUrl);
      } else {
        // ローカル環境用の標準コールバックパス
        redirectUrl = `${siteUrl}/auth/callback`;
        console.log('ローカル環境用標準コールバックパスを使用:', redirectUrl);
      }
      
      console.log('認証リダイレクトURL:', redirectUrl);
      
      // 開発環境かどうか確認
      const isDevelopment = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      
      // SupabaseのOAuth認証メソッドを実行
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: 'select_account',  // 常にアカウント選択を表示
          },
          skipBrowserRedirect: false,  // ブラウザの自動リダイレクトを有効化
        },
      });
      
      if (error) {
        console.error('Google認証エラー:', error);
        throw error;
      } else if (data?.url) {
        console.log('認証プロバイダーへのリダイレクトURL:', data.url);
        
        // 本番環境での追加的なセキュリティ対策
        if (!isDevelopment) {
          // 短い遅延を入れてリダイレクト
          // これによりブラウザがクッキーを適切に処理する時間を確保
          setTimeout(() => {
            window.location.href = data.url;
          }, 100);
        } else {
          // 開発環境では通常通りリダイレクト
          window.location.href = data.url;
        }
      } else {
        console.error('認証データが不完全です:', data);
        throw new Error('認証プロセスの開始に失敗しました');
      }
    } catch (err) {
      console.error('認証処理エラー:', err);
      throw err; // エラーを上位呼び出し元に伝播
    }
  };

  // サインアウト処理
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('サインアウトエラー:', error);
      }
    } catch (err) {
      console.error('サインアウト処理エラー:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// カスタムフック - 認証コンテキストの使用を簡素化
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}