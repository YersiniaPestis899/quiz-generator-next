import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { QuizGenerationInput } from './types';
import { detectSpecialCategory, SPECIAL_CATEGORIES } from './specialCategories';

// BedrockクライアントをシングルトンパターンでNode.js環境で初期化
let bedrockClient: BedrockRuntimeClient | null = null;

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
        const { NodeHttpHandler } = await import('@smithy/node-http-handler');
        clientConfig.requestHandler = new NodeHttpHandler({
          connectionTimeout: 39000, // 接続確立のタイムアウト: 39秒
          socketTimeout: 39000,     // データ送受信のタイムアウト: 39秒
        });
        console.log('カスタムタイムアウト設定が適用されました: 39秒');
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
  const bedrockRuntime = await getBedrockClient();
  
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
      
    // 変換コンテンツが存在する場合は、プロンプトに追加
    const contentSection = transformedContent ? `

ユーザーが提供したコンテンツ:
${transformedContent}

上記のコンテンツに基づいてクイズを生成してください。コンテンツの内容を尊重し、そこから直接問題と回答を作成してください。` : '';
    
    // 共通JSON構造部分を付加
    return `${promptTemplate}${contentSection}

${getCommonJsonInstructions(numQuestions, difficulty)}`;
  }
  
  // 標準のクイズ生成プロンプト
  return `
以下の教育コンテンツに基づいて、正確に${numQuestions}問の${difficulty}難易度のクイズを生成してください。
回答は必ず教育コンテンツ内から正確な情報を使用してください。
必ず${numQuestions}問をJSON形式で返してください。

主に正解選択肢に関する詳細な解説に集中してください。不正解の選択肢については、後ほど必要に応じて別途生成されます。

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
          "text": "回答オプション",
          "explanation": "この選択肢に関する解説"
        },
        ...（必ず4つの選択肢を用意してください）
      ],
      "correctAnswerId": "正解選択肢のID",
      "explanation": "正解の詳細な説明（なぜそれが正解なのか）",
      "incorrectExplanations": {
        "answer_id1": "この選択肢が不正解である理由の具体的な説明",
        "answer_id2": "この選択肢が不正解である理由の具体的な説明",
        "answer_id3": "この選択肢が不正解である理由の具体的な説明"
      }
    },
    ...（必ず${numQuestions}個の質問を含めてください）
  ]
}

必ず以下の点に注意してください:
1. 全てのIDはUUID形式で一意であること
2. 各質問は4つの選択肢を持つこと
3. 選択肢は明確に区別でき、1つだけが正解であること
4. 難易度が「${difficulty}」であることを考慮すること
5. 正解の解説に注力し、学習者が理解しやすいよう具体的かつ教育的な内容にしてください
6. 不正解選択肢の解説は基本的な内容で構いません。これらは後ほどオンデマンドで生成されます。
7. incorrectExplanationsオブジェクトのキーは、各不正解選択肢のIDと一致すること（正解選択肢のIDは含めないこと）
8. 質問数は必ず${numQuestions}問とすること
9. 説明文は「～です」の丁寧な句読点で終わること`;
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