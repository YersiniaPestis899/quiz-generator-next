/**
 * Web Audio APIを使用したプログラマティックなサウンド生成システム
 * 外部サウンドファイルに依存せずブラウザ内で数学的に音を生成
 */

// AudioContextのシングルトンインスタンス
let audioContext: AudioContext | null = null;
let audioInitialized = false;

/**
 * オーディオコンテキストを初期化
 * ユーザージェスチャーハンドラー内で呼び出すことで、
 * ブラウザの自動再生ポリシーに対応
 */
export function initAudio(): void {
  try {
    if (typeof window === 'undefined') return;
    
    // Safari互換性のためのフォールバック
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('AudioContext is not supported in this browser');
      return;
    }
    
    if (!audioContext) {
      audioContext = new AudioContextClass();
      console.log('AudioContext created successfully');
    }
    
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log('AudioContext resumed successfully');
        audioInitialized = true;
      }).catch(err => {
        console.error('Failed to resume AudioContext:', err);
      });
    } else {
      audioInitialized = true;
      console.log('AudioContext is already running');
    }
  } catch (e) {
    console.error('Failed to initialize audio:', e);
  }
}

/**
 * AudioContextのシングルトンインスタンスを取得
 */
function getAudioContext(): AudioContext | null {
  if (!audioContext && typeof window !== 'undefined') {
    try {
      // Safari互換性のためのフォールバック
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      
      audioContext = new AudioContextClass();
      
      // 中断状態の場合は再開を試みる
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(err => {
          console.warn('Failed to resume AudioContext:', err);
        });
      }
    } catch (e) {
      console.error('Failed to create AudioContext:', e);
      return null;
    }
  }
  return audioContext;
}

/**
 * ビープ音生成の基本パラメータインターフェース
 */
interface SoundParams {
  frequency: number | number[];  // 周波数 (Hz)
  type: OscillatorType;         // 波形タイプ
  duration: number;             // 持続時間 (秒)
  gain: number;                 // 音量 (0-1)
  attack: number;               // アタック時間
  decay: number;                // ディケイ時間
  sustain: number;              // サステインレベル
  release: number;              // リリース時間
}

/**
 * 基本的なサウンド生成関数
 * @param params 音響パラメータ
 */
function playSound(params: SoundParams): void {
  // オーディオ未初期化または非対応環境の場合は早期リターン
  if (!audioInitialized) {
    console.warn('Audio not initialized. Call initAudio() after user interaction.');
    return;
  }
  
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      console.warn('AudioContext not available');
      return;
    }
    
    // ユーザーインタラクション要件対応
    if (ctx.state === 'suspended') {
      ctx.resume().catch(err => {
        console.warn('Failed to resume AudioContext:', err);
        return; // 再開失敗時は処理中断
      });
    }
    
    // ゲインノード（音量制御）
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(ctx.destination);
    
    // 周波数配列の場合は複数のオシレータを使用
    const frequencies = Array.isArray(params.frequency) ? params.frequency : [params.frequency];
    
    frequencies.forEach(freq => {
      // オシレータ（音源）
      const oscillator = ctx.createOscillator();
      oscillator.type = params.type;
      oscillator.frequency.value = freq;
      oscillator.connect(gainNode);
      
      // 現在の時間を取得
      const now = ctx.currentTime;
      
      // ADSR エンベロープ実装（音の輪郭を形成）
      // Attack: 0 → 最大値
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(params.gain, now + params.attack);
      
      // Decay: 最大値 → サステインレベル
      gainNode.gain.linearRampToValueAtTime(
        params.gain * params.sustain, 
        now + params.attack + params.decay
      );
      
      // Release: サステインレベル → 0
      gainNode.gain.linearRampToValueAtTime(
        0, 
        now + params.attack + params.decay + params.duration + params.release
      );
      
      // オシレータ開始と停止
      oscillator.start(now);
      oscillator.stop(now + params.attack + params.decay + params.duration + params.release);
    });
  } catch (err) {
    console.error('サウンド生成エラー:', err);
  }
}

/**
 * 正解音生成
 * 明るく上昇する音色
 */
export function playCorrectSound(): void {
  playSound({
    frequency: [523.25, 659.25, 783.99], // C5, E5, G5 (メジャーコード)
    type: 'sine',
    duration: 0.1,
    gain: 0.5,
    attack: 0.01,
    decay: 0.1,
    sustain: 0.6,
    release: 0.2
  });
}

/**
 * 不正解音生成
 * 下降する短い音色
 */
export function playIncorrectSound(): void {
  playSound({
    frequency: [349.23, 277.18], // F4 → C#4 下降
    type: 'sawtooth',
    duration: 0.1,
    gain: 0.4,
    attack: 0.01,
    decay: 0.1,
    sustain: 0.3,
    release: 0.1
  });
}

/**
 * 完了音生成（通常の成功: 50%以上）
 * 華やかで祝福的な音色
 */
export function playCompleteSound(): void {
  // 最初の和音
  playSound({
    frequency: [523.25, 659.25, 783.99], // C5, E5, G5
    type: 'sine',
    duration: 0.2,
    gain: 0.4,
    attack: 0.01,
    decay: 0.1,
    sustain: 0.8,
    release: 0.3
  });
  
  // 第2の和音（少し遅延）
  setTimeout(() => {
    playSound({
      frequency: [659.25, 783.99, 1046.50], // E5, G5, C6（1オクターブ上）
      type: 'sine',
      duration: 0.3,
      gain: 0.5,
      attack: 0.01,
      decay: 0.1,
      sustain: 0.9,
      release: 0.5
    });
  }, 200);
}

/**
 * パーフェクトスコア音生成（100%）
 * ファンファーレ的な豪華な音色
 */
export function playPerfectSound(): void {
  // 第1和音
  playSound({
    frequency: [523.25, 659.25, 783.99], // C5, E5, G5
    type: 'sine',
    duration: 0.2,
    gain: 0.4,
    attack: 0.01,
    decay: 0.1,
    sustain: 0.8,
    release: 0.3
  });
  
  // 第2和音（上昇）
  setTimeout(() => {
    playSound({
      frequency: [587.33, 739.99, 880.00], // D5, F#5, A5
      type: 'sine',
      duration: 0.2,
      gain: 0.5,
      attack: 0.01,
      decay: 0.1,
      sustain: 0.8,
      release: 0.3
    });
  }, 200);
  
  // 第3和音（クライマックス）
  setTimeout(() => {
    playSound({
      frequency: [659.25, 783.99, 1046.50, 1318.51], // E5, G5, C6, E6
      type: 'sine',
      duration: 0.5,
      gain: 0.6,
      attack: 0.01,
      decay: 0.2,
      sustain: 0.9,
      release: 0.7
    });
  }, 400);
  
  // 煌めき効果（高音）
  setTimeout(() => {
    playSound({
      frequency: [1568.0, 2093.0], // G6, C7
      type: 'triangle',
      duration: 0.3,
      gain: 0.3,
      attack: 0.05,
      decay: 0.1,
      sustain: 0.6,
      release: 0.5
    });
  }, 700);
}

/**
 * 低スコア音生成（50%未満）
 * 残念な雰囲気の下降音
 */
export function playLowScoreSound(): void {
  // 下降する短いフレーズ
  playSound({
    frequency: [392.0, 349.23, 329.63], // G4, F4, E4 (下降)
    type: 'triangle',
    duration: 0.2,
    gain: 0.4,
    attack: 0.01,
    decay: 0.2,
    sustain: 0.5,
    release: 0.3
  });
  
  // 残念感を演出する低い音
  setTimeout(() => {
    playSound({
      frequency: [261.63, 196.0], // C4, G3
      type: 'sine',
      duration: 0.4,
      gain: 0.4,
      attack: 0.02,
      decay: 0.3,
      sustain: 0.4,
      release: 0.5
    });
  }, 300);
}

/**
 * カウントダウン音生成
 * 短く明確なビープ音
 */
export function playCountdownSound(): void {
  playSound({
    frequency: 440, // A4
    type: 'square',
    duration: 0.05,
    gain: 0.3,
    attack: 0.01,
    decay: 0.05,
    sustain: 0.5,
    release: 0.05
  });
}

/**
 * ボタンクリック音生成
 * 軽く短いクリック音
 */
export function playButtonClickSound(): void {
  playSound({
    frequency: 880, // A5
    type: 'sine',
    duration: 0.01,
    gain: 0.2,
    attack: 0.001,
    decay: 0.02,
    sustain: 0.1,
    release: 0.01
  });
}