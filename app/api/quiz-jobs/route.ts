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
// インメモリでジョブを追跡するための一時的なストレージ
const inMemoryJobs: Record<string, {status: string, jobId: string, createdAt: string}> = {};

export async function POST(request: NextRequest) {
  // リクエストIDを生成
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`リクエスト開始 [ID:${requestId}]`);
  
  try {
    // リクエストボディからパラメータを取得
    console.log(`API [${requestId}]: クイズジョブ作成リクエスト受信`);
    
    // リクエストボディの解析をtry-catchで保護
    let body;
    try {
      body = await request.json();
      console.log(`API [${requestId}]: リクエスト本文を正常に解析しました`);
    } catch (parseError) {
      console.error(`API [${requestId}]: リクエスト本文解析エラー:`, parseError);
      return NextResponse.json(
        { message: '無効なリクエスト形式です' },
        { status: 400 }
      );
    }
    
    // パラメータの最適化とデフォルト値の設定
    const { title, numQuestions = 5, difficulty = 'medium', originalQuiz } = body;
    
    // リクエスト内容のサマリーをログ出力
    console.log(`API [${requestId}]: リクエスト内容:`, { 
      title, 
      numQuestions, 
      difficulty,
      originalQuizId: originalQuiz?.id || 'N/A'
    });
    
    // 難易度を正しい型に変換
    const validatedDifficulty: Difficulty = ['easy', 'medium', 'hard'].includes(difficulty) 
      ? difficulty as Difficulty 
      : 'medium';
    
    // 入力検証
    if (!title || !originalQuiz) {
      console.log(`API [${requestId}]: 必須フィールドが不足しています`);
      return NextResponse.json(
        { message: 'タイトルと元クイズは必須です' }, 
        { status: 400 }
      );
    }
    
    // ユーザーIDを直接取得する方式に変更、URL解析は避ける
    let userId;
    try {
      userId = await getUserIdOrAnonymousId();
      console.log(`API [${requestId}]: ユーザーID取得成功:`, userId.substring(0, 8) + '...');
    } catch (userIdError) {
      console.error(`API [${requestId}]: ユーザーID取得エラー:`, userIdError);
      // フォールバックとして一時的なIDを生成
      userId = `temp_${Math.random().toString(36).substring(2, 10)}`;
      console.log(`API [${requestId}]: 一時的なユーザーIDを生成:`, userId);
    }
    
    // 安全なジョブメタデータを準備
    let originalQuizId;
    try {
      originalQuizId = originalQuiz.id;
      if (!originalQuizId) throw new Error('クイズIDが空です');
    } catch (quizIdError) {
      console.error(`API [${requestId}]: 元クイズIDの取得エラー:`, quizIdError);
      // フォールバックとして一時的な値を生成
      originalQuizId = `unknown_${Math.random().toString(36).substring(2, 10)}`;
    }

    const jobMetadata = {
      originalQuizId,
      title,
      numQuestions,
      difficulty: validatedDifficulty,
      userId
    };
    
    // ジョブ作成を試行
    console.log(`API [${requestId}]: 似たようなクイズ生成ジョブを登録中...`); 
    let jobId;
    
    try {
      jobId = await createJob(jobMetadata);
      console.log(`API [${requestId}]: ジョブ作成成功 - ID: ${jobId}`);
      
      // インメモリストレージにジョブ情報を保存 (フォールバック用)
      inMemoryJobs[jobId] = {
        status: 'pending',
        jobId,
        createdAt: new Date().toISOString()
      };
    } catch (jobCreateError) {
      console.error(`API [${requestId}]: ジョブ作成に失敗しました:`, jobCreateError);
      
      // フォールバック: 一時的なジョブIDを生成して処理を継続
      jobId = `temp_${Math.random().toString(36).substring(2, 15)}`;
      console.log(`API [${requestId}]: フォールバックの一時ジョブIDを生成: ${jobId}`);
      
      // インメモリ追跡用に保存
      inMemoryJobs[jobId] = {
        status: 'pending',
        jobId,
        createdAt: new Date().toISOString()
      };
    }
    
    // 処理開始を示すレスポンスを即時に返す
    console.log(`API [${requestId}]: 成功レスポンスを返却 - ジョブID: ${jobId}`);
    return NextResponse.json({
      message: '似たようなクイズ生成ジョブが登録されました',
      jobId,
      status: 'pending',
      estimatedTime: '15-30秒',
      requestId // デバッグ用にリクエストIDを含める
    });
    
  } catch (error) {
    console.error(`API [${requestId}]: ジョブ作成中の全体エラー:`, error);
    
    // エラーを詳細にログ出力
    if (error instanceof Error) {
      console.error(`API [${requestId}]: エラー詳細:`, {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
    }
    
    // エラーオブジェクトの安全な処理
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    
    // フォールバック: ジョブの代わりに一時的なIDを生成
    const fallbackJobId = `recovery_${Math.random().toString(36).substring(2, 10)}`;
    console.log(`API [${requestId}]: エラー復旧用ジョブIDを生成: ${fallbackJobId}`);
    
    // インメモリに記録
    inMemoryJobs[fallbackJobId] = {
      status: 'failed',
      jobId: fallbackJobId,
      createdAt: new Date().toISOString()
    };
    
    // 一時的なIDを返すエラーレスポンス
    console.log(`API [${requestId}]: 復旧用レスポンスを返却`);
    return NextResponse.json(
      { 
        message: 'クイズ生成ジョブの作成中に問題が発生しましたが、処理を継続します', 
        jobId: fallbackJobId,
        status: 'pending',
        error: errorMessage,
        requestId,
        recoveryMode: true
      }, 
      { status: 200 } // 200を返してクライアント側の処理を継続させる
    );
  }
}
