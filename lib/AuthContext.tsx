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
    console.log('AuthProvider: 認証コンテキスト初期化...');
    // セッション状態の初期化
    const initSession = async () => {
      setIsLoading(true);
      
      try {
        console.log('既存のセッションを確認中...');
        // 最新のSupabase API形式
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('セッション取得エラー:', error);
        }
        
        if (session) {
          console.log('有効なセッションを検出:', session.user.id);
          setSession(session);
          setUser(session.user);
        } else {
          console.log('アクティブな認証セッションがありません');
          setSession(null);
          setUser(null);
        }
        
        // リアルタイムセッション監視を設定
        const { data: { subscription } } = await supabase.auth.onAuthStateChange(
          (event, session) => {
            console.log(`認証状態変更イベント: ${event}`);
            
            if (session) {
              console.log('新しい認証セッション:', session.user.id);
              setSession(session);
              setUser(session.user);
            } else {
              console.log('認証セッションが終了');
              setSession(null);
              setUser(null);
            }
            
            // セッション変更時の特別なアクション
            if (event === 'SIGNED_IN') {
              console.log('サインイン検出: ユーザーデータ同期を準備');
            }
            
            if (event === 'SIGNED_OUT') {
              console.log('サインアウト検出: 匿名IDをクリア');
              clearAnonymousId();
            }
            
            setIsLoading(false);
          }
        );
        
        setIsLoading(false);
        
        // クリーンアップ時にリスナーを解除
        return () => {
          console.log('認証リスナーを解除');
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error('認証初期化エラー:', err);
        setIsLoading(false);
      }
    };
    
    initSession();
  }, []);

  // Google認証でのサインイン
  const signInWithGoogle = async () => {
    try {
      console.log('Google認証開始...');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });
      
      if (error) {
        console.error('Google認証エラー:', error);
      }
    } catch (err) {
      console.error('認証処理エラー:', err);
    }
  };

  // サインアウト処理
  const signOut = async () => {
    try {
      console.log('サインアウト処理開始...');
      // サインアウト前に匿名IDをクリア
      clearAnonymousId();
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('サインアウトエラー:', error);
      } else {
        console.log('サインアウト成功');
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