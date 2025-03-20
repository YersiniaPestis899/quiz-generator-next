import { useState } from 'react';
import { Answer } from '@/lib/types';

interface ExpandableAnswerExplanationProps {
  answer: Answer;
  isCorrect: boolean;
  questionId: string;
  defaultExplanation?: string;
  questionText?: string;        // 追加: 問題文
  correctOptionText?: string;   // 追加: 正解の選択肢テキスト
  quizContext?: string;        // 追加: クイズコンテキスト
}

/**
 * 各選択肢の展開可能な解説コンポーネント
 */
const ExpandableAnswerExplanation: React.FC<ExpandableAnswerExplanationProps> = ({ 
  answer, 
  isCorrect, 
  questionId,
  defaultExplanation = "この選択肢についての詳細解説はありません。",
  questionText,
  correctOptionText,
  quizContext
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [explanation, setExplanation] = useState<string>(defaultExplanation);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [hasGeneratedBetterExplanation, setHasGeneratedBetterExplanation] = useState(false);
  
  // クラス名を動的に構成
  const containerClassName = `answer-explanation-container ${isCorrect ? 'correct' : 'incorrect'} ${isExpanded ? 'expanded' : 'collapsed'}`;
  
  // シンプルすぎる解説かチェック
  const isSimpleExplanation = (text: string): boolean => {
    const indicators = [
      "不正解です",
      "正解は",
      "回答は",
      "利用できません"
    ];
    
    // テキストにインジケーターが含まれており、短い場合
    return indicators.some(indicator => text.includes(indicator)) && text.length < 100;
  }
  
  // 展開時に自動的により詳細な解説を生成する条件
  const shouldGenerateExplanation = !isCorrect && !hasGeneratedBetterExplanation && 
    questionText && correctOptionText && isSimpleExplanation(explanation);
  
  // 選択肢の詳細な解説を生成
  const generateDetailedExplanation = async () => {
    // 必要な情報が不足している場合は処理しない
    if (!questionText || !correctOptionText || isCorrect) return;
    
    try {
      setIsGeneratingExplanation(true);
      
      // より詳細な解説を生成するためのAPIリクエスト
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionText,
          incorrectOptionText: answer.text,
          correctOptionText,
          questionId,
          incorrectOptionId: answer.id,
          quizContext
        }),
      });
      
      if (!response.ok) {
        throw new Error('解説の生成に失敗しました');
      }
      
      const data = await response.json();
      
      // 生成された説明を設定
      if (data.explanation) {
        setExplanation(data.explanation);
        setHasGeneratedBetterExplanation(true);
      }
    } catch (error) {
      console.error('説明生成エラー:', error);
    } finally {
      setIsGeneratingExplanation(false);
    }
  };
  
  // 展開時に自動的に詳細な解説を生成
  const handleExpand = async () => {
    // 現在の状態を反転
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    
    // 展開に変更され、評価が必要な場合に解説を生成
    if (newExpandedState && shouldGenerateExplanation) {
      await generateDetailedExplanation();
    }
  };
  
  return (
    <div className={containerClassName}>
      <div 
        className="answer-label"
        onClick={handleExpand}
      >
        <div className="answer-text">
          <span className={`answer-badge ${isCorrect ? 'correct' : 'incorrect'}`}>
            {isCorrect ? '✓' : '✗'}
          </span>
          {answer.text}
        </div>
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
      </div>
      
      {isExpanded && (
        <div className="explanation-content">
          <div className="explanation-title">
            {isCorrect ? '正解の理由:' : 'なぜ間違いなのか:'}
          </div>
          
          {isGeneratingExplanation ? (
            <div className="explanation-loading">
              より詳細な解説を生成しています...
            </div>
          ) : (
            <div className="explanation-text">
              {explanation}
              
              {/* 不正解選択肢の特別説明生成ボタン */}
              {!isCorrect && !isGeneratingExplanation && !hasGeneratedBetterExplanation && 
               questionText && correctOptionText && (
                <button 
                  className="generate-explanation-btn"
                  onClick={(e) => {
                    e.stopPropagation(); // クリックイベントの伝播を停止
                    generateDetailedExplanation();
                  }}
                >
                  より詳細な解説を生成
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
      <style jsx>{`
        .answer-explanation-container {
          margin-bottom: 0.5rem;
          border-radius: 0.5rem;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .answer-explanation-container.correct {
          background-color: rgba(34, 197, 94, 0.1);
          border-left: 3px solid #22c55e;
        }
        
        .answer-explanation-container.incorrect {
          background-color: rgba(239, 68, 68, 0.1);
          border-left: 3px solid #ef4444;
        }
        
        .answer-explanation-container.expanded {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        
        .answer-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s ease;
        }
        
        .answer-label:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }
        
        .answer-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .answer-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: bold;
        }
        
        .answer-badge.correct {
          background-color: #22c55e;
          color: white;
        }
        
        .answer-badge.incorrect {
          background-color: #ef4444;
          color: white;
        }
        
        .expand-icon {
          font-size: 0.75rem;
          opacity: 0.7;
          transition: transform 0.2s ease;
        }
        
        .expanded .expand-icon {
          transform: rotate(0deg);
        }
        
        .collapsed .expand-icon {
          transform: rotate(-90deg);
        }
        
        .explanation-content {
          padding: 0.75rem 1rem 1rem;
          animation: fadeIn 0.3s ease-in-out;
        }
        
        .explanation-title {
          font-weight: 600;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          color: var(--text-accent);
        }
        
        .explanation-text {
          font-size: 0.9rem;
          line-height: 1.5;
          color: var(--text-secondary);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ExpandableAnswerExplanation;