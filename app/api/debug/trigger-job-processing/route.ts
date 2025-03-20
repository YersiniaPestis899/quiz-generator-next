import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/debug/trigger-job-processing
 * 開発環境用: バックグラウンドジョブ処理を手動でトリガーするAPI
 * 注: 本番環境では無効化すべきです
 */
export async function GET(request: NextRequest) {
  // 開発環境でのみ使用可能
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      error: 'This endpoint is only available in development mode'
    }, { status: 403 });
  }
  
  try {
    console.log('Manually triggering job processing');
    
    // ジョブ処理エンドポイントを呼び出す
    const response = await fetch(new URL('/api/cron/process-quiz-jobs', request.url).toString(), {
      headers: {
        'x-secret-token': process.env.CRON_SECRET || 'dev-secret'
      }
    });
    
    const result = await response.json();
    
    return NextResponse.json({
      message: 'Triggered job processing',
      result
    });
    
  } catch (error) {
    console.error('Error triggering job processing:', error);
    
    // エラーオブジェクトの安全な処理
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    
    // エラーレスポンスを返す
    return NextResponse.json(
      { 
        message: 'ジョブ処理のトリガーに失敗しました', 
        error: errorMessage
      }, 
      { status: 500 }
    );
  }
}
