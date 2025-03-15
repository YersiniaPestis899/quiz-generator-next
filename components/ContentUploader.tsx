'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import { Quiz } from '@/lib/types';

interface ContentUploaderProps {
  onQuizGenerated: (quiz: Quiz) => void;
}

/**
 * コンテンツアップローダーコンポーネント
 * 教育コンテンツからクイズを生成するためのフォームを提供
 */
export default function ContentUploader({ onQuizGenerated }: ContentUploaderProps) {
  // フォーム状態管理
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<number | null>(null);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  
  // テキストエリア参照
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  
  // コンポーネントマウント時にローカルストレージから匿名IDを取得
  useEffect(() => {
    try {
      // ブラウザ環境かチェック
      if (typeof window !== 'undefined') {
        const storedAnonymousId = localStorage.getItem('anonymousUserId');
        if (storedAnonymousId) {
          setAnonymousId(storedAnonymousId);
        } else {
          // 新規匿名IDを生成して保存
          const newAnonymousId = `anon_${Math.random().toString(36).substring(2, 15)}`;
          localStorage.setItem('anonymousUserId', newAnonymousId);
          setAnonymousId(newAnonymousId);
        }
      }
    } catch (storageError) {
      console.error('Error accessing localStorage:', storageError);
    }
  }, []);

  /**
   * フォーム送信ハンドラー
   * APIを通じてクイズ生成をリクエスト
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGenerationProgress(0);
    
    try {
      // 問題数が多い場合のユーザーへの通知
      if (numQuestions > 6) {
        setGenerationProgress(10);
        // 進捗表示アニメーション
        const progressInterval = setInterval(() => {
          setGenerationProgress(prev => {
            if (prev === null) return 10;
            // 生成中の進捗をシミュレート (最大90%まで)
            return prev < 90 ? prev + Math.random() * 5 : prev;
          });
        }, 1500);
        
        // クリーンアップ関数を定義
        const cleanupProgress = () => {
          clearInterval(progressInterval);
          setGenerationProgress(null);
        };
        
        // APIリクエスト
        const apiUrl = anonymousId 
          ? `/api/generate?anonymousId=${encodeURIComponent(anonymousId)}`
          : '/api/generate';
          
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            content,
            numQuestions,
            difficulty
          }),
        });
        
        cleanupProgress(); // 進捗表示を停止
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'クイズ生成に失敗しました');
        }
        
        const quiz = await response.json();
        onQuizGenerated(quiz);
        
        // フォームをリセット
        setTitle('');
        setContent('');
      } else {
        // 従来の処理（少ない問題数の場合）
        const apiUrl = anonymousId 
          ? `/api/generate?anonymousId=${encodeURIComponent(anonymousId)}`
          : '/api/generate';
          
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            content,
            numQuestions,
            difficulty
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'クイズ生成に失敗しました');
        }
        
        const quiz = await response.json();
        onQuizGenerated(quiz);
        
        // フォームをリセット
        setTitle('');
        setContent('');
      }
    } catch (err: any) {
      console.error('クイズ生成エラー:', err);
      setError('クイズの生成に失敗しました: ' + err.message);
    } finally {
      setLoading(false);
      setGenerationProgress(null);
    }
  };

  // 難易度の日本語表示マッピング
  const difficultyLabels: Record<string, string> = {
    'easy': '簡単',
    'medium': '普通',
    'hard': '難しい'
  };

  return (
    <div className="card-content">
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">クイズタイトル</label>
          <input 
            type="text" 
            id="title" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
            placeholder="例: プログラミング基礎知識クイズ"
            className="focus:ring-2 focus:ring-primary focus:outline-none w-full px-3 py-2"
            disabled={loading}
          />
        </div>
        
        <div className="form-group textarea-container relative">
          <label htmlFor="content">教育コンテンツ</label>
          <textarea 
            id="content" 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            rows={24} 
            required 
            placeholder="ここに質問を生成するための教材内容をペーストしてください... シンプルなキーワード（例：なぞなぞ、英語、漢字）だけでも自動解釈します"
            className="focus:ring-2 focus:ring-primary focus:outline-none text-base h-[60vh] min-h-[400px] w-full m-0"
            ref={contentInputRef}
            disabled={loading}
          />
          <div className="input-helper-text">
            単語やフレーズでもOK！<span>例: 「なぞなぞ」「漢字」「英語」「プログラミング」</span>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="numQuestions">質問数</label>
            <input 
              type="number" 
              id="numQuestions" 
              value={numQuestions} 
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                setNumQuestions(Math.min(Math.max(value, 1), 10)); // 1〜10の範囲に制限
              }} 
              min={1} 
              max={10} // 10問に制限
              className="focus:ring-2 focus:ring-primary focus:outline-none"
              disabled={loading}
            />
            <div className="input-helper-text text-xs">
              {numQuestions > 6 ? "多い問題数は生成に時間がかかります" : ""}
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="difficulty">難易度</label>
            <select 
              id="difficulty" 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)}
              className="focus:ring-2 focus:ring-primary focus:outline-none"
              disabled={loading}
            >
              <option value="easy">{difficultyLabels.easy}</option>
              <option value="medium">{difficultyLabels.medium}</option>
              <option value="hard">{difficultyLabels.hard}</option>
            </select>
          </div>
        </div>
        
        {generationProgress !== null && (
          <div className="mb-4">
            <div className="progress-bar">
              <div className="progress" style={{ width: `${generationProgress}%` }}></div>
            </div>
            <div className="text-center text-sm text-text-secondary">クイズ生成中... {Math.round(generationProgress)}%</div>
          </div>
        )}
        
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'クイズ生成中...' : 'クイズを生成'}
        </button>
      </form>
      
      <style jsx>{`
        .input-helper-text {
          font-size: 0.85rem;
          color: var(--accent);
          margin-top: 0.5rem;
          text-align: right;
          opacity: 0.8;
        }
        .input-helper-text span {
          font-style: italic;
        }
        .relative {
          position: relative;
        }
      `}</style>
    </div>
  );
}