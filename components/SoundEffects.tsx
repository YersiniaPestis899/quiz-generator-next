'use client';

import { useEffect, useRef } from 'react';
import { 
  playCorrectSound, 
  playIncorrectSound, 
  playCompleteSound, 
  playPerfectSound, 
  playLowScoreSound, 
  playCountdownSound, 
  playButtonClickSound,
  initAudio
} from '@/lib/soundGenerator';

interface SoundEffectsProps {
  playCorrect?: boolean;
  playIncorrect?: boolean;
  playComplete?: boolean;
  playPerfect?: boolean;
  playLowScore?: boolean;
  playCountdown?: boolean;
  playButtonClick?: boolean;
}

/**
 * サウンドエフェクトコンポーネント
 * プロパティで指定されたタイミングでサウンドを再生
 */
export default function SoundEffects({
  playCorrect = false,
  playIncorrect = false,
  playComplete = false,
  playPerfect = false,
  playLowScore = false,
  playCountdown = false,
  playButtonClick = false
}: SoundEffectsProps) {
  const audioInitialized = useRef(false);
  
  // 最初のユーザー操作でオーディオを初期化
  useEffect(() => {
    if (!audioInitialized.current) {
      const initializeAudio = () => {
        initAudio();
        document.removeEventListener('click', initializeAudio);
        document.removeEventListener('keydown', initializeAudio);
        audioInitialized.current = true;
      };
      
      document.addEventListener('click', initializeAudio);
      document.addEventListener('keydown', initializeAudio);
      
      return () => {
        document.removeEventListener('click', initializeAudio);
        document.removeEventListener('keydown', initializeAudio);
      };
    }
  }, []);
  
  // 正解音
  useEffect(() => {
    if (playCorrect && audioInitialized.current) {
      playCorrectSound();
    }
  }, [playCorrect]);
  
  // 不正解音
  useEffect(() => {
    if (playIncorrect && audioInitialized.current) {
      playIncorrectSound();
    }
  }, [playIncorrect]);
  
  // 完了音
  useEffect(() => {
    if (playComplete && audioInitialized.current) {
      playCompleteSound();
    }
  }, [playComplete]);
  
  // パーフェクト音
  useEffect(() => {
    if (playPerfect && audioInitialized.current) {
      playPerfectSound();
    }
  }, [playPerfect]);
  
  // 低スコア音
  useEffect(() => {
    if (playLowScore && audioInitialized.current) {
      playLowScoreSound();
    }
  }, [playLowScore]);
  
  // カウントダウン音
  useEffect(() => {
    if (playCountdown && audioInitialized.current) {
      playCountdownSound();
    }
  }, [playCountdown]);
  
  // ボタンクリック音
  useEffect(() => {
    if (playButtonClick && audioInitialized.current) {
      playButtonClickSound();
    }
  }, [playButtonClick]);
  
  // 描画を行わないコンポーネント
  return null;
}