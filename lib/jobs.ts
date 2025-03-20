import { createClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { Quiz } from './types';

// ジョブステータスの型定義
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ジョブデータの型定義
export interface JobData {
  id: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  result?: Quiz;
  error?: string;
  metadata: {
    originalQuizId: string;
    title: string;
    numQuestions: number;
    difficulty: string;
    userId: string;
  };
}

/**
 * 新しいジョブを作成する
 */
export async function createJob(metadata: {
  originalQuizId: string;
  title: string;
  numQuestions: number;
  difficulty: string;
  userId: string;
}): Promise<string> {
  const supabase = createClient();
  
  const jobId = uuidv4();
  const now = new Date().toISOString();
  
  const jobData: JobData = {
    id: jobId,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    metadata
  };
  
  // ジョブをSupabaseに保存
  const { error } = await supabase
    .from('quiz_generation_jobs')
    .insert(jobData);
  
  if (error) {
    console.error('ジョブ作成エラー:', error);
    throw new Error('ジョブの作成に失敗しました: ' + error.message);
  }
  
  return jobId;
}

/**
 * ジョブのステータスを更新する
 */
export async function updateJobStatus(
  jobId: string, 
  status: JobStatus, 
  data?: { result?: Quiz; error?: string }
): Promise<void> {
  const supabase = createClient();
  
  const updateData: Partial<JobData> = {
    status,
    updatedAt: new Date().toISOString(),
    ...data
  };
  
  const { error } = await supabase
    .from('quiz_generation_jobs')
    .update(updateData)
    .eq('id', jobId);
  
  if (error) {
    console.error('ジョブステータス更新エラー:', error);
    throw new Error('ジョブステータスの更新に失敗しました: ' + error.message);
  }
}

/**
 * ジョブの詳細を取得する
 */
export async function getJob(jobId: string): Promise<JobData | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('quiz_generation_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  if (error) {
    console.error('ジョブ取得エラー:', error);
    throw new Error('ジョブの取得に失敗しました: ' + error.message);
  }
  
  return data as JobData;
}

/**
 * 処理待ちのジョブを取得する
 */
export async function getPendingJobs(limit: number = 5): Promise<JobData[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('quiz_generation_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('createdAt', { ascending: true })
    .limit(limit);
  
  if (error) {
    console.error('保留中ジョブ取得エラー:', error);
    throw new Error('保留中ジョブの取得に失敗しました: ' + error.message);
  }
  
  return data as JobData[];
}
