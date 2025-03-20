import { NextRequest, NextResponse } from 'next/server';
import { createJob, Difficulty } from '@/lib/jobs';
import { Quiz } from '@/lib/types';
import { getUserIdOrAnonymousId } from '@/lib/auth';

// 動的ルーティングを有効化
export const dynamic = 'force-dynamic';

// Edgeランタイムは不要です、Node.jsランタイムを使用
// export const runtime = 'edge';

/**
 * POST /api/quiz-jobs
 * 似たようなクイズ生成ジョブを開始するAPI
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディからパラメータを取得
    console.log('API: Received quiz job creation request');
    
    // リクエストボディの解析をtry-catchで保護
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Request body parse error:', parseError);
      return NextResponse.json(
        { message: '無効なリクエスト形式です' },
        { status: 400 }
      );
    }
    
    const { title, numQuestions = 5, difficulty = 'medium', originalQuiz } = body;
    
    // 難易度を正しい型に変換
    const validatedDifficulty: Difficulty = ['easy', 'medium', 'hard'].includes(difficulty) 
      ? difficulty as Difficulty 
      : 'medium';
    
    // 入力検証
    if (!title || !originalQuiz) {
      console.log('API: Missing required fields');
      return NextResponse.json(
        { message: 'タイトルと元クイズは必須です' }, 
        { status: 400 }
      );
    }
    
    // ユーザーIDを直接取得する方式に変更、URL解析は避ける
    const userId = await getUserIdOrAnonymousId();
    console.log('Using user ID:', userId);
    
    // ジョブメタデータを準備
    const jobMetadata = {
      originalQuizId: originalQuiz.id,
      title,
      numQuestions,
      difficulty: validatedDifficulty,
      userId
    };
    
    // ジョブを作成
    console.log('API: Creating similar quiz generation job with metadata:', jobMetadata);
    const jobId = await createJob(jobMetadata);
    
    // 処理開始を示すレスポンスを即時に返す
    return NextResponse.json({
      message: '似たようなクイズ生成ジョブが登録されました',
      jobId,
      status: 'pending',
      estimatedTime: '30-60秒'
    });
    
  } catch (error) {
    console.error('Error creating quiz job:', error);
    
    // エラーを詳細にログ出力
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
    }
    
    // エラーオブジェクトの安全な処理
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    
    // エラーレスポンスを返す
    return NextResponse.json(
      { 
        message: 'クイズ生成ジョブの作成に失敗しました', 
        error: errorMessage
      }, 
      { status: 500 }
    );
  }
}
