'use client';

import { useState, useEffect, useRef } from 'react';
import { SPECIAL_CATEGORIES } from '@/lib/specialCategories';

interface ContentSuggestionsProps {
  inputValue: string;
  onSuggestionClick: (suggestion: string) => void;
}

/**
 * コンテンツ入力サジェスチョンコンポーネント
 * ユーザーがプロンプト入力に困らないようサポート
 */
export default function ContentSuggestions({ inputValue, onSuggestionClick }: ContentSuggestionsProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 特殊カテゴリのサジェスト表示条件を設定
  useEffect(() => {
    const normalizedInput = inputValue.trim().toLowerCase();
    
    // 入力が短い場合のみサジェスト表示
    if (normalizedInput.length > 0 && normalizedInput.length < 10 && !normalizedInput.includes('\n')) {
      // 入力に部分一致するカテゴリを抽出
      const matchingSuggestions = Object.entries(SPECIAL_CATEGORIES)
        .filter(([category, config]) => {
          const patterns = config.detectionPatterns;
          return patterns.some(pattern => 
            pattern.toLowerCase().includes(normalizedInput) || 
            normalizedInput.includes(pattern.toLowerCase())
          );
        })
        .map(([category]) => category);
      
      // 追加のサジェスト（特殊カテゴリにないが、提案したいもの）
      const additionalSuggestions = [
        '英単語テスト', 'TOEIC問題集', 'プログラミング基礎', 'Pythonクイズ', 
        'JavaScript問題', '日本史クイズ', '世界史問題', '地理クイズ', 
        '算数問題', '数学クイズ', '理科実験', '社会科クイズ'
      ].filter(sugg => sugg.includes(normalizedInput) || normalizedInput.includes(sugg));
      
      // 重複を排除して結合
      const allSuggestions = [...new Set([...matchingSuggestions, ...additionalSuggestions])];
      
      if (allSuggestions.length > 0) {
        setSuggestions(allSuggestions);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [inputValue]);
  
  // 外部クリックでサジェスト閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // サジェスト非表示なら何も表示しない
  if (!showSuggestions || suggestions.length === 0) {
    return null;
  }
  
  return (
    <div ref={containerRef} className="suggestions-container">
      <div className="suggestions-title">
        クイズ提案:
      </div>
      <div className="suggestions-list">
        {suggestions.map((suggestion, index) => (
          <div 
            key={index} 
            className="suggestion-item" 
            onClick={() => {
              onSuggestionClick(suggestion);
              setShowSuggestions(false);
            }}
          >
            {suggestion}
          </div>
        ))}
      </div>
      <div className="suggestions-hint">
        シンプルなキーワード入力でも自動解釈します！
      </div>
      <style jsx>{`
        .suggestions-container {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          background: rgba(26, 16, 79, 0.95);
          border: 1px solid var(--primary);
          border-radius: 8px;
          padding: 0.5rem;
          z-index: 10;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          margin-top: 4px;
        }
        .suggestions-title {
          font-size: 0.9rem;
          color: var(--accent);
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        .suggestions-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .suggestion-item {
          background: rgba(108, 34, 189, 0.3);
          border: 1px solid var(--primary-light);
          border-radius: 16px;
          padding: 0.4rem 0.8rem;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .suggestion-item:hover {
          background: rgba(108, 34, 189, 0.5);
          transform: translateY(-2px);
        }
        .suggestions-hint {
          font-size: 0.8rem;
          color: var(--accent);
          font-style: italic;
          text-align: center;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
