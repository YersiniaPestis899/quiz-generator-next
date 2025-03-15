/**
 * クイズ生成入力パラメータの型定義
 */
export interface QuizGenerationInput {
  title: string;
  content: string;
  numQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * 回答オプションの型定義
 */
export interface Answer {
  id: string;
  text: string;
}

/**
 * 質問の型定義
 */
export interface Question {
  id: string;
  text: string;
  answers: Answer[];
  correctAnswerId: string;
  explanation: string;
}

/**
 * クイズの型定義
 */
export interface Quiz {
  id: string;
  title: string;
  difficulty: string;
  questions: Question[];
  created_at?: string;
  user_id?: string; // ユーザーID（認証済みまたは匿名）を追加
}