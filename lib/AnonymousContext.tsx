'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type AnonymousContextType = {
  anonymousId: string | null;
  isLoading: boolean;
};

const AnonymousContext = createContext<AnonymousContextType | undefined>(undefined);

/**
 * 単純化された匿名認証コンテキスト
 * 匿名IDの管理のみを行い、認証機能は提供しない
 */
export function AnonymousProvider({ children }: { children: React.ReactNode }) {
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 匿名IDの初期化
    const initAnonymousId = () => {
      setIsLoading(true);
      
      try {
        // ローカルストレージから匿名IDを取得
        let storedId = localStorage.getItem('anonymousUserId');
        
        // 存在しない場合は新規生成
        if (!storedId) {
          storedId = `anon_${Math.random().toString(36).substring(2, 15)}`;
          localStorage.setItem('anonymousUserId', storedId);
          console.log('新規匿名ID生成:', storedId);
        } else {
          console.log('既存匿名ID取得:', storedId);
        }
        
        setAnonymousId(storedId);
      } catch (error) {
        console.error('匿名ID初期化エラー:', error);
        // エラー時はメモリ内だけで一時IDを設定
        const tempId = `anon_${Math.random().toString(36).substring(2, 15)}`;
        setAnonymousId(tempId);
      }
      
      setIsLoading(false);
    };
    
    initAnonymousId();
  }, []);

  return (
    <AnonymousContext.Provider value={{ anonymousId, isLoading }}>
      {children}
    </AnonymousContext.Provider>
  );
}

// カスタムフック - 匿名コンテキストの使用を簡素化
export function useAnonymous() {
  const context = useContext(AnonymousContext);
  
  if (context === undefined) {
    throw new Error('useAnonymous must be used within an AnonymousProvider');
  }
  
  return context;
}