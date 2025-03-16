'use client';

import { useEffect, useState, useCallback } from 'react';
import { Quiz } from '@/lib/types';
import { useAuth } from '@/lib/AuthContext';

interface QuizListProps {
  onSelectQuiz: (quiz: Quiz) => void;
}

/**
 * クイズリストコンポーネント
 * 保存されたクイズの一覧を表示
 */
export default function QuizList({ onSelectQuiz }: QuizListProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const { user, isLoading: authLoading } = useAuth();
  
  // 難易度の日本語表示マッピング
  const difficultyLabels: Record<string, string> = {
    'easy': '簡単',
    'medium': '普通',
    'hard': '難しい'
  };

  // 洗練されたフェッチ関数 (useCallbackでメモ化)
  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      console.log('クイズデータを再取得中...');
      
      // ブラウザストレージからIDを取得
      let queryParams = '';
      
      if (typeof window !== 'undefined') {
        const storedId = localStorage.getItem('anonymousUserId');
        if (storedId) {
          console.log('使用するID:', storedId);
          queryParams = `?anonymousId=${encodeURIComponent(storedId)}`;
        }
      }
      
      // APIコール (ID情報付き)
      const response = await fetch(`/api/quizzes${queryParams}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('APIエラーレスポンス:', errorData);
        throw new Error(errorData.message || 'クイズの取得に失敗しました');
      }
      
      const data = await response.json();
      console.log(`${data.length}件のクイズを取得しました`);
      
      // 最新のタイムスタンプでソート
      data.sort((a: Quiz, b: Quiz) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      
      setQuizzes(data);
      setError(null);
    } catch (err: any) {
      console.error('クイズ取得エラー:', err);
      setError('クイズの読み込みに失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []); // 依存配列を空に

  // コンポーネントマウント時の初期データ取得
  useEffect(() => {
    fetchQuizzes();
    
    // ローカルストレージの変更を監視する (他のタブでの変更に対応)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'anonymousUserId' || event.key === 'quizzes_updated') {
        console.log('ストレージ変更を検出:', event.key);
        fetchQuizzes();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // ページの可視性変更時に更新（タブがアクティブになった時）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('タブがアクティブになりました - データを再取得');
        fetchQuizzes();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // クリーンアップ関数
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchQuizzes]); // メモ化されたfetchQuizzesを依存配列に

  // 認証状態変更時のデータ再取得
  useEffect(() => {
    if (!authLoading) { // 認証読み込みが完了した時のみ
      console.log('認証状態変更を検出 - データを再取得');
      fetchQuizzes();
    }
  }, [user, authLoading, fetchQuizzes]); // 認証状態が変わったときに再フェッチ

  // 定期的な更新 (60秒ごと)
  useEffect(() => {
    const refreshIntervalId = setInterval(() => {
      // 最後の更新から60秒以上経過している場合のみ更新
      if (Date.now() - lastRefresh > 60000) {
        console.log('定期更新 - クイズデータを再取得');
        fetchQuizzes();
        setLastRefresh(Date.now());
      }
    }, 30000); // 30秒ごとにチェック
    
    return () => clearInterval(refreshIntervalId);
  }, [fetchQuizzes, lastRefresh]);

  // カスタムイベントリスナーを追加 (他コンポーネントからの更新通知用)
  useEffect(() => {
    const handleQuizUpdated = () => {
      console.log('クイズ更新イベントを検出');
      fetchQuizzes();
      setLastRefresh(Date.now());
    };
    
    // カスタムイベントの登録
    window.addEventListener('quizUpdated', handleQuizUpdated);
    
    return () => {
      window.removeEventListener('quizUpdated', handleQuizUpdated);
    };
  }, [fetchQuizzes]);

  // 手動更新関数
  const refreshQuizzes = () => {
    console.log('手動更新リクエスト');
    fetchQuizzes();
    setLastRefresh(Date.now());
  };
  
  // ボタンクリック音再生関数（プレースホルダー）
  const playButtonClickSound = () => {
    // サウンド機能は省略
  };
  
  if (loading) {
    return (
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl">あなたのクイズ一覧</h3>
          <button 
            onClick={refreshQuizzes}
            className="text-xs text-text-secondary px-2 py-1 rounded-full hover:bg-primary/10"
            disabled={loading}
          >
            更新
          </button>
        </div>
        <div className="loading">クイズを読み込み中...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl">あなたのクイズ一覧</h3>
          <button 
            onClick={refreshQuizzes}
            className="text-xs text-text-secondary px-2 py-1 rounded-full hover:bg-primary/10"
          >
            再試行
          </button>
        </div>
        <div className="error">{error}</div>
      </div>
    );
  }
  
  if (quizzes.length === 0) {
    return (
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl">あなたのクイズ一覧</h3>
          <button 
            onClick={refreshQuizzes}
            className="text-xs text-text-secondary px-2 py-1 rounded-full hover:bg-primary/10"
          >
            更新
          </button>
        </div>
        <div className="empty-list">保存されたクイズはありません。新しいクイズを作成してください。</div>
      </div>
    );
  }
  
  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl">あなたの保存済みクイズ</h3>
        <button 
          onClick={refreshQuizzes}
          className="text-xs text-text-secondary px-2 py-1 rounded-full hover:bg-primary/10"
        >
          更新
        </button>
      </div>
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
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}