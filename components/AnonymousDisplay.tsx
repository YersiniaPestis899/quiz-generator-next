'use client';

import { useAnonymous } from '@/lib/AnonymousContext';

/**
 * 匿名ユーザー表示コンポーネント
 * 匿名IDの代わりにシンプルな識別子を表示
 */
export default function AnonymousDisplay() {
  const { anonymousId, isLoading } = useAnonymous();
  
  if (isLoading) {
    return (
      <div className="bg-panel/70 p-2 rounded-lg animate-pulse">
        <span className="text-sm">読み込み中...</span>
      </div>
    );
  }
  
  const shortId = anonymousId ? anonymousId.substring(5, 13) : 'unknown';
  
  return (
    <div className="bg-panel p-3 rounded-lg shadow-md">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <span className="text-white font-bold">{shortId.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-text">セッション ID</span>
          <span className="text-xs text-text-secondary">{shortId}</span>
        </div>
      </div>
    </div>
  );
}