/**
 * Web Audio APIを使った軽量サウンドエフェクト生成モジュール
 * 外部依存なしで動作し、様々なクイズSEを提供します
 */

// AudioContextのシングルトンインスタンス
let audioContext: AudioContext | null = null;

// AudioContextの初期化（ユーザーインタラクション後に呼び出す必要あり）
const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      
      audioContext = new AudioContextClass();
    }
    
    // 中断されていた場合は再開
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    return audioContext;
  } catch (e) {
    console.error('AudioContext initialization failed:', e);
    return null;
  }
};

/**
 * 一般的なビープ音を生成
 * @param type 波形タイプ
 * @param frequency 周波数 (Hz)
 * @param duration 長さ (秒)
 * @param volume 音量 (0-1)
 */
const playTone = (
  type: OscillatorType = 'sine',
  frequency: number = 440,
  duration: number = 0.2,
  volume: number = 0.5
): void => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume;
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error('Error playing tone:', e);
  }
};

/**
 * 正解音効果
 */
export const playCorrectSound = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    // 明るい上昇音
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(330, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.6, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
    
    // 少し遅れて和音を追加
    setTimeout(() => {
      if (!ctx) return;
      const oscillator2 = ctx.createOscillator();
      const gainNode2 = ctx.createGain();
      
      oscillator2.type = 'sine';
      oscillator2.frequency.setValueAtTime(660, ctx.currentTime);
      
      gainNode2.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(ctx.destination);
      
      oscillator2.start();
      oscillator2.stop(ctx.currentTime + 0.2);
    }, 50);
  } catch (e) {
    console.error('Error playing correct sound:', e);
  }
};

/**
 * 不正解音効果
 */
export const playIncorrectSound = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    // 落ち込む音
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.error('Error playing incorrect sound:', e);
  }
};

/**
 * クイズ完了音効果
 */
export const playCompleteSound = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    // 豪華な効果音シーケンス
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;
        
        gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.3);
      }, i * 100);
    });
  } catch (e) {
    console.error('Error playing complete sound:', e);
  }
};

/**
 * パーフェクトスコア達成音効果
 */
export const playPerfectSound = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    // 壮大なファンファーレ
    const fanfareNotes = [
      { freq: 440, duration: 0.15 },  // A4
      { freq: 440, duration: 0.15 },  // A4
      { freq: 659.25, duration: 0.3 }, // E5
      { freq: 440, duration: 0.3 },   // A4
      { freq: 523.25, duration: 0.3 }, // C5
      { freq: 659.25, duration: 0.5 }  // E5
    ];
    
    let timeOffset = 0;
    
    fanfareNotes.forEach(note => {
      setTimeout(() => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'triangle';
        oscillator.frequency.value = note.freq;
        
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + note.duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start();
        oscillator.stop(ctx.currentTime + note.duration);
      }, timeOffset * 1000);
      
      timeOffset += note.duration;
    });
  } catch (e) {
    console.error('Error playing perfect sound:', e);
  }
};

/**
 * 低スコア時の残念な効果音
 */
export const playLowScoreSound = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    // 残念な下降音
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(330, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.error('Error playing low score sound:', e);
  }
};

/**
 * カウントダウン効果音
 */
export const playCountdownSound = (): void => {
  playTone('sine', 880, 0.1, 0.3);
};

/**
 * ボタンクリック効果音
 */
export const playButtonClickSound = (): void => {
  playTone('sine', 660, 0.08, 0.2);
};

/**
 * オーディオコンテキストを初期化
 * ユーザージェスチャーハンドラー内で呼び出すことで、
 * ブラウザの自動再生ポリシーに対応
 */
export const initAudio = (): void => {
  getAudioContext();
};