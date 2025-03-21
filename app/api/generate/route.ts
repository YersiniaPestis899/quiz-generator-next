import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateQuizWithClaude } from '@/lib/claude';
import { saveQuiz } from '@/lib/supabase';
import { QuizGenerationInput, Quiz } from '@/lib/types';
// Import named export directly to ensure type safety
import { getUserIdOrAnonymousId } from '@/lib/auth';

// Edge Runtimeを有効化し、長時間実行を可能にする
export const runtime = 'edge';

// Next.js App Routerの新しい構文で最大実行時間を設定
// 注: これはEdge Functionsにも適用されます
export const maxDuration = 30; // Vercelの制限に合わせて1分から30秒に短縮

// これは実際の実装です - AWS Bedrock Claude 3.5 Sonnetを使用

/**
 * POST /api/generate
 * クイズ生成API
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディからパラメータを取得
    console.log('API: Received quiz generation request');
    const body = await request.json();
    const { title, content, numQuestions = 5, difficulty = 'medium', existingQuiz, similarToQuiz }: 
      QuizGenerationInput & { existingQuiz?: Quiz, similarToQuiz?: Quiz } = body;
    
    console.log(`API: Processing quiz request: "${title}" with ${numQuestions} questions at ${difficulty} difficulty`);
    
    // URLからユーザーの匿名IDを抽出
    const url = new URL(request.url);
    const anonymousId = url.searchParams.get('anonymousId');
    console.log('API: Anonymous ID from request:', anonymousId);
    
    // 現在のユーザーIDを取得
    const userId = anonymousId || await getUserIdOrAnonymousId();
    console.log('API: Using user ID:', userId);
    
    // 入力検証
    if (!title || !content) {
      console.log('API: Missing required fields');
      return NextResponse.json(
        { message: 'タイトルとコンテンツは必須です' }, 
        { status: 400 }
      );
    }
    
    // AWS環境変数のチェック
    const awsRegion = process.env.AWS_REGION;
    const awsKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;
    
    console.log('API: AWS環境変数チェック', {
      region: awsRegion ? '設定あり' : '未設定',
      accessKeyId: awsKey ? '設定あり' : '未設定',
      secretAccessKey: awsSecret ? '設定あり' : '未設定'
    });
    
    // 元クイズを参考にした「似たようなクイズ」作成モード
    if (similarToQuiz) {
      console.log('API: Creating similar quiz based on existing quiz');
      try {
        // Edge RuntimeとmaxDurationで最大実行時間が拡張されたことをログに記録
        console.log('API: Starting similar quiz generation with extended execution time (Edge Runtime + maxDuration: 60s)');
        
        // クイズ生成のプロンプトを最適化（処理回路激化のための必要情報のみに制限）
        const optimizedContent = `前回のクイズと似た関連テーマで新しいクイズを作成してください。
元クイズタイトル: ${similarToQuiz.title}
問題数: ${numQuestions}
難易度: ${difficulty}

元の問題からテーマと種類を維持しつつ、新しい問題を生成してください。
回答選択肢は単純かつ簡潔にしてください。
結果をJSON形式で返してください。`;
        
        console.log(`プロンプト最適化: 必要最小限の指示に絶ったプロンプトサイズ ${optimizedContent.length} バイト`);
        
        // 元クイズの情報を使用して似たようなクイズを生成
        const quizData = await generateQuizWithClaude({ 
          title, 
          content: optimizedContent,
          numQuestions, 
          difficulty 
        });
        
        // クイズオブジェクト作成
        const quizId = uuidv4();
        const timestamp = new Date().toISOString();
        
        const quiz = {
          id: quizId,
          title,
          difficulty,
          questions: quizData.questions,
          created_at: timestamp,
          user_id: userId  // ユーザーIDを追加
        };
        
        console.log(`API: Created similar quiz with ID ${quizId} and ${quiz.questions.length} questions`);
        
        // Supabaseに保存
        await saveQuiz(quiz);
        console.log('API: Similar quiz saved successfully!');
        
        // 成功レスポンスを返す
        return NextResponse.json(quiz);
      } catch (error) {
        // 似たようなクイズ生成での特定エラー処理
        console.error('Similar quiz generation error:', error);
        
        // エラーの詳細情報をログに出力
        const errorDetail = {
          message: error instanceof Error ? error.message : '不明なエラー',
          name: error instanceof Error ? error.name : 'エラー',
          stack: error instanceof Error ? error.stack : null,
          toString: String(error)
        };
        console.error('Detailed error information:', JSON.stringify(errorDetail, null, 2));
        
        // タイムアウトが疑われる場合のメッセージ
        let errorMessage = error instanceof Error ? error.message : '似たような問題の生成に失敗しました';
        
        // タイムアウトや通信エラーのような場合は、より具体的なメッセージを追加
        if (errorMessage.includes('timeout') || errorMessage.includes('タイムアウト') ||
            errorMessage.includes('ECONNRESET') || errorMessage.includes('network') ||
            errorMessage.includes('connection')) {
          errorMessage = 'タイムアウトエラー: クイズ生成に時間がかかりすぎました。問題の数を減らすか、より簡単なコンテンツでお試しください。';
        }
        
        return NextResponse.json(
          { message: errorMessage }, 
          { status: 500 }
        );
      }
    }
    
    // 既存のクイズが指定されている場合は、そのまま再保存する
    if (existingQuiz) {
      console.log('API: Using existing quiz data for saving');
      // クイズオブジェクト作成
      const quiz = {
        ...existingQuiz,
        user_id: userId  // ユーザーIDを更新
      };
      
      // Supabaseに保存
      console.log('API: Saving existing quiz to Supabase...');
      await saveQuiz(quiz);
      console.log('API: Quiz saved successfully!');
      
      // 成功レスポンスを返す
      return NextResponse.json(quiz);
    }
    
    console.log('API: Calling Claude 3.5 Sonnet to generate quiz...');
    // Claude 3.5 Sonnetを使用してクイズデータを生成
    const quizData = await generateQuizWithClaude({ title, content, numQuestions, difficulty });
    console.log('API: Quiz data received from Claude');
    
    // クイズオブジェクト作成
    const quizId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const quiz = {
      id: quizId,
      title,
      difficulty,
      questions: quizData.questions,
      created_at: timestamp,
      user_id: userId  // ユーザーIDを追加
    };
    
    console.log(`API: Created quiz with ID ${quizId} and ${quiz.questions.length} questions`);
    
    // Supabaseに保存
    console.log('API: Saving quiz to Supabase with data:', {
      id: quizId,
      title,
      difficulty,
      questionsCount: quiz.questions.length,
      sampleQuestion: quiz.questions[0]?.text.substring(0, 50) + '...',
      userId
    });
    await saveQuiz(quiz);
    console.log('API: Quiz saved successfully!');
    
    // 成功レスポンスを返す
    return NextResponse.json(quiz);
  } catch (error) {
    console.error('Error generating quiz:', error);
    
    // エラーオブジェクトの安全な処理
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorCause = error instanceof Error && error.cause ? String(error.cause) : 'unknown';
    
    console.error('Error details:', errorStack);
    
    // エラーレスポンスを返す
    return NextResponse.json(
      { 
        message: 'クイズの生成に失敗しました', 
        error: errorMessage,
        stack: errorStack,
        cause: errorCause 
      }, 
      { status: 500 }
    );
  }
}