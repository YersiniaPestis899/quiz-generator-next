import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// BedrockクライアントをシングルトンパターンでNode.js環境で初期化
let bedrockClient: BedrockRuntimeClient | null = null;

function getBedrockClient() {
  if (!bedrockClient && typeof process !== 'undefined') {
    try {
      console.log('Bedrockクライアントを初期化します...', { 
        region: process.env.AWS_REGION,
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
      });
      
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error('AWS認証情報が不足しています');
        throw new Error('AWS認証情報が不足しています');
      }
      
      bedrockClient = new BedrockRuntimeClient({ 
        region: process.env.AWS_REGION || 'us-west-2',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      
      console.log('Bedrockクライアントの初期化に成功しました');
    } catch (error: unknown) {
      console.error('Bedrockクライアントの初期化エラー:', error);
      throw error;
    }
  }
  return bedrockClient;
}

/**
 * API: /api/explain
 * 不正解選択肢の詳細な説明を生成するエンドポイント
 */
export async function POST(request: NextRequest) {
  try {
    console.log('API: 解説リクエスト受信');
    
    // リクエストボディからパラメータを取得
    let body;
    try {
      body = await request.json();
    } catch (error: unknown) {
      console.error('API: リクエストJSON解析エラー:', error);
      return NextResponse.json(
        { message: '無効なリクエストフォーマット' }, 
        { status: 400 }
      );
    }
    
    const { 
      questionText,       // 問題文
      incorrectOptionText, // 不正解選択肢の文
      correctOptionText,   // 正解選択肢の文
      questionId,         // 問題ID (オプション)
      incorrectOptionId,  // 不正解選択肢ID (オプション)
      quizContext         // クイズの全体的なコンテキスト (オプション)
    } = body;
    
    console.log('API: 解説リクエストデータ:', {
      questionId,
      incorrectOptionId,
      hasQuestionText: !!questionText,
      questionTextLength: questionText?.length,
      hasIncorrectOptionText: !!incorrectOptionText,
      hasCorrectOptionText: !!correctOptionText,
      incorrectOptionTextLength: incorrectOptionText?.length,
      correctOptionTextLength: correctOptionText?.length,
      hasQuizContext: !!quizContext,
    });
    
    // 必須パラメータの検証
    if (!questionText || !incorrectOptionText || !correctOptionText) {
      console.warn('API: 必須パラメータの欠落');
      return NextResponse.json(
        { message: '問題文、不正解選択肢、正解選択肢は必須です' }, 
        { status: 400 }
      );
    }
    
    console.log('API: Bedrockクライアントを取得中...');
    
    // AWS Bedrockクライアントの初期化
    let bedrockRuntime;
    try {
      bedrockRuntime = getBedrockClient();
      if (!bedrockRuntime) {
        throw new Error('Bedrock clientの取得に失敗しました');
      }
    } catch (error: unknown) {
      console.error('API: Bedrockクライアント初期化エラー:', error);
      return NextResponse.json(
        { message: 'AIサービスへの接続に失敗しました' }, 
        { status: 500 }
      );
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
    console.log(`API: Bedrockモデル ${modelId} を呼び出しています`);
    
    const requestParams = {
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
    };
    
    let response;
    try {
      console.log('API: Bedrockにリクエスト送信開始...');
      response = await bedrockRuntime.send(new InvokeModelCommand(requestParams));
      console.log('API: Bedrockからレスポンスを受信しました');
    } catch (error: unknown) {
      console.error('API: Bedrockモデル呼び出しエラー:', error);
      // AWS SDKエラーの詳細情報をログに出力（型安全な方法で）
      if (error && typeof error === 'object') {
        if ('name' in error) console.error('Error name:', error.name);
        if ('code' in error) console.error('Error code:', error.code);
        if ('$metadata' in error) console.error('Error metadata:', error.$metadata);
      }
      
      // エラーメッセージを型安全に構築
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? String(error.message) 
        : '不明なエラー';
      
      throw new Error(`Bedrock APIエラー: ${errorMessage}`);
    }
    
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
    
  } catch (error: unknown) {
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
