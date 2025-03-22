import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { QuizGenerationInput, Question, Answer } from './types';
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
export async function generateQuizWithClaude(input: QuizGenerationInput): Promise<{ questions: Question[] }> {
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
    // 処理開始時間を記録
    const startTime = Date.now();
    console.log(`API: Quiz generation started at ${new Date().toISOString()}`);
    
    // まずは2択（まるばつ）問題を生成
    const prompt = buildTrueFalseQuizPrompt(content, numQuestions, difficulty);
    
    // 問題数に応じて最大トークン数を調整 - 2択なのでトークン使用量削減
    const baseTokens = 2000;
    const tokensPerQuestion = 300; // 2択問題は1問あたりのトークン数が少ない
    const maxTokens = Math.min(baseTokens + (numQuestions * tokensPerQuestion), 3500); // 上限も低く設定
    
    // AWS Bedrockを使用してClaude呼び出し
    const modelId = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    
    console.log('使用するモデル:', modelId);
    console.log('2択問題生成モードでAPIを呼び出します');
    
    const response = await bedrockRuntime.send(
      new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: maxTokens,
          temperature: 0.1,
          top_p: 0.999,
          messages: [
            { role: 'user', content: [{ type: 'text', text: prompt }] }
          ]
        })
      })
    );
    
    // APIレスポンス時間を記録
    const elapsed = Date.now() - startTime;
    console.log(`API: Claude response received in ${elapsed}ms`);
    
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
    
    // JSONをパース - 2択形式のクイズデータ
    const tfQuizData = JSON.parse(jsonMatch[0]);
    
    // 2択データを検証
    validateTrueFalseQuizData(tfQuizData, numQuestions);
    
    // 2択問題を4択問題に変換
    const mcQuizData = convertTrueFalseToMultipleChoice(tfQuizData);
    
    // 変換時間を記録
    const conversionTime = Date.now() - startTime - elapsed;
    console.log(`API: Conversion to 4-choice completed in ${conversionTime}ms`);
    
    // 4択データを検証
    validateMultipleChoiceQuizData(mcQuizData, numQuestions);
    
    // リクエストタイムスタンプを更新
    lastRequestTimestamp = Date.now();
    
    return mcQuizData;
  } catch (error) {
    console.error('Error calling Claude 3.5 Sonnet:', error);
    
    // タイムアウトが疑われる場合の代替処理
    if (error instanceof Error && 
        (error.message.includes('timeout') || 
         error.message.includes('time') || 
         error.message.includes('exceeded'))) {
        
      console.warn('API may be timing out, using fallback mechanism with reduced questions');
      
      // 問題数を減らして再試行
      if (numQuestions > 3) {
        console.log(`Retrying with reduced question count: ${Math.floor(numQuestions / 2)}`);
        const reducedInput = { ...input, numQuestions: Math.floor(numQuestions / 2) };
        return generateQuizWithClaude(reducedInput);
      }
    }
    
    throw error;
  }
}

/**
 * まるばつクイズ用のプロンプトを構築
 */
function buildTrueFalseQuizPrompt(content: string, numQuestions: number, difficulty: string) {
  // 特殊カテゴリの検出
  const specialCategory = detectSpecialCategory(content);
  
  // 特殊カテゴリが検出された場合
  if (specialCategory && SPECIAL_CATEGORIES[specialCategory]) {
    const categoryConfig = SPECIAL_CATEGORIES[specialCategory];
    const transformedContent = categoryConfig.contentTransform(content);
    
    return `
以下のコンテンツに基づいて、${numQuestions}問の${difficulty}難易度の「まるばつクイズ」を作成してください。

各問題は「真」か「偽」かを判断する形式で、事実に基づいた正確な問題を作成してください。
文章は明確で曖昧さがないようにし、答えが明確に真か偽かに判断できるようにしてください。

コンテンツ:
${transformedContent || content}

回答は以下のJSON構造で返してください:

{
  "questions": [
    {
      "id": "一意のID (UUID形式)",
      "text": "事実に関する明確な文章",
      "isTrue": true または false,
      "explanation": "なぜその答えが正しいのかの詳細な解説"
    },
    ...(${numQuestions}個の質問を含めてください)
  ]
}

以下に注意してください:
1. 全てのIDは一意であること
2. 質問文は明確で、事実に基づいた文章であること
3. 難易度「${difficulty}」を考慮した問題を作成すること
4. 説明は詳細かつ教育的であること
5. 質問数は${numQuestions}問とすること

JSONオブジェクトのみを返してください。他のテキストは含めないでください。
`;
  }
  
  // 標準のまるばつクイズプロンプト
  return `
以下の教育コンテンツに基づいて、正確に${numQuestions}問の${difficulty}難易度の「まるばつクイズ」を作成してください。

各問題は、提示された文章が「真」か「偽」かを判断する形式です。
文章は明確で曖昧さがなく、答えが明確に真か偽かに判断できるようにしてください。

教育コンテンツ:
${content}

回答は以下のJSON構造で返してください:

{
  "questions": [
    {
      "id": "一意のID (UUID形式)",
      "text": "事実に関する明確な文章",
      "isTrue": true または false,
      "explanation": "なぜその答えが正しいのかの詳細な解説"
    },
    ...(${numQuestions}個の質問を含めてください)
  ]
}

必ず以下の点に注意してください:
1. 全てのIDはUUID形式で一意であること
2. 質問文は明確で、事実に基づいた文章であること
3. 難易度「${difficulty}」に合わせること（易しい・普通・難しいなど）
4. 説明は詳細かつ教育的であること
5. 質問数は必ず${numQuestions}問とすること
6. データは完全なJSON形式であること

JSONオブジェクトのみを返してください。他のテキストは含めないでください。
`;
}

/**
 * まるばつクイズデータを4択クイズ形式に変換
 * @param {Object} tfQuizData - まるばつクイズデータ
 * @returns {Object} - 4択形式に変換されたクイズデータ
 */
function convertTrueFalseToMultipleChoice(tfQuizData: any): { questions: Question[] } {
  // 変換結果のクイズデータを初期化
  const mcQuizData: { questions: Question[] } = {
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
    
    // 基本選択肢の作成（「はい/いいえ」または「正しい/間違い」形式）
    const trueOptionId = generateUUID();
    const falseOptionId = generateUUID();
    
    // 回答選択肢の洗練されたバリエーション
    const trueVariations = [
      "正しい",
      "その通り",
      "はい、事実です",
      "その説明は正確です"
    ];
    
    const falseVariations = [
      "間違っている",
      "誤りです",
      "いいえ、事実ではありません",
      "その説明は不正確です"
    ];
    
    // デコイ選択肢のバリエーション（問題の傾向に合わせて作成）
    const decoyVariations = [
      [
        "部分的に正しい",
        "どちらとも言えない",
        "限定的な状況でのみ正しい",
        "データが不足しているため判断できない"
      ],
      [
        "特定の条件下でのみ正しい",
        "事実だが不完全な説明",
        "文脈によって異なる",
        "正確ではないが完全に誤りでもない"
      ]
    ];
    
    // 回答インデックスをランダムに選択
    const trueTextIndex = Math.floor(Math.random() * trueVariations.length);
    const falseTextIndex = Math.floor(Math.random() * falseVariations.length);
    
    // デコイ選択肢の生成
    const decoyGroupIndex = Math.floor(Math.random() * decoyVariations.length);
    const decoyOptionId1 = generateUUID();
    const decoyOptionId2 = generateUUID();
    
    // ランダムにデコイ選択肢を選択（重複しないように）
    const usedIndices = new Set<number>();
    const getRandomDecoyIndex = () => {
      let index;
      do {
        index = Math.floor(Math.random() * decoyVariations[decoyGroupIndex].length);
      } while (usedIndices.has(index));
      usedIndices.add(index);
      return index;
    };
    
    const decoyIndex1 = getRandomDecoyIndex();
    const decoyIndex2 = getRandomDecoyIndex();
    
    // 選択肢リストを作成
    const answers: Answer[] = [
      {
        id: trueOptionId,
        text: trueVariations[trueTextIndex]
      },
      {
        id: falseOptionId,
        text: falseVariations[falseTextIndex]
      },
      {
        id: decoyOptionId1,
        text: decoyVariations[decoyGroupIndex][decoyIndex1]
      },
      {
        id: decoyOptionId2,
        text: decoyVariations[decoyGroupIndex][decoyIndex2]
      }
    ];
    
    // 正解選択肢のIDを決定
    const correctAnswerId = tfQuestion.isTrue ? trueOptionId : falseOptionId;
    
    // 選択肢をシャッフル
    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // 型安全なシャッフルスワップ
      const temp = answers[i];
      answers[i] = answers[j];
      answers[j] = temp;
    }
    
    // 不正解選択肢の説明を生成
    const incorrectExplanations: Record<string, string> = {};
    answers.forEach(answer => {
      if (answer.id !== correctAnswerId) {
        if (answer.id === trueOptionId) {
          // 真の選択肢が不正解の場合（実際は偽）
          incorrectExplanations[answer.id] = `この選択肢は不正解です。この文章は事実ではありません。${tfQuestion.explanation}`;
        } else if (answer.id === falseOptionId) {
          // 偽の選択肢が不正解の場合（実際は真）
          incorrectExplanations[answer.id] = `この選択肢は不正解です。この文章は事実です。${tfQuestion.explanation}`;
        } else if (answer.id === decoyOptionId1) {
          // デコイ選択肢1に対する説明
          incorrectExplanations[answer.id] = `この選択肢「${answer.text}」は不正解です。この文章は白黒はっきりとした事実であり、曖昧さはありません。${tfQuestion.explanation}`;
        } else if (answer.id === decoyOptionId2) {
          // デコイ選択肢2に対する説明
          incorrectExplanations[answer.id] = `この選択肢「${answer.text}」は不正解です。この文章は完全に正しいか完全に誤っているかのどちらかです。${tfQuestion.explanation}`;
        }
      }
    });
    
    // 4択問題に変換した問題を作成
    const mcQuestion: Question = {
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
  
  return mcQuizData;
}

/**
 * まるばつクイズデータの有効性を検証
 */
function validateTrueFalseQuizData(quizData: any, expectedQuestions: number) {
  if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
    throw new Error('不正なクイズデータ形式: 質問が含まれていません');
  }
  
  // 要求された問題数と実際の問題数に大きな乖離がある場合に警告
  if (quizData.questions.length < expectedQuestions) {
    console.warn(`警告: 要求された問題数(${expectedQuestions})より少ない問題数(${quizData.questions.length})が生成されました`);
  }
  
  quizData.questions.forEach((question: any, index: number) => {
    // 必須フィールドの検証
    if (!question.id || !question.text || question.isTrue === undefined || !question.explanation) {
      throw new Error(`質問 ${index + 1} に必須フィールドがありません`);
    }
    
    // isTrue フィールドがブール値であることを確認
    if (typeof question.isTrue !== 'boolean') {
      throw new Error(`質問 ${index + 1} の isTrue フィールドがブール値ではありません`);
    }
  });
}

/**
 * 4択式クイズデータの有効性を検証
 */
function validateMultipleChoiceQuizData(quizData: any, expectedQuestions: number) {
  if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
    throw new Error('不正なクイズデータ形式: 質問が含まれていません');
  }
  
  // 要求された問題数と実際の問題数に大きな乾離がある場合に警告
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
    
    // 各選択肢が有効な形式であることを検証
    question.answers.forEach((answer: any, ansIdx: number) => {
      if (!answer.id || !answer.text) {
        throw new Error(`質問 ${index + 1} の選択肢 ${ansIdx + 1} に必須フィールドがありません`);
      }
    });
    
    // incorrectExplanationsが存在しない場合は作成する
    if (!question.incorrectExplanations) {
      question.incorrectExplanations = {};
    }

    // 各選択肢の解説を検証、不足していれば生成
    question.answers.forEach((answer: any) => {
      // 正解以外の選択肢には個別の詳細な解説が必要
      if (answer.id !== question.correctAnswerId) {
        // 詳細な解説がない場合はデフォルトのシンプルな解説を設定
        if (!question.incorrectExplanations[answer.id]) {
          // デフォルトの解説を生成
          const correctAnswer = question.answers.find((a: any) => a.id === question.correctAnswerId);
          const baseExplanation = `この選択肢「${answer.text}」は正解ではありません。正解は「${correctAnswer?.text || ''}」です。大変申し訳ありませんが、この選択肢が不正解である理由に関する詳細情報はまだ利用できません。「より詳細な解説を生成」ボタンをクリックすると、この選択肢が不正解である理由についてより詳細な解説を生成します。`;
          question.incorrectExplanations[answer.id] = baseExplanation;
        }
      }
    });
  });
}