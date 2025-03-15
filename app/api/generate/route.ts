import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateQuizWithClaude } from '@/lib/claude';
import { saveQuiz } from '@/lib/supabase';
import { QuizGenerationInput } from '@/lib/types';
import { getUserIdOrAnonymousId } from '@/lib/auth';

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
    const { title, content, numQuestions = 5, difficulty = 'medium' }: QuizGenerationInput = body;
    
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
    console.log('API: Saving quiz to Supabase...');
    await saveQuiz(quiz);
    console.log('API: Quiz saved successfully!');
    
    // 成功レスポンスを返す
    return NextResponse.json(quiz);
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    console.error('Error details:', error.stack);
    
    // エラーレスポンスを返す
    return NextResponse.json(
      { 
        message: 'クイズの生成に失敗しました', 
        error: error.message,
        stack: error.stack,
        cause: error.cause ? String(error.cause) : 'unknown' 
      }, 
      { status: 500 }
    );
  }
}