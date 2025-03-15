import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// AWS Bedrock クライアント初期化
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// Claude 3.7 Sonnetモデル ID
const MODEL_ID = 'anthropic.claude-3-7-sonnet-20240229';

interface QuizQuestion {
  id: string;
  text: string;
  answers: Array<{
    id: string;
    text: string;
  }>;
  correctAnswerId: string;
  explanation: string;
}

/**
 * POST /api/generate
 * クイズ生成API
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディからパラメータを取得
    const body = await request.json();
    const { title, content, numQuestions = 5, difficulty = 'medium' } = body;
    
    // 入力検証
    if (!title || !content) {
      return NextResponse.json(
        { message: 'タイトルとコンテンツは必須です' }, 
        { status: 400 }
      );
    }
    
    // URLから匿名ユーザーIDを取得
    const url = new URL(request.url);
    const anonymousId = url.searchParams.get('anonymousId') || "anon_default";
    
    // 環境変数チェック
    const isConfigValid = process.env.AWS_ACCESS_KEY_ID && 
                         process.env.AWS_SECRET_ACCESS_KEY && 
                         process.env.AWS_REGION;
    
    // クイズID生成
    const quizId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // デプロイ環境での本実装：AWS Bedrock Claude 3.7 Sonnetを使用
    if (isConfigValid) {
      try {
        console.log('AWS Bedrock Claude 3.7 Sonnetを使用してクイズを生成します');
        
        // Claudeプロンプトを構築
        const prompt = generateQuizPrompt(content, numQuestions, difficulty);
        
        // Claude APIリクエスト設定
        const params = {
          modelId: MODEL_ID,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 4000,
            temperature: 0.7,
            messages: [
              { role: 'user', content: prompt }
            ]
          })
        };
        
        // Claude APIを呼び出し
        const command = new InvokeModelCommand(params);
        const response = await bedrockClient.send(command);
        
        // レスポンスを処理
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const aiResponse = responseBody.content[0].text;
        
        // Claude応答からクイズデータを抽出
        const questions = parseClaudeResponse(aiResponse, numQuestions);
        
        // クイズオブジェクト作成
        const quiz = {
          id: quizId,
          title,
          difficulty,
          questions,
          created_at: timestamp,
          user_id: anonymousId
        };
        
        return NextResponse.json(quiz);
      } catch (error: any) {
        console.error('Claude APIエラー:', error);
        // エラー発生時は開発用ダミーデータを返す（一時的なフォールバック）
        return NextResponse.json(generateDummyQuiz(quizId, title, content, numQuestions, difficulty, timestamp, anonymousId));
      }
    } else {
      // 設定が不完全な場合は開発用ダミーデータを返す
      console.warn('AWS Bedrock設定が不完全です。ダミーデータを生成します。');
      return NextResponse.json(generateDummyQuiz(quizId, title, content, numQuestions, difficulty, timestamp, anonymousId));
    }
  } catch (error: any) {
    console.error('クイズ生成エラー:', error);
    
    // エラーレスポンスを返す
    return NextResponse.json(
      { message: 'クイズの生成に失敗しました', error: error.message }, 
      { status: 500 }
    );
  }
}

/**
 * クイズ生成用のClaudeプロンプトを構築
 */
function generateQuizPrompt(content: string, numQuestions: number, difficulty: string): string {
  // 難易度の説明を日本語で追加
  const difficultyDescription = {
    'easy': '初級者向けで基本的な理解度をテストする簡単な問題',
    'medium': '中級者向けで内容のより深い理解度をテストする標準的な問題',
    'hard': '上級者向けで深い思考や応用力を必要とする難しい問題'
  }[difficulty] || '中級者向けの標準的な問題';

  return `以下の教育コンテンツに基づいて、多肢選択式クイズの問題と回答を作成してください。

教育コンテンツ:
"""
${content}
"""

要件:
1. ${numQuestions}問の質問を作成してください。
2. 各質問には4つの選択肢を用意してください。選択肢のうち1つだけが正解で、残りは不正解にしてください。
3. 難易度は「${difficulty}」（${difficultyDescription}）です。
4. 各問題には、正解の詳細な説明を追加してください。
5. JSONフォーマットで回答してください。

出力形式:
\`\`\`json
[
  {
    "question": "質問文をここに記入",
    "options": [
      "選択肢1",
      "選択肢2",
      "選択肢3",
      "選択肢4"
    ],
    "correctOptionIndex": 0,
    "explanation": "正解の詳細な説明"
  },
  ... (残りの問題)
]
\`\`\`

注意点:
- 質問は明確で具体的にしてください。
- 選択肢は明確に区別できるようにしてください。
- 与えられたコンテンツの重要なポイントをカバーするようにしてください。
- 簡単なクイズでも単なる暗記ではなく、理解度を測れるような質問を心がけてください。

JSON形式だけを返してください。JSONの前後に追加のテキストは不要です。`;
}

/**
 * Claude APIのレスポンスからクイズデータを抽出・パース
 */
function parseClaudeResponse(response: string, expectedQuestions: number): QuizQuestion[] {
  try {
    // JSONデータを抽出（マークダウンコードブロックから）
    const jsonMatch = response.match(/```(?:json)?([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : response;
    
    // JSONをパース
    const rawQuestions = JSON.parse(jsonString);
    
    // QuizQuestionフォーマットに変換
    return rawQuestions.map((q: any) => {
      // 各選択肢にIDを割り当て
      const answerIds = q.options.map(() => uuidv4());
      const correctIndex = q.correctOptionIndex;
      
      return {
        id: uuidv4(),
        text: q.question,
        answers: q.options.map((text: string, index: number) => ({
          id: answerIds[index],
          text
        })),
        correctAnswerId: answerIds[correctIndex],
        explanation: q.explanation
      };
    });
  } catch (error) {
    console.error('Claude応答の解析エラー:', error);
    // パースに失敗した場合はダミーの問題を返す
    return Array.from({ length: expectedQuestions }).map((_, index) => createDummyQuestion(index, expectedQuestions));
  }
}

/**
 * 一時的なフォールバック用のダミークイズ生成
 */
function generateDummyQuiz(quizId: string, title: string, content: string, numQuestions: number, difficulty: string, timestamp: string, anonymousId: string) {
  // サンプルの問題を生成
  const questions = Array.from({ length: numQuestions }).map((_, index) => 
    createDummyQuestion(index, numQuestions, content)
  );
  
  // クイズオブジェクト作成
  return {
    id: quizId,
    title,
    difficulty,
    questions,
    created_at: timestamp,
    user_id: anonymousId
  };
}

/**
 * ダミーの問題を作成
 */
function createDummyQuestion(index: number, total: number, contentSnippet: string = ''): QuizQuestion {
  const questionId = uuidv4();
  const correctId = uuidv4();
  
  // 短いコンテンツプレビューを作成（提供されている場合）
  const contentPreview = contentSnippet 
    ? `${contentSnippet.substring(0, 30)}...` 
    : '';
  
  return {
    id: questionId,
    text: `質問 ${index + 1}/${total}: ${contentPreview}に関する質問です`,
    answers: [
      { id: correctId, text: "これが正解の選択肢です" },
      { id: uuidv4(), text: "これは不正解の選択肢です (1)" },
      { id: uuidv4(), text: "これは不正解の選択肢です (2)" },
      { id: uuidv4(), text: "これは不正解の選択肢です (3)" }
    ],
    correctAnswerId: correctId,
    explanation: "これは仮の説明文です。AWS Bedrock APIが適切に設定されると、Claude AIによる詳細な説明が提供されます。"
  };
}