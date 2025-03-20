'use client';

import { useState, useEffect } from 'react';
import { Quiz, Answer } from '@/lib/types';
import { Confetti, AnswerEffect, PerfectConfetti } from './SpecialEffects';
import SoundEffects from './SoundEffects';
import ExpandableAnswerExplanation from './ExpandableAnswerExplanation';

interface QuizDisplayProps {
  quiz: Quiz;
  onQuizSaved?: () => void; // クイズ保存後に呼び出されるコールバック
  // onGenerateSimilar機能を削除
}

/**
 * クイズ表示コンポーネント
 * クイズの問題と回答オプションを表示し、ユーザーの回答を追跡
 */
export default function QuizDisplay({ quiz, onQuizSaved }: QuizDisplayProps) {
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
  const [playCorrectSound, setPlayCorrectSound] = useState(false);
  const [playIncorrectSound, setPlayIncorrectSound] = useState(false);
  const [playCompleteSound, setPlayCompleteSound] = useState(false);
  const [playPerfectSound, setPlayPerfectSound] = useState(false);
  const [playLowScoreSound, setPlayLowScoreSound] = useState(false);
  const [playCountdownSound, setPlayCountdownSound] = useState(false);
  const [playButtonClickSound, setPlayButtonClickSound] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // 似たような問題生成関連の状態変数を削除
  const [saveMessage, setSaveMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  
  // 似たような問題生成関連のポーリング処理を削除
  
  // 似たようなクイズ生成関連のハンドラーを削除
  
  /**
   * クイズを保存するハンドラー
   * @param {boolean} showMessage - 保存後にメッセージを表示するかどうか
   */
  const handleSaveQuiz = async (showMessage = true) => {
    // ボタンクリック音
    setPlayButtonClickSound(true);
    setTimeout(() => setPlayButtonClickSound(false), 300);
    
    setIsSaving(true);
    if (showMessage) setSaveMessage(null);
    
    try {
      // /api/generateエンドポイントを再利用してクイズを保存
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: quiz.title,
          content: `保存用: ${quiz.title}`,
          numQuestions: quiz.questions.length,
          difficulty: quiz.difficulty,
          existingQuiz: quiz // 既存のクイズデータを送信
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'クイズの保存に失敗しました');
      }
      
      // 成功メッセージを表示
      if (showMessage) {
        setSaveMessage({
          text: 'クイズを保存しました',
          type: 'success'
        });
        
        // 3秒後にメッセージを消す
        setTimeout(() => {
          setSaveMessage(null);
        }, 3000);
      }
      
      // クイズリストを更新するため、保存完了を通知
      if (onQuizSaved) {
        console.log('保存成功通知: QuizDisplay -> 親コンポーネント');
        onQuizSaved();
      }
      
    } catch (err: any) {
      console.error('クイズ保存エラー:', err);
      if (showMessage) {
        setSaveMessage({
          text: '保存に失敗しました: ' + err.message,
          type: 'error'
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

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
    
    // 正解・不正解音再生
    if (isCorrect) {
      setPlayCorrectSound(true);
    } else {
      setPlayIncorrectSound(true);
    }
    
    // エフェクトリセット
    setTimeout(() => {
      setShowAnswerEffect(false);
      setPlayCorrectSound(false);
      setPlayIncorrectSound(false);
    }, 1000);
  };
  
  /**
   * 次の質問へ進むハンドラー
   */
  const handleNext = () => {
    // ボタンクリック音
    setPlayButtonClickSound(true);
    setTimeout(() => setPlayButtonClickSound(false), 300);
    
    // 回答時間タイマーをリセット
    setAnswerTimeLeft(null);
    
    if (currentQuestion < quiz.questions.length - 1) {
      // 次の問題紹介の準備カウントダウン開始
      setCountdown(3);
      setIsPreparationPhase(true);
      setIsCountingDown(true);
      setPlayCountdownSound(true);
      setTimeout(() => setPlayCountdownSound(false), 500);
      
      // 次の質問に移動
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // 最後の問題の場合は結果表示へ直接遷移
      setShowResults(true);
      
      // 正答率に応じたエフェクトとサウンド
      const score = calculateScore();
      const percentage = Math.round((score / quiz.questions.length) * 100);
      
      if (percentage === 100) {
        // パーフェクトスコア: 特別演出
        setShowPerfectConfetti(true);
        setPlayPerfectSound(true);
        setTimeout(() => setPlayPerfectSound(false), 3000);
      } else if (percentage >= 50) {
        // 50%以上: 通常の演出
        setShowConfetti(true);
        setPlayCompleteSound(true);
        setTimeout(() => setPlayCompleteSound(false), 1000);
      } else {
        // 50%未満: 残念な演出
        setPlayLowScoreSound(true);
        setTimeout(() => setPlayLowScoreSound(false), 1000);
      }
    }
  };
  
  // クイズが変更された時に初期化処理を行う
  useEffect(() => {
    // クイズの基本状態をリセット
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
    
    // カウントダウン関連のリセット
    setCountdown(null);
    setIsCountingDown(false);
    setIsPreparationPhase(false);
    setAnswerTimeLeft(null);
    
    // クイズ選択直後に準備カウントダウンを開始
    setCountdown(3);
    setIsPreparationPhase(true);
    setIsCountingDown(true);
    setPlayCountdownSound(true);
    setTimeout(() => setPlayCountdownSound(false), 500);
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
        
        // 回答時間タイマーを開始
        setAnswerTimeLeft(5); // 5秒間の回答時間を設定
      } else {
        // 準備フェーズではない場合は通常のタイマー切れ
        setIsCountingDown(false);
        setCountdown(null);
      }
    }
  }, [countdown, isCountingDown, isPreparationPhase, currentQuestion]);
  
  // 回答時間制限のタイマー処理
  useEffect(() => {
    if (answerTimeLeft === null) return;
    
    if (answerTimeLeft > 0) {
      // 回答時間カウントダウン進行中
      const timer = setTimeout(() => {
        setAnswerTimeLeft(answerTimeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // 回答時間切れ
      // 強制的に次の問題に進む
      if (currentQuestion < quiz.questions.length - 1) {
        // 次の問題に進む
        setAnswerTimeLeft(null);
        handleNext();
      } else {
        // 最後の問題だった場合は結果表示に進む
        setAnswerTimeLeft(null);
        setShowResults(true);
        
        // 正答率に応じたエフェクトとサウンド
        const score = calculateScore();
        const percentage = Math.round((score / quiz.questions.length) * 100);
        
        if (percentage === 100) {
          // パーフェクトスコア: 特別演出
          setShowPerfectConfetti(true);
          setPlayPerfectSound(true);
          setTimeout(() => setPlayPerfectSound(false), 3000);
        } else if (percentage >= 50) {
          // 50%以上: 通常の演出
          setShowConfetti(true);
          setPlayCompleteSound(true);
          setTimeout(() => setPlayCompleteSound(false), 1000);
        } else {
          // 50%未満: 残念な演出
          setPlayLowScoreSound(true);
          setTimeout(() => setPlayLowScoreSound(false), 1000);
        }
      }
    }
  }, [answerTimeLeft, currentQuestion, quiz.questions.length]);
  
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
      setPlayButtonClickSound(true);
      setTimeout(() => setPlayButtonClickSound(false), 300);
    }
  };
  
  /**
   * スコア計算関数
   * @returns {number} - 正解数
   */
  const calculateScore = () => {
    let score = 0;
    Object.entries(selectedAnswers).forEach(([questionIdx, answerId]) => {
      // 安全に質問オブジェクトを取得
      const questionIndex = parseInt(questionIdx);
      
      // 無効なインデックスや範囲外の値をチェック
      if (isNaN(questionIndex) || questionIndex < 0 || questionIndex >= quiz.questions.length) {
        console.warn(`無効な質問インデックス: ${questionIdx}`);
        return; // この繊軸をスキップ
      }
      
      const question = quiz.questions[questionIndex];
      
      // questionが正しく定義されているか、correctAnswerIdが存在するか確認
      if (question && question.correctAnswerId && answerId === question.correctAnswerId) {
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
    setPlayCountdownSound(true);
    setTimeout(() => setPlayCountdownSound(false), 500);
    
    // ボタンクリック音
    setPlayButtonClickSound(true);
    setTimeout(() => setPlayButtonClickSound(false), 300);
  };
  
  // クイズ結果画面に関するスタイルを追加
  const answerExplanationsStyle = `
    .answer-explanations-container {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  `;

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
        <SoundEffects
          playCorrect={playCorrectSound}
          playIncorrect={playIncorrectSound}
          playComplete={playCompleteSound}
          playPerfect={playPerfectSound}
          playLowScore={playLowScoreSound}
          playCountdown={playCountdownSound}
          playButtonClick={playButtonClickSound}
        />
        {percentage >= 50 && percentage < 100 && <Confetti active={showConfetti} />}
        {percentage === 100 && <PerfectConfetti active={showPerfectConfetti} />}
        
        <div className={resultClassName}>
          <h2>クイズ結果</h2>
          
          {percentage === 100 && <div className="perfect-badge">パーフェクト!!</div>}
          {percentage >= 80 && percentage < 100 && <div className="high-score-badge">素晴らしい!</div>}
          
          <div className="score-display gameshow">
            <div className="score">{score} / {quiz.questions.length}</div>
            <div className="percentage score-percentage">{percentage}%</div>
          </div>
          
          {scoreMessage}
        
          <div className="questions-review">
            {quiz.questions.map((q, idx) => {
              // データ整合性チェック - 必要なプロパティが存在するか確認
              if (!q || !q.id || !q.text || !q.answers || !Array.isArray(q.answers) || !q.correctAnswerId) {
                console.warn(`質問 ${idx} に必要なプロパティが不足しています`);
                return null; // 不完全な質問はスキップ
              }
              
              const userAnswerId = selectedAnswers[idx];
              const isCorrect = userAnswerId === q.correctAnswerId;
              
              // 選択肢データの安全な取得
              const userAnswer = userAnswerId ? q.answers.find(a => a.id === userAnswerId) : undefined;
              const correctAnswer = q.answers.find(a => a.id === q.correctAnswerId);
              
              // 正解の選択肢が見つからない場合のフォールバック
              if (!correctAnswer) {
                console.warn(`質問 ${idx} の正解選択肢(ID: ${q.correctAnswerId})が見つかりません`);
                return null;
              }
              
              // 各選択肢を取得
              const incorrectAnswers = q.answers.filter(a => a.id !== q.correctAnswerId);
              
              return (
                <div key={idx} className={`question-review ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="question-number">問題 {idx + 1}</div>
                  <div className="question-text">{q.text}</div>
                  
                  <div className="answer-explanations-container">
                    {/* 正解の選択肢の解説 */}
                    {correctAnswer && (
                      <ExpandableAnswerExplanation 
                        answer={correctAnswer}
                        isCorrect={true}
                        questionId={q.id}
                        defaultExplanation={q.explanation || "この正解に対する説明は利用できません"}
                        questionText={q.text}
                        correctOptionText={correctAnswer.text}
                        quizContext={quiz.title}
                      />
                    )}
                    
                    {/* ユーザーが選択した不正解選択肢（存在する場合）を先に表示 */}
                    {!isCorrect && userAnswerId && userAnswer && userAnswer.id !== correctAnswer.id && (
                      <ExpandableAnswerExplanation 
                        answer={userAnswer}
                        isCorrect={false}
                        questionId={q.id}
                        defaultExplanation={q.incorrectExplanations?.[userAnswer.id] || 
                          `この選択肢「${userAnswer.text}」は不正解です。正確な答えは「${correctAnswer?.text}」です。ただし、この選択肢が不正解である具体的な理由に関する詳細情報はまだ利用できません。`}
                        questionText={q.text}
                        correctOptionText={correctAnswer.text}
                        quizContext={quiz.title}
                      />
                    )}
                    
                    {/* その他の不正解選択肢 */}
                    {q.answers
                      .filter(a => a && a.id && a.id !== q.correctAnswerId && (!userAnswerId || a.id !== userAnswerId))
                      .map(answer => (
                        <ExpandableAnswerExplanation 
                          key={answer.id}
                          answer={answer}
                          isCorrect={false}
                          questionId={q.id}
                          defaultExplanation={q.incorrectExplanations?.[answer.id] || 
                            `この選択肢「${answer.text}」は不正解です。正確な答えは「${correctAnswer?.text}」です。ただし、この選択肢が不正解である具体的な理由に関する詳細情報はまだ利用できません。`}
                          questionText={q.text}
                          correctOptionText={correctAnswer.text}
                          quizContext={quiz.title}
                        />
                      ))
                    }
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex space-x-4 mt-4">
            <button className="btn-primary flex-1" onClick={restartQuiz}>
              もう一度挑戦する
            </button>
            
            <button 
              className="btn-accent flex-1"
              onClick={() => handleSaveQuiz(true)}
              disabled={isSaving}
            >
              {isSaving ? '保存中...' : 'クイズを保存'}
            </button>
          </div>
          
          {saveMessage && (
            <div className={`mt-3 p-2 text-center rounded ${saveMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {saveMessage.text}
            </div>
          )}
          
          {/* スタイルを適用 */}
          <style jsx>{answerExplanationsStyle}</style>
        </div>
      </>
    );
  }
  
  // 通常のクイズ表示モード
  return (
    <>
      <SoundEffects
        playCorrect={playCorrectSound}
        playIncorrect={playIncorrectSound}
        playComplete={playCompleteSound}
        playPerfect={playPerfectSound}
        playLowScore={playLowScoreSound}
        playCountdown={playCountdownSound}
        playButtonClick={playButtonClickSound}
      />
      <AnswerEffect isCorrect={lastAnswerCorrect} active={showAnswerEffect} />
      
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
        
        <div className="mt-4 flex justify-center">
          <button 
            className="btn-accent"
            onClick={() => handleSaveQuiz(true)}
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : 'クイズを保存'}
          </button>
        </div>
        
        {saveMessage && (
          <div className={`mt-3 p-2 text-center rounded ${saveMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {saveMessage.text}
          </div>
        )}
      </div>
    </>
  );
}