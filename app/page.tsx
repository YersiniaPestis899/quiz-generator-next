'use client';

import { useState, useRef, useCallback } from 'react';
import ContentUploader from '@/components/ContentUploader';
import QuizDisplay from '@/components/QuizDisplay';
import QuizList from '@/components/QuizList';
import StatusNotification from '@/components/StatusNotification';
import { Quiz } from '@/lib/types';

export default function Home() {
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const quizDisplayRef = useRef<HTMLDivElement>(null);
  // 状態変数でリロードトリガーを管理（カウンターパターン）
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // クイズリストを更新する関数 - シンプルな設計
  const refreshQuizList = useCallback(() => {
    console.log('クイズリスト更新をトリガー');
    // カウンターをインクリメントして更新を強制
    setRefreshTrigger(prev => prev + 1);
  }, []);
  
  // 似たクイズ生成時のハンドラー - 生成された新しいクイズをアクティブに設定
  const handleSimilarQuizGenerated = (newQuiz: Quiz) => {
    // 新しいクイズをアクティブクイズとして設定
    setActiveQuiz(newQuiz);
    // 表示をリフレッシュ
    refreshQuizList();
    
    // クイズ表示部分にスクロール
    setTimeout(() => {
      if (quizDisplayRef.current) {
        quizDisplayRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
  };
  
  // クイズ選択時に表示エリアにスクロールする関数
  const handleQuizSelect = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    
    // 少し遅延させてスクロール（レンダリング後に実行されるように）
    setTimeout(() => {
      if (quizDisplayRef.current) {
        quizDisplayRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
  };
  
  return (
    <main>
      <div className="container mx-auto px-2 md:px-4 max-w-full">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-2/5 xl:w-1/3">
            <div className="card bg-panel border border-border/30 shadow-lg">
              <h2 className="text-xl md:text-2xl text-text-accent mb-4 font-bold">学習コンテンツからクイズを生成</h2>
              <ContentUploader 
                onQuizGenerated={handleQuizSelect} 
                onQuizSaved={refreshQuizList}
              />
            </div>
          </div>
          <div className="lg:w-3/5 xl:w-2/3">
            <QuizList 
              triggerRefresh={refreshTrigger}
              onSelectQuiz={handleQuizSelect} 
            />
            <div ref={quizDisplayRef} className="mt-6">
              {activeQuiz ? (
                <div className="quiz-container p-1">
                  <QuizDisplay 
                    quiz={activeQuiz} 
                    onQuizSaved={refreshQuizList}
                    onGenerateSimilar={handleSimilarQuizGenerated}
                  />
                </div>
              ) : (
                <div className="placeholder">
                  <h2 className="text-xl md:text-2xl">クイズが選択されていません</h2>
                  <p className="text-text-secondary">リストからクイズを選択するか、新しいクイズを生成してください</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* アプリケーション状態の通知コンポーネント */}
      <StatusNotification 
        options={{
          supabaseCheckEnabled: true,
          awsCheckEnabled: true,
          autoHide: true,
          autoHideDelay: 8000
        }}
      />
    </main>
  );
}