import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// BedrockクライアントをシングルトンパターンでNode.js環境で初期化
let bedrockClient: BedrockRuntimeClient | null = null;

function getBedrockClient() {
  if (!bedrockClient && typeof process !== 'undefined') {
    bedrockClient = new BedrockRuntimeClient({ 
      region: process.env.AWS_REGION || 'us-west-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });
  }
  return bedrockClient;
}

/**
 * API: /api/explain
 * 不正解選択肢の詳細な説明を生成するエンドポイント
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディからパラメータを取得
    const body = await request.json();
    const { 
      questionText,       // 問題文
      incorrectOptionText, // 不正解選択肢の文
      correctOptionText,   // 正解選択肢の文
      questionId,         // 問題ID (オプション)
      incorrectOptionId,  // 不正解選択肢ID (オプション)
      quizContext         // クイズの全体的なコンテキスト (オプション)
    } = body;
    
    console.log('API: Received explanation request for:', {
      questionId,
      incorrectOptionId,
      questionText: questionText?.substring(0, 50) + '...',
    });
    
    // 必須パラメータの検証
    if (!questionText || !incorrectOptionText || !correctOptionText) {
      return NextResponse.json(
        { message: '問題文、不正解選択肢、正解選択肢は必須です' }, 
        { status: 400 }
      );
    }
    
    // AWS Bedrockクライアントの初期化
    const bedrockRuntime = getBedrockClient();
    if (!bedrockRuntime) {
      throw new Error('Bedrock clientの初期化に失敗しました');
    }
    
    // プロンプトの作成（詳細な説明を要求）
    const prompt = buildExplanationPrompt(
      questionText,
      incorrectOptionText,
      correctOptionText,
      quizContext
    );
    
    // Claude 3.5 Sonnetを呼び出して詳細な説明を生成
    const modelId = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    const response = await bedrockRuntime.send(
      new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1000,
          temperature: 0.2,
          top_p: 0.95,
          messages: [
            { role: 'user', content: [{ type: 'text', text: prompt }] }
          ]
        })
      })
    );
    
    // レスポンスの処理
    if (!response.body) {
      throw new Error('空のレスポンスを受け取りました');
    }
    
    // レスポンスをパース
    const responseBody = JSON.parse(Buffer.from(response.body).toString('utf-8'));
    const explanation = responseBody.content[0].text.trim();
    
    console.log('API: Generated explanation successfully');
    
    // 生成された説明を返す
    return NextResponse.json({
      explanation,
      questionId,
      incorrectOptionId
    });
    
  } catch (error) {
    console.error('API: Error generating explanation:', error);
    
    // エラーオブジェクトの安全な処理
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    
    // エラーレスポンスを返す
    return NextResponse.json(
      { 
        message: '説明の生成に失敗しました', 
        error: errorMessage 
      }, 
      { status: 500 }
    );
  }
}

/**
 * 不正解選択肢の詳細な説明を生成するためのプロンプトを構築
 */
function buildExplanationPrompt(
  questionText: string,
  incorrectOptionText: string,
  correctOptionText: string,
  quizContext?: string
): string {
  return `
以下のクイズ問題について、不正解選択肢に対する詳細な説明を生成してください。

${quizContext ? `クイズのコンテキスト: ${quizContext}\n` : ''}

問題: ${questionText}

正解選択肢: 「${correctOptionText}」

不正解選択肢: 「${incorrectOptionText}」

この不正解選択肢が誤りである理由について、詳細かつ教育的な説明を作成してください。
以下の点を必ず含めてください:

1. この選択肢が何を意味しているか、またはどのような考え方・概念を表しているか
2. なぜこの選択肢が不正解となるのかの具体的な理由（事実誤認、論理的矛盾、不適切な適用など）
3. この選択肢を選んでしまいがちな一般的な誤解や混乱の原因
4. 正解との比較（類似点と相違点）、および正確な理解につながる説明

説明は教育的で、学習者が概念をより深く理解できるよう丁寧に記述してください。
専門用語を使用する場合は、必要に応じて簡潔な定義を含めてください。

回答形式は、整形されたテキストのみで返してください。マークダウンやHTML等は不要です。
`;
}
