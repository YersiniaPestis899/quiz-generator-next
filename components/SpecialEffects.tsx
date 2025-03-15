'use client';

import React, { useEffect, useState, useCallback, memo } from 'react';

interface ConfettiProps {
  active: boolean;
}

// 通常の紙吹雪（正答率50%以上）
function ConfettiComponent({ active }: ConfettiProps) {
  const [confetti, setConfetti] = useState<JSX.Element[]>([]);
  
  // useCallbackでメソッドをメモ化
  const createConfetti = useCallback(() => {
    if (!active) return;
    
    const colors = ['#FFDE59', '#FF9232', '#6C22BD', '#8D44E0'];
    const pieces: JSX.Element[] = [];
    const confettiCount = 50; // 最適化のため数を減らす
    
    for (let i = 0; i < confettiCount; i++) {
      const style = {
        left: `${Math.random() * 100}%`,
        top: `-10px`,
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
        width: `${Math.random() * 8 + 5}px`,
        height: `${Math.random() * 8 + 5}px`,
        borderRadius: Math.random() > 0.5 ? '50%' : '0',
        animationDuration: `${Math.random() * 2 + 3}s`,
        animationDelay: `${Math.random() * 1.5}s`
      };
      
      pieces.push(<div key={i} className="confetti" style={style} />);
    }
    
    setConfetti(pieces);
    
    // タイマーをセット
    const timerId = setTimeout(() => {
      setConfetti([]);
    }, 5000);
    
    // クリーンアップ関数を返す
    return () => clearTimeout(timerId);
  }, [active]);
  
  useEffect(() => {
    if (active) {
      const cleanup = createConfetti();
      // クリーンアップ関数を実行
      return cleanup;
    }
  }, [active, createConfetti]);
  
  // 紙吹雪がない場合はDOMを最小限に
  if (confetti.length === 0) return null;
  
  return (
    <div className="confetti-container">
      {confetti}
    </div>
  );
}

// パーフェクトスコア用の豪華な紙吹雪（100%用）
function PerfectConfettiComponent({ active }: ConfettiProps) {
  const [confetti, setConfetti] = useState<JSX.Element[]>([]);
  
  const createPerfectConfetti = useCallback(() => {
    if (!active) return;
    
    const colors = ['#FFD700', '#FFDF00', '#FFFF00', '#FFDE59', '#FF9232', '#FFA500'];
    const pieces: JSX.Element[] = [];
    const confettiCount = 100; // 通常より多め
    
    for (let i = 0; i < confettiCount; i++) {
      // ゴールドを基調とした紙吹雪
      const style = {
        left: `${Math.random() * 100}%`,
        top: `-10px`,
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
        width: `${Math.random() * 12 + 5}px`, // より大きめ
        height: `${Math.random() * 12 + 5}px`,
        borderRadius: Math.random() > 0.3 ? '50%' : '0', // 円形が多め
        animationDuration: `${Math.random() * 3 + 3}s`,
        animationDelay: `${Math.random() * 2}s`,
        opacity: Math.random() * 0.5 + 0.5, // よりキラキラ感を出す
        boxShadow: '0 0 5px gold' // 輝き効果
      };
      
      pieces.push(<div key={i} className="perfect-confetti" style={style} />);
    }
    
    // スターエフェクトも追加
    for (let i = 0; i < 20; i++) {
      const size = Math.random() * 20 + 10;
      const style = {
        left: `${Math.random() * 100}%`,
        top: `-20px`,
        width: `${size}px`,
        height: `${size}px`,
        background: 'gold',
        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
        animationDuration: `${Math.random() * 4 + 4}s`,
        animationDelay: `${Math.random() * 3}s`,
        boxShadow: '0 0 10px gold, 0 0 20px yellow'
      };
      
      pieces.push(<div key={`star-${i}`} className="perfect-confetti star" style={style} />);
    }
    
    setConfetti(pieces);
    
    // タイマーをセット
    const timerId = setTimeout(() => {
      setConfetti([]);
    }, 8000); // 通常より長く表示
    
    return () => clearTimeout(timerId);
  }, [active]);
  
  useEffect(() => {
    if (active) {
      const cleanup = createPerfectConfetti();
      return cleanup;
    }
  }, [active, createPerfectConfetti]);
  
  if (confetti.length === 0) return null;
  
  return (
    <div className="perfect-confetti-container">
      {confetti}
    </div>
  );
}

interface AnswerEffectProps {
  isCorrect: boolean;
  active: boolean;
}

function AnswerEffectComponent({ isCorrect, active }: AnswerEffectProps) {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    if (!active) return;
    
    setShow(true);
    
    // タイマー参照を保持
    const timer = setTimeout(() => {
      setShow(false);
    }, 1000);
    
    // クリーンアップ関数
    return () => clearTimeout(timer);
  }, [active]);
  
  // 表示しない場合はnullを返して描画コストを削減
  if (!show) return null;
  
  return (
    <div 
      className={isCorrect ? "correct-answer-effect" : "incorrect-answer-effect"}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 50,
        backgroundColor: isCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
        animation: 'fadeEffect 0.8s ease-out'
      }}
    />
  );
}

// React.memoでコンポーネントをメモ化
const Confetti = memo(ConfettiComponent);
const PerfectConfetti = memo(PerfectConfettiComponent);
const AnswerEffect = memo(AnswerEffectComponent);

export { Confetti, PerfectConfetti, AnswerEffect };