'use client';

import React, { useState, useEffect } from 'react';

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
  
  // 入力値が空の場合のみサジェスチョンを表示
  useEffect(() => {
    setShowSuggestions(inputValue.trim().length === 0);
  }, [inputValue]);
  
  // サジェスチョンがない場合は何も表示しない
  if (!showSuggestions) {
    return null;
  }
  
  return (
    <div className="suggestions-container mt-2 bg-panel/50 rounded-md p-3 border border-border/30">
      <div className="text-sm text-text-secondary mb-2">
        クイズの生成テーマのサジェスチョン:
      </div>
      
      {SUGGESTIONS.map((group, groupIndex) => (
        <div key={groupIndex} className="mb-3">
          <div className="text-xs text-text-accent mb-1 font-medium">
            {group.category}:
          </div>
          <div className="flex flex-wrap gap-2">
            {group.items.map((item, itemIndex) => (
              <button
                key={itemIndex}
                className="text-xs bg-primary/20 hover:bg-primary/40 text-text-accent px-2 py-1 rounded-full transition-colors"
                onClick={() => onSuggestionClick(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ))}
      
      <style jsx>{`
        .suggestions-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 10;
          backdrop-filter: blur(2px);
        }
      `}</style>
    </div>
  );
}