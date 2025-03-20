'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QuizDisplay from '@/components/QuizDisplay';
import { Quiz } from '@/lib/types';

export default function QuizPage() {
  const params = useParams();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        if (!params.id) return;
        
        const response = await fetch(`/api/quizzes/${params.id}`);
        
        if (!response.ok) {
          throw new Error('クイズの取得に失敗しました');
        }
        
        const data = await response.json();
        setQuiz(data);
      } catch (err: any) {
        console.error('クイズ取得エラー:', err);
        setError(err.message || 'クイズの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [params.id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <div className="loading">クイズを読み込み中...</div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="container mx-auto px-4">
        <div className="error">
          {error || 'クイズが見つかりませんでした。'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <QuizDisplay quiz={quiz} />
    </div>
  );
}