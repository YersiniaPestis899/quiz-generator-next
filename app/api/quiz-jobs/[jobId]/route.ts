import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs';

// Edge Runtime を有効化
export const runtime = 'edge';

/**
 * GET /api/quiz-jobs/[jobId]
 * クイズ生成ジョブのステータスを取得するAPI
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    
    if (!jobId) {
      return NextResponse.json(
        { message: 'ジョブIDが指定されていません' },
        { status: 400 }
      );
    }
    
    console.log(`API: Fetching status for job ${jobId}`);
    
    // ジョブデータの取得
    const jobData = await getJob(jobId);
    
    if (!jobData) {
      return NextResponse.json(
        { message: '指定されたジョブが見つかりません' },
        { status: 404 }
      );
    }
    
    // ジョブステータスに応じたレスポンスの構築
    const response: any = {
      jobId: jobData.id,
      status: jobData.status,
      createdAt: jobData.createdAt,
      updatedAt: jobData.updatedAt
    };
    
    // 完了したジョブの場合は結果を含める
    if (jobData.status === 'completed' && jobData.result) {
      response.result = jobData.result;
    }
    
    // 失敗したジョブの場合はエラー情報を含める
    if (jobData.status === 'failed' && jobData.error) {
      response.error = jobData.error;
    }
    
    // 進行中の場合は推定残り時間を含める
    if (jobData.status === 'pending' || jobData.status === 'processing') {
      const elapsedTime = new Date().getTime() - new Date(jobData.createdAt).getTime();
      const estimatedTimeMs = 45000; // 平均45秒と仮定
      const remainingTime = Math.max(0, estimatedTimeMs - elapsedTime);
      
      response.progress = {
        elapsedSeconds: Math.floor(elapsedTime / 1000),
        estimatedRemainingSeconds: Math.floor(remainingTime / 1000)
      };
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching job status:', error);
    
    // エラーオブジェクトの安全な処理
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    
    // エラーレスポンスを返す
    return NextResponse.json(
      { 
        message: 'ジョブ情報の取得に失敗しました', 
        error: errorMessage
      }, 
      { status: 500 }
    );
  }
}
