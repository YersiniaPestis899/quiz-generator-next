'use client';

import React, { useState, useEffect, useRef } from 'react';

// サジェスチョンカテゴリーとアイテムの定義
const SUGGESTIONS = [
  {
    category: 'キーワード',
    items: ['なぞなぞ', '漢字', '英語', 'プログラミング', '歴史', '地理', '理科', '数学']
  },
  {
    category: '特定のトピック',
    items: ['日本の歴史', '世界の国々', 'プログラミング言語', '宇宙', '動物', '植物', '化学元素', '体育']
  }
];

interface ContentSuggestionsProps {
  inputValue: string;
  onSuggestionClick: (suggestion: string) => void;
}

/**
 * コンテンツ入力支援のサジェスチョン表示コンポーネント
 */
export default function ContentSuggestions({ inputValue, onSuggestionClick }: ContentSuggestionsProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // 初期状態では非表示
  useEffect(() => {
    setShowSuggestions(false);
  }, []);
  
  // 外部クリック時の処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // サジェスチョンボタンの表示
  return (
    <div className="suggestions-wrapper" ref={suggestionsRef}>
      {!showSuggestions ? (
        <button 
          onClick={() => setShowSuggestions(true)}
          className="suggest-button text-xs text-primary hover:text-primary-hover bg-transparent py-1 px-2 rounded-md border border-primary/30 hover:border-primary/60 transition-colors mt-1"
        >
          📋 キーワード候補を表示
        </button>
      ) : (
        <div className="suggestions-panel bg-panel rounded-md p-4 border border-primary/30 shadow-lg mt-2">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-text-accent">
              クイズのテーマ候補
            </span>
            <button 
              onClick={() => setShowSuggestions(false)}
              className="text-xs text-text-secondary hover:text-text px-2 py-1 rounded-full hover:bg-primary/10 transition-colors"
            >
              閉じる ✕
            </button>
          </div>
          
          {SUGGESTIONS.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-4">
              <div className="text-xs text-text-accent mb-2 font-medium">
                {group.category}:
              </div>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    className="text-sm bg-primary/20 hover:bg-primary/40 text-text-accent px-3 py-1 rounded-full transition-colors"
                    onClick={() => {
                      onSuggestionClick(item);
                      setShowSuggestions(false);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
          
          <div className="text-xs text-text-secondary mt-2 italic text-center">
            キーワードをクリックするとテキストエリアに挿入されます
          </div>
        </div>
      )}
    </div>
  );
}