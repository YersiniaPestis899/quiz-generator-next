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

  // Google認証でのサインイン - 堅牢性強化版
  const signInWithGoogle = async () => {
    try {
      console.log('認証フロー診断モード開始: Google OAuth');
      
      // 環境変数アクセスの堅牢化
      const getEnvVar = (key: string, fallback: string = '') => {
        // 1. クライアントサイド環境変数オブジェクト
        if (typeof window !== 'undefined' && window.ENV_VARS && window.ENV_VARS[key]) {
          return window.ENV_VARS[key];
        }
        // 2. Next.js 環境変数
        const envKey = `NEXT_PUBLIC_${key}`;
        if (typeof process !== 'undefined' && process.env && process.env[envKey]) {
          return process.env[envKey];
        }
        // 3. 現在のオリジン
        if (typeof window !== 'undefined' && key === 'SITE_URL') {
          return window.location.origin;
        }
        return fallback;
      };
      
      // サイトURLを複数のソースから冗長的に取得
      const siteUrl = getEnvVar('SITE_URL', typeof window !== 'undefined' ? window.location.origin : '');
      
      console.log('認証サイト基盤URL:', siteUrl);
      
      // API転送コールバックURLへの統一
      const redirectUrl = `${siteUrl}/api/auth/callback`;
      console.log('認証リダイレクトベクトル (最適化):', redirectUrl);
      
      // Supabase認証リクエストパラメータの最適化
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: 'select_account',
          },
          // 明示的にブラウザリダイレクトを指定
          skipBrowserRedirect: false,
        },
      });
      
      if (error) {
        console.error('Google認証初期化障害:', error);
        throw error;
      } else if (data?.url) {
        console.log('プロバイダーリダイレクトURL生成成功:', 
                 data.url.substring(0, data.url.indexOf('?')) + '?...');
        
        // 環境に依存しない標準化されたリダイレクト手順
        window.location.href = data.url;
      } else {
        console.error('認証データ構造異常:', data);
        throw new Error('認証プロセス初期化障害');
      }
    } catch (err) {
      console.error('認証サブシステム例外:', err);
      throw err;
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