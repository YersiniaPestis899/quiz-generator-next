import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { QuizGenerationInput } from './types';
import { detectSpecialCategory, SPECIAL_CATEGORIES } from './specialCategories';

// BedrockクライアントをシングルトンパターンでNode.js環境で初期化
let bedrockClient: BedrockRuntimeClient | null = null;

// レート制限用の変数
let lastRequestTimestamp = 0;
const RATE_LIMIT_WINDOW = 65000; // 65秒間隔を設定（1分 + 5秒バッファ）

async function getBedrockClient() {
  if (!bedrockClient && typeof process !== 'undefined') {
    // 基本設定オブジェクト
    const clientConfig: any = { 
      region: process.env.AWS_REGION || 'us-west-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    };
    
    try {
      // NodeHttpHandlerをNode.js環境でのみ動的にインポート
      if (typeof window === 'undefined') { // ブラウザではなくNode.js環境
        // Serverless Functions環境用のNodeHttpHandler設定
        console.log('Serverless Functions環境向けタイムアウト設定を適用します');
        const { NodeHttpHandler } = await import('@smithy/node-http-handler');
        clientConfig.requestHandler = new NodeHttpHandler({
          connectionTimeout: 50000, // 接続確立のタイムアウト: 50秒
          socketTimeout: 50000,     // データ送受信のタイムアウト: 50秒
        });
        console.log('カスタムタイムアウト設定が適用されました: 50秒');
      }
    } catch (error) {
      console.warn('NodeHttpHandlerのインポートに失敗しました。デフォルトのタイムアウト設定を使用します:', error);
    }
    
    // クライアント初期化
    bedrockClient = new BedrockRuntimeClient(clientConfig);
  }
  return bedrockClient;
}

/**
 * Claude 3.5 Sonnetを使用してクイズデータを生成
 * @param {QuizGenerationInput} input - クイズ生成入力パラメータ
 * @returns {Object} - 生成されたクイズデータ
 */
export async function generateQuizWithClaude(input: QuizGenerationInput) {
  const { content, numQuestions, difficulty } = input;
  
  // レート制限の確認と待機処理
  const currentTime = Date.now();
  const timeElapsed = currentTime - lastRequestTimestamp;
  
  if (timeElapsed < RATE_LIMIT_WINDOW && lastRequestTimestamp > 0) {
    // 1分程度前のリクエストがある場合は、待機時間を計算
    const waitTime = RATE_LIMIT_WINDOW - timeElapsed;
    console.log(`AWS Bedrockレート制限により、${waitTime}ms待機します...`);
    
    // クライアントにレート制限エラーを通知
    throw new Error('ThrottlingException: AWS Bedrockのレート制限に達しました。このサービスは1分に1回のリクエストまでです。しばらく待ってから再度お試しください。');
  }
  
  const bedrockRuntime = await getBedrockClient();
  
  if (!bedrockRuntime) {
    throw new Error('Bedrock clientが初期化されていません');
  }
  
  try {
    // 二択のまるばつ形式に変更するプロンプトを設定
    const prompt = buildTrueFalseQuizPrompt(content, numQuestions, difficulty);
    
    // 問題数に応じて最大トークン数を調整
    // Serverless Functions環境に最適化されたパラメータ
    const baseTokens = 3000;
    const tokensPerQuestion = 500; // 1問あたりの推定トークン数
    const maxTokens = Math.min(baseTokens + (numQuestions * tokensPerQuestion), 4500); // Serverless環境で最適化された上限
    
    // 温度設定を低くして満足度の高い結果を優先
    const temperature = 0.1; // 低温度設定で確定的な出力を優先
    
    // AWS Bedrockを使用してClaude呼び出し
    // アクセス権限が確認された Claude 3.5 Sonnet モデルを使用
    const modelId = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    
    console.log('使用するモデルID:', modelId);
    console.log('AWS Credentials:', {
      region: process.env.AWS_REGION || '設定なし',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ? '設定あり' : '設定なし',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? '設定あり' : '設定なし'
    });
    
    const response = await bedrockRuntime.send(
      new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: maxTokens,
          temperature: 0.1, // 低温度設定で満足度の高い結果を優先
          top_p: 0.999,
          messages: [
            { role: 'user', content: [{ type: 'text', text: prompt }] }
          ]
        })
      })
    );
    
    // レスポンス評価
    if (!response.body) {
      throw new Error('Bedrockから空のレスポンスを受け取りました');
    }
    
    // レスポンスをパース
    const responseBody = JSON.parse(Buffer.from(response.body).toString('utf-8'));
    
    // レスポンスからテキストを抽出
    const generatedText = responseBody.content[0].text;
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('モデルレスポンスからクイズデータを抽出できませんでした');
    }
    
    // JSONをパース
    const tfQuizData = JSON.parse(jsonMatch[0]);
    
    // まるばつクイズデータを4択クイズ形式に変換
    const quizData = convertTrueFalseToMultipleChoice(tfQuizData);
    
    // データ検証
    validateQuizData(quizData, numQuestions);
    
    // リクエストタイムスタンプを更新
    lastRequestTimestamp = Date.now();
    
    return quizData;
  } catch (error) {
    console.error('Error calling Claude 3.5 Sonnet:', error);
    throw error;
  }
}

/**
 * まるばつ形式のクイズ生成用のプロンプトを構築
 */
function buildTrueFalseQuizPrompt(content: string, numQuestions: number, difficulty: string) {
  // 特殊カテゴリの検出
  const specialCategory = detectSpecialCategory(content);
  
  // 特殊カテゴリが検出された場合
  if (specialCategory && SPECIAL_CATEGORIES[specialCategory]) {
    const categoryConfig = SPECIAL_CATEGORIES[specialCategory];
    const transformedContent = categoryConfig.contentTransform(content);
    
    // まるばつクイズ形式用に調整したテンプレート
    return `
以下のコンテンツに基づいて、${numQuestions}問の${difficulty}難易度の「まるばつクイズ（True/Falseクイズ）」を作成してください。

各問題では、文章の内容に基づいて、正しいか間違っているかを判断する必要があります。
文章の内容を全て反映するような多様な問題を作ります。

コンテンツ:
${transformedContent || content}

${getTrueFalseJsonInstructions(numQuestions, difficulty)}

JSONオブジェクトのみを返してください。他のテキストは含めないでください。
質問数を${numQuestions}問にすることを最優先してください。
`;
  }
  
  // 標準のまるばつクイズ生成プロンプト
  return `
以下の教育コンテンツに基づいて、正確に${numQuestions}問の${difficulty}難易度の「まるばつクイズ（True/Falseクイズ）」を生成してください。

各問題は「文章が正しい」または「文章が間違っている」かを判断する形式で作成してください。
文章そのものに加え、「なぜその文章が正しい/間違っているか」の詳細な解説も付けてください。

${getTrueFalseJsonInstructions(numQuestions, difficulty)}

教育コンテンツ:
${content}

JSONオブジェクトのみを返してください。他のテキストは含めないでください。
質問数を${numQuestions}問にすることを最優先してください。
`;
}

/**
 * まるばつクイズ用のJSON形式指示部分を生成
 */
function getTrueFalseJsonInstructions(numQuestions: number, difficulty: string) {
  return `回答は以下のJSON構造で返してください:

{
  "questions": [
    {
      "id": "一意のID (UUID形式)",
      "text": "評価する文章",
      "isTrue": trueまたはfalse,
      "explanation": "なぜこの文章が正しい/間違っているかの詳細な解説"
    },
    ...(必ず${numQuestions}個の質問を含めてください)
  ]
}

必ず以下の点に注意してください:
1. 全てのIDはUUID形式で一意であること
2. isTrueはboolean値で、文章が正しい場合はtrue、間違っている場合はfalse
3. 複雑過ぎる問題は避け、難易度が「${difficulty}」であることを考慮すること
4. 解説は入念なものにし、学習者が理解しやすいよう具体的かつ教育的な内容にしてください
5. 質問数は必ず${numQuestions}問とすること
6. 説明文は「～です」の丁寧な句読点で終わること`;
}

/**
 * まるばつクイズデータを4択クイズ形式に変換
 * @param {Object} tfQuizData - まるばつクイズデータ
 * @returns {Object} - 4択形式に変換されたクイズデータ
 */
function convertTrueFalseToMultipleChoice(tfQuizData: any) {
  // 変換結果のクイズデータを初期化
  const mcQuizData = {
    questions: []
  };
  
  // 各まるばつ問題を4択問題に変換
  tfQuizData.questions.forEach((tfQuestion: any) => {
    // UUIDを生成する関数
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    // 回答選択肢のIDを生成
    const trueOptionId = generateUUID();
    const falseOptionId = generateUUID();
    const otherOptionId1 = generateUUID();
    const otherOptionId2 = generateUUID();
    
    // 正解選択肢のIDを決定
    const correctAnswerId = tfQuestion.isTrue ? trueOptionId : falseOptionId;
    
    // 選択肢リストを作成
    const answers = [
      {
        id: trueOptionId,
        text: '正しい'
      },
      {
        id: falseOptionId,
        text: '間違っている'
      },
      {
        id: otherOptionId1,
        text: '文章に関連する情報が不足している'
      },
      {
        id: otherOptionId2,
        text: '部分的に正しいが、完全には正確ではない'
      }
    ];
    
    // 選択肢をシャッフル
    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }
    
    // 不正解選択肢の説明を生成
    const incorrectExplanations: Record<string, string> = {};
    answers.forEach(answer => {
      if (answer.id !== correctAnswerId) {
        if (answer.id === trueOptionId || answer.id === falseOptionId) {
          incorrectExplanations[answer.id] = `この選択肢は不正解です。${tfQuestion.explanation}`;
        } else if (answer.id === otherOptionId1) {
          incorrectExplanations[answer.id] = `この選択肢は不正解です。文章には十分な情報が含まれており、評価することが可能です。${tfQuestion.explanation}`;
        } else {
          incorrectExplanations[answer.id] = `この選択肢は不正解です。文章は完全に正しいか間違っているかのどちらかであり、部分的に正しいというわけではありません。${tfQuestion.explanation}`;
        }
      }
    });
    
    // 4択問題に変換した問題を作成
    const mcQuestion = {
      id: tfQuestion.id,
      text: tfQuestion.text,
      answers: answers,
      correctAnswerId: correctAnswerId,
      explanation: tfQuestion.explanation,
      incorrectExplanations: incorrectExplanations
    };
    
    // 結果に追加
    mcQuizData.questions.push(mcQuestion);
  });
  
  // 変換結果を返す
  return mcQuizData;
}

/**
 * クイズデータの有効性を検証
 */
function validateQuizData(quizData: any, expectedQuestions: number) {
  if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
    throw new Error('不正なクイズデータ形式: 質問が含まれていません');
  }
  
  // 要求された問題数と実際の問題数に大きな乖離がある場合に警告
  if (quizData.questions.length < expectedQuestions) {
    console.warn(`警告: 要求された問題数(${expectedQuestions})より少ない問題数(${quizData.questions.length})が生成されました`);
  }
  
  quizData.questions.forEach((question: any, index: number) => {
    // 必須フィールドの検証
    if (!question.id || !question.text || !question.answers || !question.correctAnswerId || !question.explanation) {
      throw new Error(`質問 ${index + 1} に必須フィールドがありません`);
    }
    
    // 選択肢が4つあることを確認
    if (!Array.isArray(question.answers) || question.answers.length !== 4) {
      throw new Error(`質問 ${index + 1} には正確に4つの選択肢が必要です`);
    }
    
    // 正解の選択肢IDが存在することを確認
    const correctAnswerExists = question.answers.some((answer: any) => answer.id === question.correctAnswerId);
    if (!correctAnswerExists) {
      throw new Error(`質問 ${index + 1} の正解選択肢IDが存在しません`);
    }
    
    // incorrectExplanationsが存在しない場合は作成する
    if (!question.incorrectExplanations) {
      question.incorrectExplanations = {};
    }

    // 各選択肢にエラーの説明を追加
    question.answers.forEach((answer: any) => {
      // explanationフィールドがない場合は追加
      if (!answer.explanation) {
        if (answer.id === question.correctAnswerId) {
          // 正解の場合は回答全体の説明を使用
          answer.explanation = question.explanation;
        } else {
          // 不正解の場合は個別の説明があればそちらを使用
          answer.explanation = question.incorrectExplanations[answer.id] || 
            `この選択肢は正確な答えではありません。`;
        }
      }
      
      // 不正解の選択肢に対しては個別の詳細な解説が必要
      if (answer.id !== question.correctAnswerId) {
        const existingExplanation = question.incorrectExplanations[answer.id];
        
        // 説明が存在しないか、単純すぎる場合はより詳細なデフォルト説明を生成
        const isTooSimple = existingExplanation && (
          existingExplanation.length < 30 || 
          existingExplanation.includes('不正解です') && existingExplanation.length < 50 ||
          !existingExplanation.includes('なぜ') && !existingExplanation.includes('理由') && existingExplanation.length < 100
        );
        
        // 不正解の場合は簡略された説明を設定
        if (!existingExplanation || isTooSimple) {
          // 単純な説明を設定 (オンデマンド生成のためのプレースホルダー)
          const baseExplanation = `この選択肢「${answer.text}」は正解ではありません。正解は「${question.answers.find((a: any) => a.id === question.correctAnswerId)?.text || ''}」です。または詳細な解説を生成します。`;
          question.incorrectExplanations[answer.id] = baseExplanation;
          answer.explanation = baseExplanation;
        }
      }
    });
  });
}