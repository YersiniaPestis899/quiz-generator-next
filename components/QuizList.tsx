'use client';

import { useEffect, useState } from 'react';
import { Quiz } from '@/lib/types';

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
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  
  // 難易度の日本語表示マッピング
  const difficultyLabels: Record<string, string> = {
    'easy': '簡単',
    'medium': '普通',
    'hard': '難しい'
  };

  // コンポーネントマウント時にローカルストレージから匿名IDを取得
  useEffect(() => {
    try {
      // ブラウザの環境でのみ実行
      if (typeof window !== 'undefined') {
        const storedAnonymousId = localStorage.getItem('anonymousUserId');
        if (storedAnonymousId) {
          console.log('Retrieved anonymousId from localStorage:', storedAnonymousId);
          setAnonymousId(storedAnonymousId);
        } else {
          // 新規匿名IDを生成して保存
          const newAnonymousId = `anon_${Math.random().toString(36).substring(2, 15)}`;
          console.log('Generated new anonymousId:', newAnonymousId);
          localStorage.setItem('anonymousUserId', newAnonymousId);
          setAnonymousId(newAnonymousId);
        }
      }
    } catch (err) {
      console.error('Error handling localStorage:', err);
      // localStorage関連のエラーは無視して通常のフェッチを試みる
      fetchQuizzesWithoutAnonymousId();
    }
  }, []);

  // 匿名IDがない場合の通常フェッチ
  const fetchQuizzesWithoutAnonymousId = async () => {
    try {
      setLoading(true);
      console.log('Fetching quizzes without anonymousId');
      const response = await fetch('/api/quizzes');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'クイズの取得に失敗しました');
      }
      
      const data = await response.json();
      console.log(`Fetched ${data.length} quizzes without anonymousId`);
      setQuizzes(data);
    } catch (err: any) {
      console.error('クイズ取得エラー:', err);
      setError('クイズの読み込みに失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 匿名IDを取得後、クイズ一覧を取得
  useEffect(() => {
    // 匿名IDが取得できていない場合は何もしない
    if (!anonymousId) return;
    
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        console.log('クイズデータを再取得中...');
        console.log('使用するID:', anonymousId);
        
        // UUIDパターンを検出する正規表現
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const isAuthenticated = uuidPattern.test(anonymousId);
        
        if (isAuthenticated) {
          console.log("認証済みUUID形式のユーザーIDを検出: 全クイズにアクセス可能");
        }
        
        // 匿名IDをクエリパラメータとして追加
        const response = await fetch(`/api/quizzes?anonymousId=${encodeURIComponent(anonymousId)}&isAuthenticated=${isAuthenticated}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('API error response:', errorData);
          throw new Error(errorData.message || 'クイズの取得に失敗しました');
        }
        
        const data = await response.json();
        console.log(`${data.length}件のクイズを取得しました`);
        
        // クイズが0件の場合、UUID形式のIDでも直接全クイズにアクセスを試みる
        if (data.length === 0 && uuidPattern.test(anonymousId)) {
          console.log("クイズが0件: バックアップとして全クイズ取得を試行");
          
          // バックアップAPIコール - 無条件で全クイズを取得
          const backupResponse = await fetch('/api/quizzes?getAllQuizzes=true');
          
          if (backupResponse.ok) {
            const backupData = await backupResponse.json();
            console.log(`バックアップ取得: ${backupData.length}件のクイズを取得`);
            setQuizzes(backupData);
          } else {
            console.log("バックアップ取得も失敗");
            setQuizzes(data); // 元の空の結果を使用
          }
        } else {
          setQuizzes(data);
        }
      } catch (err: any) {
        console.error('クイズ取得エラー:', err);
        setError('クイズの読み込みに失敗しました: ' + err.message);
        
        // エラー発生時にバックアップとして通常フェッチを試みる
        try {
          console.log('Attempting fallback fetch without anonymousId');
          await fetchQuizzesWithoutAnonymousId();
        } catch (fallbackErr) {
          console.error('Fallback fetch also failed:', fallbackErr);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuizzes();
  }, [anonymousId]);
  
  // ボタンクリック音再生関数（プレースホルダー）
  const playButtonClickSound = () => {
    // サウンド機能は省略
  };
  
  if (loading) {
    return (
      <div className="card">
        <h3 className="text-xl mb-4">あなたのクイズ一覧</h3>
        <div className="loading">クイズを読み込み中...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="card">
        <h3 className="text-xl mb-4">あなたのクイズ一覧</h3>
        <div className="error">{error}</div>
      </div>
    );
  }
  
  if (quizzes.length === 0) {
    return (
      <div className="card">
        <h3 className="text-xl mb-4">あなたのクイズ一覧</h3>
        <div className="empty-list">保存されたクイズはありません。新しいクイズを作成してください。</div>
      </div>
    );
  }
  
  return (
    <div className="card">
      <h3 className="text-xl mb-4">あなたの保存済みクイズ</h3>
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