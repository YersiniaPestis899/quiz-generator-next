'use client';

import { useState, useEffect } from 'react';
import { Quiz } from '@/lib/types';
import { saveQuiz } from '@/lib/supabase';

interface QuizDisplayProps {
  quiz: Quiz;
}

/**
 * クイズ表示コンポーネント
 * クイズの問題と回答オプションを表示し、ユーザーの回答を追跡
 */
export default function QuizDisplay({ quiz }: QuizDisplayProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showPerfectConfetti, setShowPerfectConfetti] = useState(false);
  const [showAnswerEffect, setShowAnswerEffect] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false); // カウントダウン進行中フラグ
  const [isPreparationPhase, setIsPreparationPhase] = useState(false); // 準備フェーズフラグ
  const [answerTimeLeft, setAnswerTimeLeft] = useState<number | null>(null); // 回答時間制限
  const [isSaving, setIsSaving] = useState(false); // 保存中フラグ
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle'); // 保存状態
  const [saveMessage, setSaveMessage] = useState<string>(''); // 保存メッセージ
  
  // クイズデータが無効な場合のフォールバック表示
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="card">
        <div className="error">無効なクイズデータです。別のクイズを選択するか、新しいクイズを生成してください。</div>
      </div>
    );
  }
  
  const question = quiz.questions[currentQuestion];
  
  /**
   * 回答選択ハンドラー
   * @param {string} answerId - 選択された回答のID
   */
  const handleAnswerSelect = (answerId: string) => {
    const questionId = currentQuestion;
    const isCorrect = quiz.questions[questionId].correctAnswerId === answerId;
    
    // 回答時に進行中のカウントダウンをキャンセル
    setIsCountingDown(false);
    setCountdown(null);
    // 回答時間タイマーもキャンセル
    setAnswerTimeLeft(null);
    
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: answerId
    });
    
    // 正解・不正解エフェクト表示
    setLastAnswerCorrect(isCorrect);
    setShowAnswerEffect(true);
    
    // エフェクトリセット
    setTimeout(() => {
      setShowAnswerEffect(false);
    }, 1000);
  };
  
  /**
   * 次の質問へ進むハンドラー
   */
  const handleNext = () => {
    // 回答時間タイマーをリセット
    setAnswerTimeLeft(null);
    
    if (currentQuestion < quiz.questions.length - 1) {
      // 次の問題紹介の準備カウントダウン開始
      setCountdown(3);
      setIsPreparationPhase(true);
      setIsCountingDown(true);
      
      // 次の質問に移動
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // 最後の問題の場合は結果表示へ直接遷移
      setShowResults(true);
      
      // 正答率に応じたエフェクト
      const score = calculateScore();
      const percentage = Math.round((score / quiz.questions.length) * 100);
      
      if (percentage === 100) {
        // パーフェクトスコア: 特別演出
        setShowPerfectConfetti(true);
      } else if (percentage >= 50) {
        // 50%以上: 通常の演出
        setShowConfetti(true);
      }
    }
  };
  
  // クイズが変更された時に初期化処理を行う
  useEffect(() => {
    // クイズの基本状態をリセット
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
    setSaveStatus('idle');
    setSaveMessage('');
    
    // カウントダウン関連のリセット
    setCountdown(null);
    setIsCountingDown(false);
    setIsPreparationPhase(false);
    setAnswerTimeLeft(null);
    
    // クイズ選択直後に準備カウントダウンを開始
    setCountdown(3);
    setIsPreparationPhase(true);
    setIsCountingDown(true);
  }, [quiz.id]); // quiz.idが変わった時のみ実行
  
  // 準備フェーズのカウントダウン処理
  useEffect(() => {
    // カウントダウンが設定されていないか、カウントダウン中でない場合は何もしない
    if (countdown === null || !isCountingDown) return;
    
    if (countdown > 0) {
      // カウントダウン進行中
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // カウントダウンが0になった時
      if (isPreparationPhase) {
        // 「準備」フェーズの場合
        setIsPreparationPhase(false);  // 準備フェーズ終了
        setIsCountingDown(false);      // カウントダウン終了
        setCountdown(null);           // カウントダウン表示をクリア
        
        // 回答時間タイマーを開始（オプショナル）
        // setAnswerTimeLeft(5);
      } else {
        // 準備フェーズではない場合は通常のタイマー切れ
        setIsCountingDown(false);
        setCountdown(null);
      }
    }
  }, [countdown, isCountingDown, isPreparationPhase, currentQuestion]);
  
  /**
   * 前の質問へ戻るハンドラー
   */
  const handlePrevious = () => {
    if (currentQuestion > 0) {
      // カウントダウンをキャンセルして前の問題に移動
      setIsCountingDown(false);
      setIsPreparationPhase(false);
      setCountdown(null);
      setAnswerTimeLeft(null);
      setCurrentQuestion(currentQuestion - 1);
    }
  };
  
  /**
   * スコア計算関数
   * @returns {number} - 正解数
   */
  const calculateScore = () => {
    let score = 0;
    Object.entries(selectedAnswers).forEach(([questionIdx, answerId]) => {
      const question = quiz.questions[parseInt(questionIdx)];
      if (question.correctAnswerId === answerId) {
        score++;
      }
    });
    return score;
  };
  
  /**
   * クイズをリスタートするハンドラー
   */
  const restartQuiz = () => {
    // 基本状態をリセット
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
    setAnswerTimeLeft(null);
    setShowConfetti(false);
    setShowPerfectConfetti(false);
    
    // 準備カウントダウンを開始
    setCountdown(3);
    setIsPreparationPhase(true);
    setIsCountingDown(true);
  };
  
  /**
   * クイズを明示的に保存するハンドラー
   */
  const handleSaveQuiz = async () => {
    try {
      // 保存中状態を設定
      setIsSaving(true);
      setSaveStatus('saving');
      setSaveMessage('クイズを保存中...');
      
      console.log('保存処理を開始します。クイズID:', quiz.id);
      
      // クイズにスコア情報を付加
      const score = calculateScore();
      const scorePercentage = Math.round((score / quiz.questions.length) * 100);
      
      // 回答情報を含むクイズデータを作成
      const quizWithAnswers = {
        ...quiz,
        user_answers: selectedAnswers,
        score: {
          correct: score,
          total: quiz.questions.length,
          percentage: scorePercentage
        },
        last_played: new Date().toISOString()
      };
      
      // Supabaseに保存
      const result = await saveQuiz(quizWithAnswers);
      
      console.log('保存結果:', result);
      
      // 成功表示
      setSaveStatus('success');
      setSaveMessage('クイズが正常に保存されました！');
      
      // 3秒後にメッセージを消す
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 3000);
    } catch (error) {
      console.error('クイズ保存エラー:', error);
      
      // エラー表示
      setSaveStatus('error');
      setSaveMessage('保存中にエラーが発生しました。再試行してください。');
      
      // 5秒後にメッセージを消す
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 5000);
    } finally {
      setIsSaving(false);
    }
  };
  
  // 結果表示モードの場合
  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score / quiz.questions.length) * 100);
    
    // 正答率に応じたクラス名を決定
    let resultClassName = "quiz-results";
    let scoreMessage = null;
    
    if (percentage === 100) {
      resultClassName += " perfect-score";
      scoreMessage = (
        <div className="perfect-score-message">
          素晴らしい！完璧な正解率です！
        </div>
      );
    } else if (percentage >= 80) {
      resultClassName += " high-score";
      scoreMessage = (
        <div className="high-score-message">
          素晴らしい成績です！
        </div>
      );
    } else if (percentage >= 50) {
      resultClassName += " average-score";
      scoreMessage = (
        <div className="average-score-message">
          良い成績です！次はもっと上を目指しましょう！
        </div>
      );
    } else {
      resultClassName += " low-score";
      scoreMessage = (
        <div className="low-score-message">
          もう少し頑張りましょう！
        </div>
      );
    }
    
    return (
      <>
        {percentage >= 50 && percentage < 100 && showConfetti && (
          <div className="confetti-container">
            {Array.from({ length: 50 }).map((_, i) => (
              <div 
                key={i} 
                className="confetti" 
                style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor: ['#FFDE59', '#FF9232', '#6C22BD', '#8D44E0'][Math.floor(Math.random() * 4)],
                  width: `${Math.random() * 8 + 5}px`,
                  height: `${Math.random() * 8 + 5}px`,
                  borderRadius: Math.random() > 0.5 ? '50%' : '0',
                  animationDuration: `${Math.random() * 2 + 3}s`,
                  animationDelay: `${Math.random() * 1.5}s`
                }}
              />
            ))}
          </div>
        )}
        
        {percentage === 100 && showPerfectConfetti && (
          <div className="perfect-confetti-container">
            {Array.from({ length: 100 }).map((_, i) => (
              <div 
                key={i} 
                className="perfect-confetti" 
                style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor: ['#FFD700', '#FFDF00', '#FFFF00', '#FFDE59', '#FF9232', '#FFA500'][Math.floor(Math.random() * 6)],
                  width: `${Math.random() * 12 + 5}px`,
                  height: `${Math.random() * 12 + 5}px`,
                  borderRadius: Math.random() > 0.3 ? '50%' : '0',
                  animationDuration: `${Math.random() * 3 + 3}s`,
                  animationDelay: `${Math.random() * 2}s`,
                  opacity: Math.random() * 0.5 + 0.5,
                  boxShadow: '0 0 5px gold'
                }}
              />
            ))}
            {Array.from({ length: 20 }).map((_, i) => {
              const size = Math.random() * 20 + 10;
              return (
                <div 
                  key={`star-${i}`} 
                  className="perfect-confetti star" 
                  style={{
                    left: `${Math.random() * 100}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    background: 'gold',
                    clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                    animationDuration: `${Math.random() * 4 + 4}s`,
                    animationDelay: `${Math.random() * 3}s`,
                    boxShadow: '0 0 10px gold, 0 0 20px yellow'
                  }}
                />
              );
            })}
          </div>
        )}
        
        <div className={resultClassName}>
          <h2>クイズ結果</h2>
          
          {percentage === 100 && <div className="perfect-badge">パーフェクト!!</div>}
          {percentage >= 80 && percentage < 100 && <div className="high-score-badge">素晴らしい!</div>}
          
          <div className="score-display gameshow">
            <div className="score">{score} / {quiz.questions.length}</div>
            <div className="percentage score-percentage">{percentage}%</div>
          </div>
          
          {scoreMessage}
          
          {/* 保存状態表示エリア */}
          {saveStatus !== 'idle' && (
            <div className={`save-status-message ${saveStatus}`}>
              {saveMessage}
            </div>
          )}
          
          {/* 保存ボタン */}
          <button 
            className={`btn-accent w-full mt-4 mb-4 ${isSaving ? 'opacity-50' : ''}`} 
            onClick={handleSaveQuiz}
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '結果を保存する'}
          </button>
        
          <div className="questions-review">
            {quiz.questions.map((q, idx) => {
              const userAnswerId = selectedAnswers[idx];
              const isCorrect = userAnswerId === q.correctAnswerId;
              
              // 選択された回答と正解の回答を取得
              const userAnswer = q.answers.find(a => a.id === userAnswerId);
              const correctAnswer = q.answers.find(a => a.id === q.correctAnswerId);
              
              return (
                <div key={idx} className={`question-review ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="question-number">問題 {idx + 1}</div>
                  <div className="question-text">{q.text}</div>
                  
                  {!isCorrect && userAnswerId && (
                    <div className="user-answer">
                      あなたの回答: {userAnswer?.text}
                    </div>
                  )}
                  
                  {!isCorrect && (
                    <div className="correct-answer">
                      正解: {correctAnswer?.text}
                    </div>
                  )}
                  
                  <div className="explanation">{q.explanation}</div>
                </div>
              );
            })}
          </div>
          
          <button className="btn-primary w-full mt-4" onClick={restartQuiz}>
            もう一度挑戦する
          </button>
        </div>
      </>
    );
  }
  
  // 通常のクイズ表示モード
  return (
    <>
      {showAnswerEffect && (
        <div className={lastAnswerCorrect ? "correct-answer-effect" : "incorrect-answer-effect"} />
      )}
      
      <div className="quiz-display card">
        <h2>{quiz.title}</h2>
        
        <div className="progress-bar">
          <div 
            className="progress" 
            style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
          ></div>
        </div>
        
        <div className="question-number">
          問題 {currentQuestion + 1} / {quiz.questions.length}
        </div>
      
        <div className="question question-spotlight">
          <h3>{question.text}</h3>
          
          {countdown !== null && (
            <div className="countdown-overlay">
              <div className="countdown-number">{countdown}</div>
              {isPreparationPhase && (
                <div className="countdown-label">準備してください...</div>
              )}
            </div>
          )}
          
          {answerTimeLeft !== null && (
            <div className={`answer-timer ${answerTimeLeft <= 2 ? 'warning' : ''}`}>
              残り時間: {answerTimeLeft}秒
            </div>
          )}
          
          <div className="answers">
            {question.answers.map((answer) => (
              <div 
                key={answer.id} 
                className={`answer answer-option ${selectedAnswers[currentQuestion] === answer.id ? 'selected' : ''}`}
                onClick={() => handleAnswerSelect(answer.id)}
              >
                {answer.text}
              </div>
            ))}
          </div>
        </div>
        
        <div className="navigation">
          <button 
            className="btn-secondary" 
            onClick={handlePrevious}
            disabled={currentQuestion === 0 || answerTimeLeft !== null}
          >
            前の問題
          </button>
          
          <button 
            className="btn-primary" 
            onClick={handleNext}
            disabled={selectedAnswers[currentQuestion] === undefined || answerTimeLeft !== null}
          >
            {currentQuestion < quiz.questions.length - 1 ? '次の問題' : '結果を見る'}
          </button>
        </div>
      </div>
    </>
  );
}