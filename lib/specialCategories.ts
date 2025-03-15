/**
 * 特殊カテゴリ定義
 * 単一語やシンプルなフレーズに特化した生成ロジックを提供
 */

// 特殊カテゴリとそれに対応するプロンプト拡張の定義
export const SPECIAL_CATEGORIES: Record<string, SpecialCategoryConfig> = {
  // なぞなぞカテゴリ
  'なぞなぞ': {
    detectionPatterns: [
      '謎々', 'なぞなぞ', 'riddle', 'riddles', '謎解き', 'なぞ'
    ],
    promptTemplate: `
あなたは創造的で面白いなぞなぞを生成するエキスパートです。ユーザーが「なぞなぞ」というキーワードで依頼しているため、
なぞなぞの「概念」についての問題ではなく、実際の「なぞなぞ問題」を{numQuestions}問作成してください。

各なぞなぞは、回答者が考えるのが楽しく、答えを聞いたときに「なるほど！」と思えるような、
ひねりや言葉遊びを含んだものにしてください。

回答の選択肢は、1つの正解と3つの魅力的な不正解を含む4つの選択肢を用意してください。
なぞなぞの難易度は「{difficulty}」レベルとします。

各なぞなぞの説明（explanation）部分では、言葉遊びや論理的な推論を解説し、
なぜその答えが正解なのかを明確に説明してください。
`,
    contentTransform: (_content: string) => '' // なぞなぞの場合、元のコンテンツは無視
  },
  
  // クイズカテゴリ（一般知識）
  'クイズ': {
    detectionPatterns: [
      'クイズ', 'quiz', 'quizzes', '問題', 'もんだい', 'テスト', '試験'
    ],
    promptTemplate: `
あなたは面白く教育的な一般知識クイズを生成するエキスパートです。ユーザーが「クイズ」というキーワードのみで依頼しているため、
具体的な教材なしで、バラエティに富んだ一般知識に関するクイズを{numQuestions}問作成してください。

歴史、科学、文化、スポーツ、言語、地理など様々な分野から、バランス良く問題を選んでください。
問題は「{difficulty}」レベルの難易度で、それぞれ4つの選択肢を持つようにしてください。

各問題の説明（explanation）では、正解に関する背景知識や補足情報も提供し、学習者が新しい知識を
得られるような内容にしてください。
`,
    contentTransform: (_content: string) => '' // 一般クイズの場合、元のコンテンツは無視
  },
  
  // 漢字クイズ
  '漢字': {
    detectionPatterns: [
      '漢字', 'kanji', '漢検', '国語'
    ],
    promptTemplate: `
あなたは教育的な漢字クイズを生成するエキスパートです。ユーザーが「漢字」というキーワードで依頼しているため、
漢字の読み方、書き方、意味などに関する問題を{numQuestions}問作成してください。

各問題は以下のような形式で、様々な角度から漢字の知識を問うものにしてください：
- 四字熟語の読み方や意味
- 常用漢字の読み方（音読み/訓読み）
- 同音異義語や類義語の使い分け
- 慣用句や熟語の中の漢字
- 部首や漢字の成り立ち

難易度は「{difficulty}」レベルとし、日本の漢字検定の基準を参考にしてください。
各問題には4つの選択肢を用意し、説明（explanation）部分では漢字の由来や関連知識も
教えてあげるとよいでしょう。
`,
    contentTransform: (_content: string) => '' // 漢字クイズの場合、元のコンテンツは無視
  },
  
  // プログラミングクイズ
  'プログラミング': {
    detectionPatterns: [
      'プログラミング', 'programming', 'コード', 'コーディング', 'coding', 'プログラム', 'プログラマー', 'programmer'
    ],
    promptTemplate: `
あなたはプログラミングに関する教育的なクイズを生成するエキスパートです。ユーザーが「プログラミング」というキーワードで
依頼しているため、プログラミング言語、アルゴリズム、データ構造、ソフトウェア開発の概念に関する問題を
{numQuestions}問作成してください。

問題の種類としては：
- 言語構文や機能についての問題
- コードの実行結果の予測
- アルゴリズムの計算量や効率性
- ソフトウェア設計パターン
- データベースやネットワークプログラミング
- Web開発やモバイル開発

難易度は「{difficulty}」レベルとしてください。初心者から中級者、上級者まで幅広いレベルに対応できるようにしてください。
各問題には4つの選択肢を用意し、説明（explanation）部分では概念の詳細や実践的な応用例なども
加えていただけると学習効果が高まります。
`,
    contentTransform: (_content: string) => '' // プログラミングクイズの場合、元のコンテンツは無視
  },
  
  // 英語クイズ
  '英語': {
    detectionPatterns: [
      '英語', 'English', '英会話', 'TOEIC', 'TOEFL', '単語', 'vocabulary'
    ],
    promptTemplate: `
あなたは教育的な英語学習クイズを生成するエキスパートです。ユーザーが「英語」というキーワードで依頼しているため、
英語の文法、語彙、イディオム、読解などに関する問題を{numQuestions}問作成してください。

問題の種類としては：
- 正しい文法や語法を選ぶ問題
- 適切な語彙や表現を選ぶ問題
- イディオムや慣用表現の意味を問う問題
- 英文の穴埋め問題
- 発音やアクセントに関する問題

難易度は「{difficulty}」レベルとしてください。初心者からビジネス英語までカバーできるレベル感にしてください。
各問題には4つの選択肢を用意し、説明（explanation）部分では文法規則や語源、類似表現などの
補足情報も加えていただけると学習効果が高まります。
`,
    contentTransform: (_content: string) => '' // 英語クイズの場合、元のコンテンツは無視
  }
};

// 特殊カテゴリ設定のインターフェース
export interface SpecialCategoryConfig {
  detectionPatterns: string[];          // 検出パターン
  promptTemplate: string;               // プロンプトテンプレート
  contentTransform: (content: string) => string; // コンテンツ変換関数
}

/**
 * 入力テキストが特殊カテゴリに一致するかを検出
 * @param input 入力テキスト
 * @returns 一致する特殊カテゴリか null
 */
export function detectSpecialCategory(input: string): string | null {
  // 入力テキストを整形（トリミングと小文字化）
  const normalizedInput = input.trim().toLowerCase();
  
  // 短いテキストのみをカテゴリ検出対象とする
  if (normalizedInput.length > 20 || normalizedInput.split(/\s+/).length > 3) {
    return null;
  }
  
  // すべてのカテゴリに対して検出パターンをチェック
  for (const [category, config] of Object.entries(SPECIAL_CATEGORIES)) {
    for (const pattern of config.detectionPatterns) {
      if (normalizedInput.includes(pattern.toLowerCase())) {
        return category;
      }
    }
  }
  
  return null;
}