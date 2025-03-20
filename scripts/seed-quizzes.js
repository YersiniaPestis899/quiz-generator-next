// CommonJS形式モジュールインポート
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

// Supabase接続初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// サンプルクイズデータ
const sampleQuizzes = [
  {
    id: uuidv4(),
    title: 'プログラミング基礎知識',
    difficulty: 'easy',
    created_at: new Date().toISOString(),
    questions: [
      {
        id: uuidv4(),
        text: 'JavaScriptで変数を宣言するための正しいキーワードはどれですか？',
        answers: [
          { id: uuidv4(), text: 'var' },
          { id: uuidv4(), text: 'int' },
          { id: uuidv4(), text: 'string' },
          { id: uuidv4(), text: 'declare' }
        ],
        correctAnswerId: '答え1のID', // 実行前に修正必要
        explanation: 'JavaScriptでは変数宣言には主にvar, let, constキーワードが使用されます。varは古い宣言方法で、現在はletとconstが推奨されています。'
      },
      {
        id: uuidv4(),
        text: 'HTMLで段落を表すタグはどれですか？',
        answers: [
          { id: uuidv4(), text: '<paragraph>' },
          { id: uuidv4(), text: '<p>' },
          { id: uuidv4(), text: '<para>' },
          { id: uuidv4(), text: '<text>' }
        ],
        correctAnswerId: '答え2のID', // 実行前に修正必要
        explanation: 'HTMLでは段落を表すために<p>タグを使用します。これは「paragraph」の略です。'
      },
      {
        id: uuidv4(),
        text: 'CSSでテキストの色を変更するプロパティはどれですか？',
        answers: [
          { id: uuidv4(), text: 'text-color' },
          { id: uuidv4(), text: 'font-color' },
          { id: uuidv4(), text: 'color' },
          { id: uuidv4(), text: 'text-style' }
        ],
        correctAnswerId: '答え3のID', // 実行前に修正必要
        explanation: 'CSSでテキストの色を変更するには「color」プロパティを使用します。例：p { color: red; }'
      }
    ]
  },
  {
    id: uuidv4(),
    title: 'AI・機械学習入門',
    difficulty: 'medium',
    created_at: new Date().toISOString(),
    questions: [
      {
        id: uuidv4(),
        text: '教師あり学習と教師なし学習の主な違いは何ですか？',
        answers: [
          { id: uuidv4(), text: '計算速度の違い' },
          { id: uuidv4(), text: '使用するプログラミング言語の違い' },
          { id: uuidv4(), text: 'ラベル付きデータを使用するかどうかの違い' },
          { id: uuidv4(), text: 'データセットのサイズ制限の違い' }
        ],
        correctAnswerId: '答え3のID', // 実行前に修正必要
        explanation: '教師あり学習はラベル付きデータを使用し、入力と期待される出力を学習します。教師なし学習はラベルなしデータからパターンを見つけ出します。'
      },
      {
        id: uuidv4(),
        text: '自然言語処理（NLP）の主な応用例はどれですか？',
        answers: [
          { id: uuidv4(), text: '画像認識' },
          { id: uuidv4(), text: '自動運転' },
          { id: uuidv4(), text: '機械翻訳' },
          { id: uuidv4(), text: '株価予測' }
        ],
        correctAnswerId: '答え3のID', // 実行前に修正必要
        explanation: '自然言語処理（NLP）は機械翻訳、感情分析、文書要約、チャットボットなど、テキストや音声を処理する技術に応用されます。'
      },
      {
        id: uuidv4(),
        text: 'ディープラーニングとは何ですか？',
        answers: [
          { id: uuidv4(), text: '大量のデータを高速に処理する技術' },
          { id: uuidv4(), text: '多層ニューラルネットワークを使用する機械学習の一種' },
          { id: uuidv4(), text: 'データベースを最適化するアルゴリズム' },
          { id: uuidv4(), text: 'コンピューターのメモリ管理手法' }
        ],
        correctAnswerId: '答え2のID', // 実行前に修正必要
        explanation: 'ディープラーニングは複数の層を持つニューラルネットワーク（多層ニューラルネットワーク）を使用して、データから複雑なパターンを学習する機械学習の一分野です。'
      }
    ]
  }
];

// クイズIDと正解IDを修正する関数
function fixQuizData(quizzes) {
  return quizzes.map(quiz => {
    const fixedQuestions = quiz.questions.map(question => {
      // 2番目の選択肢を正解とする（インデックス1、つまり配列の2番目の要素）
      const correctAnswerId = question.answers[1].id;
      return {
        ...question,
        correctAnswerId
      };
    });
    
    return {
      ...quiz,
      questions: fixedQuestions
    };
  });
}

// Supabaseにデータをシードする関数
async function seedDatabase() {
  try {
    console.log('サンプルクイズデータをSupabaseにシードしています...');
    
    // クイズデータを修正
    const fixedQuizzes = fixQuizData(sampleQuizzes);
    
    // 既存データの確認
    const { data: existingQuizzes, error: selectError } = await supabase
      .from('quizzes')
      .select('title');
      
    if (selectError) {
      throw new Error(`既存データ確認エラー: ${selectError.message}`);
    }
    
    // すでにデータが存在する場合はスキップ
    if (existingQuizzes && existingQuizzes.length > 0) {
      console.log(`すでに${existingQuizzes.length}件のクイズデータが存在します。シードをスキップします。`);
      return;
    }
    
    // データ挿入
    const { data, error } = await supabase
      .from('quizzes')
      .insert(fixedQuizzes);
      
    if (error) {
      throw new Error(`データ挿入エラー: ${error.message}`);
    }
    
    console.log(`成功: ${fixedQuizzes.length}件のクイズデータをシードしました`);
  } catch (error) {
    console.error('シード処理エラー:', error);
  }
}

// 実行
seedDatabase();
