import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { QuizGenerationInput } from './types';
import { detectSpecialCategory, SPECIAL_CATEGORIES } from './specialCategories';

// Bedrockクライアントをシングルトンパターンでnode.js環境で初期化
let bedrockClient: BedrockRuntimeClient | null = null;

function getBedrockClient() {
  if (!bedrockClient && typeof process !== 'undefined') {
    bedrockClient = new BedrockRuntimeClient({ 
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });
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
  const bedrockRuntime = getBedrockClient();
  
  if (!bedrockRuntime) {
    throw new Error('Bedrock clientが初期化されていません');
  }
  
  try {
    // プロンプト構築
    const prompt = buildQuizPrompt(content, numQuestions, difficulty);
    
    // 問題数に応じて最大トークン数を調整
    // 基本トークン数 + 問題数に応じた追加トークン
    const baseTokens = 4000;
    const tokensPerQuestion = 500; // 1問あたりの推定トークン数
    const maxTokens = Math.min(baseTokens + (numQuestions * tokensPerQuestion), 8000);
    
    // AWS Bedrockを使用してClaude呼び出し
    // アクセス権限が確認された Claude 3.5 Sonnet モデルを使用
    const modelId = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    
    const response = await bedrockRuntime.send(
      new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: maxTokens,
          temperature: 0.2,
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
    const quizData = JSON.parse(jsonMatch[0]);
    
    // データ検証
    validateQuizData(quizData, numQuestions);
    
    return quizData;
  } catch (error) {
    console.error('Error calling Claude 3.5 Sonnet:', error);
    throw error;
  }
}

/**
 * クイズ生成用のプロンプトを構築
 */
function buildQuizPrompt(content: string, numQuestions: number, difficulty: string) {
  // 特殊カテゴリの検出
  const specialCategory = detectSpecialCategory(content);
  
  // 特殊カテゴリが検出された場合
  if (specialCategory && SPECIAL_CATEGORIES[specialCategory]) {
    const categoryConfig = SPECIAL_CATEGORIES[specialCategory];
    
    // コンテンツ変換処理
    const transformedContent = categoryConfig.contentTransform(content);
    
    // カテゴリ固有のプロンプトテンプレートを適用
    let promptTemplate = categoryConfig.promptTemplate;
    
    // テンプレート内のパラメータ置換
    promptTemplate = promptTemplate
      .replace('{numQuestions}', numQuestions.toString())
      .replace('{difficulty}', difficulty);
    
    // 共通JSON構造部分を付加
    return `${promptTemplate}

${getCommonJsonInstructions(numQuestions, difficulty)}`;
  }
  
  // 標準のクイズ生成プロンプト
  return `
以下の教育コンテンツに基づいて、正確に${numQuestions}問の${difficulty}難易度のクイズを生成してください。
回答は必ず教育コンテンツ内から正確な情報を使用してください。
必ず${numQuestions}問をJSON形式で返してください。

${getCommonJsonInstructions(numQuestions, difficulty)}

教育コンテンツ:
${content}

JSONオブジェクトのみを返してください。他のテキストは含めないでください。
質問数を${numQuestions}問にすることを最優先してください。
`;
}

/**
 * 共通のJSON形式指示部分を生成
 */
function getCommonJsonInstructions(numQuestions: number, difficulty: string) {
  return `回答は以下のJSON構造で返してください:

{
  "questions": [
    {
      "id": "一意のID (UUID形式)",
      "text": "質問文",
      "answers": [
        {
          "id": "一意のID (UUID形式)",
          "text": "回答オプション"
        },
        ...（必ず4つの選択肢を用意してください）
      ],
      "correctAnswerId": "正解選択肢のID",
      "explanation": "正解の詳細な説明（なぜそれが正解なのか）"
    },
    ...（必ず${numQuestions}個の質問を含めてください）
  ]
}

必ず以下の点に注意してください:
1. 全てのIDはUUID形式で一意であること
2. 各質問は4つの選択肢を持つこと
3. 選択肢は明確に区別でき、1つだけが正解であること
4. 難易度が「${difficulty}」であることを考慮すること
5. 説明は学習者が理解しやすいよう具体的かつ教育的であること
6. 質問数は必ず${numQuestions}問とすること`;
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
  });
}