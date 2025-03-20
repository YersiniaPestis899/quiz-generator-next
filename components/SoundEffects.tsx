'use client';

import { useEffect, useRef } from 'react';
import { 
  playCorrectSound, 
  playIncorrectSound, 
  playCompleteSound, 
  playCountdownSound, 
  playButtonClickSound,
  playPerfectSound,
  playLowScoreSound,
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
 * ゲーム内イベントに対応する音響効果を管理
 * 実装アプローチ: 外部ファイル不要の数学的音響合成
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
        console.log('Initializing audio from user interaction');
        initAudio();
        document.removeEventListener('click', initializeAudio);
        document.removeEventListener('keydown', initializeAudio);
        document.removeEventListener('touchstart', initializeAudio);
        audioInitialized.current = true;
      };
      
      document.addEventListener('click', initializeAudio);
      document.addEventListener('keydown', initializeAudio);
      document.addEventListener('touchstart', initializeAudio);
      
      return () => {
        document.removeEventListener('click', initializeAudio);
        document.removeEventListener('keydown', initializeAudio);
        document.removeEventListener('touchstart', initializeAudio);
      };
    }
  }, []);
  
  // 正解音再生
  useEffect(() => {
    if (playCorrect && audioInitialized.current) {
      playCorrectSound();
    }
  }, [playCorrect]);
  
  // 不正解音再生
  useEffect(() => {
    if (playIncorrect && audioInitialized.current) {
      playIncorrectSound();
    }
  }, [playIncorrect]);
  
  // 完了音再生（通常スコア）
  useEffect(() => {
    if (playComplete && audioInitialized.current) {
      playCompleteSound();
    }
  }, [playComplete]);
  
  // パーフェクトスコア音再生（100%）
  useEffect(() => {
    if (playPerfect && audioInitialized.current) {
      playPerfectSound();
    }
  }, [playPerfect]);
  
  // 低スコア音再生（50%未満）
  useEffect(() => {
    if (playLowScore && audioInitialized.current) {
      playLowScoreSound();
    }
  }, [playLowScore]);
  
  // カウントダウン音再生
  useEffect(() => {
    if (playCountdown && audioInitialized.current) {
      playCountdownSound();
    }
  }, [playCountdown]);
  
  // ボタンクリック音再生
  useEffect(() => {
    if (playButtonClick && audioInitialized.current) {
      playButtonClickSound();
    }
  }, [playButtonClick]);
  
  // 表示を行わないコンポーネント
  return null;
}