'use client';

import { useEffect, useState, useRef } from 'react';
import { Quiz } from '@/lib/types';
import { playButtonClickSound } from '@/lib/soundGenerator';
import { useAnonymous } from '@/lib/AnonymousContext';

interface QuizListProps {
  onSelectQuiz: (quiz: Quiz) => void;
  triggerRefresh?: number; // 外部からの再読み込みトリガー
}

/**
 * クイズリストコンポーネント - 簡素化版
 * 単一リストでクイズを表示
 */
export default function QuizList({ onSelectQuiz, triggerRefresh = 0 }: QuizListProps) {
  const { anonymousId } = useAnonymous();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // 難易度の日本語表示マッピング
  const difficultyLabels: Record<string, string> = {
    'easy': '簡単',
    'medium': '普通',
    'hard': '難しい'
  };

  // クイズ取得関数 - すべてのクイズを取得
  const fetchQuizzes = async (search?: string) => {
    console.log('クイズ取得関数実行', search);
    try {
      setLoading(true);
      setError(null);
      
      // APIリクエストURLの構築 - community=trueパラメータを常に含める
      let url = '/api/quizzes?community=true';
      
      // 検索クエリがあれば追加
      if (search && search.trim() !== '') {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      console.log('クイズ取得URL:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.message || 'クイズの取得に失敗しました');
      }
      
      const data = await response.json();
      console.log(`${data.length} 件のクイズを取得しました`);
      setQuizzes(data);
    } catch (err: any) {
      console.error('クイズ取得エラー:', err);
      setError('クイズの読み込みに失敗しました: ' + err.message);
      // 失敗時は空の配列を設定
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };
  
  // 検索フォーム送信ハンドラ
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    playButtonClickSound();
    fetchQuizzes(searchQuery);
  };

  // 初回マウント時のデータ取得
  useEffect(() => {
    if (anonymousId) {
      console.log('初期クイズ取得を実行');
      fetchQuizzes();
    }
  }, [anonymousId]);
  
  // triggerRefresh値が変更されたときにデータ再取得
  useEffect(() => {
    if (triggerRefresh > 0 && anonymousId) {
      console.log('外部トリガーによるクイズ再取得', { triggerRefresh });
      fetchQuizzes();
    }
  }, [triggerRefresh, anonymousId]);
  
  // ローディング表示
  if (loading) {
    return (
      <div className="card">
        <h3 className="text-xl mb-4">クイズ一覧</h3>
        <div className="loading">クイズを読み込み中...</div>
      </div>
    );
  }
  
  // エラー表示
  if (error) {
    return (
      <div className="card">
        <h3 className="text-xl mb-4">クイズ一覧</h3>
        <div className="error">{error}</div>
      </div>
    );
  }
  
  return (
    <div className="card">
      {/* 検索UI */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="クイズタイトルで検索..."
            className="flex-1 p-2 bg-panel border border-border/50 rounded-l focus:outline-none focus:ring-1 focus:ring-primary"
            ref={searchInputRef}
          />
          <button 
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded-r hover:bg-primary-hover transition-colors"
          >
            <span>🔍</span>
          </button>
        </div>
      </form>
      
      <h3 className="text-xl mb-4">
        クイズ一覧
        {searchQuery && <span className="text-sm text-text-secondary ml-2">「{searchQuery}」の検索結果</span>}
      </h3>
      
      {quizzes.length === 0 ? (
        <div className="empty-list">
          {searchQuery 
            ? `「${searchQuery}」に一致するクイズが見つかりませんでした。` 
            : 'クイズがありません。新しいクイズを作成してください。'}
        </div>
      ) : (
        <ul className="quiz-list">
          {quizzes.map((quiz) => (
            <li key={quiz.id} onClick={() => {
              onSelectQuiz(quiz);
              playButtonClickSound();
            }}>
              <div className="quiz-item">
                <div className="title">{quiz.title}</div>
                <div className="details">
                  <span>{quiz.questions.length}問</span>
                  <span>{difficultyLabels[quiz.difficulty] || quiz.difficulty}</span>
                  {quiz.user_id && quiz.user_id !== anonymousId && (
                    <span className="text-xs bg-accent/20 px-2 py-1 rounded">
                      共有クイズ
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}