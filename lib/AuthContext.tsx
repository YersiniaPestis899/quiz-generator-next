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
      
      // カレントオリジンを確認
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectUrl = `${origin}/auth/callback`;
      
      console.log('認証リダイレクトURL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            // オプションで追加パラメータを指定可能
            // access_type: 'offline', // リフレッシュトークンを取得する場合
            prompt: 'select_account',  // 常にアカウント選択を表示
          }
        },
      });
      
      if (error) {
        console.error('Google認証エラー:', error);
      } else if (data?.url) {
        console.log('認証プロバイダーへのリダイレクトURL:', data.url);
        // プロバイダーURLへのリダイレクトを手動で実行
        window.location.href = data.url;
      } else {
        console.error('認証データが不完全です:', data);
      }
    } catch (err) {
      console.error('認証処理エラー:', err);
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