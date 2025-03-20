import { NextRequest, NextResponse } from 'next/server';
import { createJob } from '@/lib/jobs';
import { Quiz } from '@/lib/types';
import { getUserIdOrAnonymousId } from '@/lib/auth';

// 即時応答を返すためEdge関数の実行環境を指定
export const runtime = 'edge';

/**
 * POST /api/quiz-jobs
 * 似たようなクイズ生成ジョブを開始するAPI
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディからパラメータを取得
    console.log('API: Received quiz job creation request');
    const body = await request.json();
    const { title, numQuestions = 5, difficulty = 'medium', originalQuiz } = body;
    
    // 入力検証
    if (!title || !originalQuiz) {
      console.log('API: Missing required fields');
      return NextResponse.json(
        { message: 'タイトルと元クイズは必須です' }, 
        { status: 400 }
      );
    }
    
    // URLからユーザーの匿名IDを抽出
    const url = new URL(request.url);
    const anonymousId = url.searchParams.get('anonymousId');
    
    // 現在のユーザーIDを取得
    const userId = anonymousId || await getUserIdOrAnonymousId();
    
    // ジョブメタデータを準備
    const jobMetadata = {
      originalQuizId: originalQuiz.id,
      title,
      numQuestions,
      difficulty,
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
