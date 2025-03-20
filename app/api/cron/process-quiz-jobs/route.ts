import { NextRequest, NextResponse } from 'next/server';
import { getPendingJobs, updateJobStatus } from '@/lib/jobs';
import { generateQuizWithClaude } from '@/lib/claude';
import { saveQuiz } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// サーバーレス関数としての長時間実行を可能にする
// 注意: これはEdge RuntimeではなくNode.js環境で実行されるため、タイムアウト制限が異なります
export const maxDuration = 300; // 5分の処理時間を許可

/**
 * GET /api/cron/process-quiz-jobs
 * 保留中のクイズ生成ジョブを処理するバックグラウンドジョブ
 * Vercel Cronを使って定期的に呼び出されることを想定
 */
export async function GET(request: NextRequest) {
  console.log('Starting quiz job processing batch');
  
  // 認証チェック - secret headerを要求
  const authHeader = request.headers.get('x-secret-token');
  const configuredSecret = process.env.CRON_SECRET;
  
  if (!configuredSecret || authHeader !== configuredSecret) {
    console.warn('Unauthorized cron job attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // 保留中のジョブを取得 (最大5件)
    const pendingJobs = await getPendingJobs(5);
    console.log(`Found ${pendingJobs.length} pending jobs to process`);
    
    if (pendingJobs.length === 0) {
      return NextResponse.json({ message: 'No pending jobs' });
    }
    
    // 各ジョブを順次処理
    const results = await Promise.all(
      pendingJobs.map(async (job) => {
        console.log(`Processing job ${job.id}`);
        
        try {
          // ジョブを処理中状態に更新
          await updateJobStatus(job.id, 'processing');
          
          // 最適化されたプロンプトを作成
          const optimizedContent = `前回のクイズと似た関連テーマで新しいクイズを作成してください。
元クイズID: ${job.metadata.originalQuizId}
問題数: ${job.metadata.numQuestions}
難易度: ${job.metadata.difficulty}

元の問題からテーマと種類を維持しつつ、新しい問題を生成してください。
回答選択肢は単純かつ簡潔にしてください。
結果をJSON形式で返してください。`;
          
          // Claude AIを使用してクイズデータを生成
          const quizData = await generateQuizWithClaude({
            title: job.metadata.title,
            content: optimizedContent,
            numQuestions: job.metadata.numQuestions,
            difficulty: job.metadata.difficulty
          });
          
          // クイズオブジェクト作成
          const quizId = uuidv4();
          const timestamp = new Date().toISOString();
          
          const quiz = {
            id: quizId,
            title: job.metadata.title,
            difficulty: job.metadata.difficulty,
            questions: quizData.questions,
            created_at: timestamp,
            user_id: job.metadata.userId
          };
          
          // Supabaseに保存
          await saveQuiz(quiz);
          
          // ジョブを完了状態に更新
          await updateJobStatus(job.id, 'completed', { result: quiz });
          
          return {
            jobId: job.id,
            status: 'success',
            quizId: quizId
          };
          
        } catch (error) {
          console.error(`Error processing job ${job.id}:`, error);
          
          // エラーメッセージを安全に取得
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // ジョブを失敗状態に更新
          await updateJobStatus(job.id, 'failed', { error: errorMessage });
          
          return {
            jobId: job.id,
            status: 'error',
            error: errorMessage
          };
        }
      })
    );
    
    // 処理結果を返す
    return NextResponse.json({
      message: `Processed ${results.length} jobs`,
      results
    });
    
  } catch (error) {
    console.error('Error in batch job processing:', error);
    
    // エラーオブジェクトの安全な処理
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    
    // エラーレスポンスを返す
    return NextResponse.json(
      { 
        message: 'バッチ処理に失敗しました', 
        error: errorMessage
      }, 
      { status: 500 }
    );
  }
}
