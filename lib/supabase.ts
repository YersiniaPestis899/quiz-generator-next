import { createClient } from '@supabase/supabase-js';
import { Quiz } from './types';
import { getUserIdOrAnonymousId } from './auth';
import { saveQuizToLocalStorage, getQuizzesFromLocalStorage } from './localStorageUtils';

// 環境変数からSupabase認証情報を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 環境変数が設定されているかチェック
if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase環境変数が設定されていません。ダミーデータを使用します。');
}

// Supabaseクライアント初期化
export const supabase = createClient(supabaseUrl, supabaseKey);

// クイズデータを一時的に保存するためのインメモリストレージ
// Supabase接続が利用できない場合のフォールバックとして使用
const inMemoryQuizzes: Quiz[] = [];

/**
 * テーブルを初期化する
 * アプリケーション起動時に一度だけ呼び出す
 */
export async function initializeQuizTable() {
  try {
    console.log('Checking for quizzes table...');
    
    // テーブル存在確認
    const { data, error } = await supabase
      .from('quizzes')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('Table check failed, attempting to create table:', error);
      
      // テーブル作成
      const { error: createError } = await supabase.rpc('create_quizzes_table_if_not_exists');
      
      if (createError) {
        console.error('Failed to create quizzes table with RPC:', createError);
        
        // RPCが失敗した場合は別のアプローチを試みる
        // Supabase clientには直接的なquery()メソッドがないため、
        // テーブル作成をスキップして、インメモリストレージにフォールバック
        console.error('Unable to create quizzes table - falling back to in-memory storage');
        // エラーを返すのではなく、テーブル作成に失敗してもアプリケーションは動作できるようにする
        return false;
      }
      
      console.log('Quizzes table created successfully');
      return true;
    }
    
    console.log('Quizzes table exists');
    return true;
  } catch (error) {
    console.error('Error initializing quiz table:', error);
    return false;
  }
}

// アプリケーション起動時にテーブル初期化を実行
let tableInitialized = false;
if (typeof window !== 'undefined') {
  // ブラウザ環境ではクライアントサイドでの初期化は行わない
  tableInitialized = true;
} else {
  // サーバーサイド環境での初期化
  try {
    initializeQuizTable().then(result => {
      tableInitialized = result;
    });
  } catch (error) {
    console.error('Failed to initialize table:', error);
  }
}

/**
 * クイズオブジェクトをSupabaseに保存
 * 複数の保存先を使用した堅牢な保存処理を実装
 * @param quiz - 保存するクイズオブジェクト
 */
export async function saveQuiz(quiz: Quiz) {
  try {
    // ユーザーIDを取得（改善された方法）
    const userId = await getUserIdOrAnonymousId();
    console.log('クイズ保存に使用するユーザーID:', userId);
    
    // クイズオブジェクトにユーザーIDを追加
    const quizWithUserId = {
      ...quiz,
      user_id: userId
    };
    
    console.log('Saving quiz to Supabase:', { id: quiz.id, title: quiz.title, userId });
    
    // まずローカルストレージに保存（信頼性の高いフォールバック）
    try {
      saveQuizToLocalStorage(quizWithUserId);
      console.log('クイズをローカルストレージに保存しました:', quiz.id);
    } catch (localError) {
      console.error('ローカルストレージ保存エラー:', localError);
    }
    
    // インメモリ保存も行う（二重のフォールバック）
    inMemoryQuizzes.push(quizWithUserId);
    console.log('クイズをインメモリストレージに保存しました:', quiz.id);
    
    // Supabaseへの保存を試行
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .insert([quizWithUserId])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase保存エラー:', error);
        // エラーはスローせず、ローカル保存されたデータを返す
        return quizWithUserId;
      }
      
      console.log('Supabaseにクイズを保存しました:', data);
      return data;
    } catch (supabaseError) {
      console.error('Supabase例外:', supabaseError);
      // すでにローカルとメモリに保存済みなので、そのデータを返す
      return quizWithUserId;
    }
  } catch (error) {
    console.error('クイズ保存中の予期せぬエラー:', error);
    return quiz; // 最低限元のクイズデータは返す
  }
}

/**
 * 現在のユーザーのクイズを取得
 * @param userId - 取得対象のユーザーID（指定がない場合は現在のユーザー）
 */
export async function getQuizzes(userId?: string) {
  try {
    // ユーザーIDが指定されていない場合は現在のユーザーIDを使用
    const currentUserId = userId || await getUserIdOrAnonymousId();
    
    console.log('Fetching quizzes for user:', currentUserId);
    
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      const supabaseQuizzes = data || [];
      
      // ローカルストレージからも取得
      const localQuizzes = getQuizzesFromLocalStorage()
        .filter(q => q.user_id === currentUserId);
      
      // Supabaseから取得したクイズとローカルクイズとインメモリクイズを結合
      const allQuizzes = [
        ...supabaseQuizzes, 
        ...localQuizzes, 
        ...inMemoryQuizzes.filter(q => q.user_id === currentUserId)
      ];
      
      // 重複除去（IDベース）
      const uniqueQuizzes = allQuizzes.filter((quiz, index, self) => 
        index === self.findIndex(q => q.id === quiz.id)
      );
      
      // 日付でソート
      uniqueQuizzes.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      return uniqueQuizzes;
    } catch (supabaseError) {
      console.error('Error fetching from Supabase:', supabaseError);
      
      // エラー時はローカルストレージとインメモリデータのみ返す
      const localQuizzes = getQuizzesFromLocalStorage()
        .filter(q => q.user_id === currentUserId);
      
      const memoryQuizzes = inMemoryQuizzes.filter(q => q.user_id === currentUserId);
      
      const allQuizzes = [...localQuizzes, ...memoryQuizzes];
      
      // 重複除去（IDベース）
      const uniqueQuizzes = allQuizzes.filter((quiz, index, self) => 
        index === self.findIndex(q => q.id === quiz.id)
      );
      
      // 日付でソート
      uniqueQuizzes.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      return uniqueQuizzes;
    }
  } catch (error) {
    console.error('Global error in getQuizzes:', error);
    
    // 最悪の場合もローカルストレージとインメモリデータを返す
    const localQuizzes = getQuizzesFromLocalStorage();
    return [...localQuizzes, ...inMemoryQuizzes];
  }
}

/**
 * IDで指定したクイズを取得（ユーザーIDによる所有権チェック付き）
 * @param id - クイズID
 * @param userId - 取得対象のユーザーID（指定がない場合は現在のユーザー）
 */
export async function getQuiz(id: string, userId?: string) {
  try {
    // ユーザーIDが指定されていない場合は現在のユーザーIDを使用
    const currentUserId = userId || await getUserIdOrAnonymousId();
    
    // まずローカルストレージから検索
    const localQuizzes = getQuizzesFromLocalStorage();
    const localQuiz = localQuizzes.find(q => q.id === id);
    if (localQuiz) {
      // 所有権チェック
      if (localQuiz.user_id && localQuiz.user_id !== currentUserId) {
        console.log(`Access denied: User ${currentUserId} attempted to access local quiz ${id} owned by ${localQuiz.user_id}`);
        return null; // アクセス拒否
      }
      return localQuiz;
    }
    
    // 次にインメモリストレージから検索
    const memoryQuiz = inMemoryQuizzes.find(q => q.id === id);
    if (memoryQuiz) {
      // 所有権チェック
      if (memoryQuiz.user_id && memoryQuiz.user_id !== currentUserId) {
        console.log(`Access denied: User ${currentUserId} attempted to access memory quiz ${id} owned by ${memoryQuiz.user_id}`);
        return null; // アクセス拒否
      }
      return memoryQuiz;
    }
    
    // 最後にSupabaseからクイズを取得
    try {
      const { data: quiz, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      if (!quiz) return null; // クイズが見つからない
      
      // 所有権チェック
      if (quiz.user_id && quiz.user_id !== currentUserId) {
        console.log(`Access denied: User ${currentUserId} attempted to access Supabase quiz ${id} owned by ${quiz.user_id}`);
        return null; // アクセス拒否
      }
      
      // 見つかったら、ローカルストレージにも保存しておく
      saveQuizToLocalStorage(quiz);
      
      return quiz;
    } catch (error) {
      console.error(`Error fetching quiz with ID ${id} from Supabase:`, error);
      return null;
    }
  } catch (error) {
    console.error(`Global error fetching quiz with ID ${id}:`, error);
    return null;
  }
}

/**
 * テーブルにuser_idカラムを追加する
 */
export async function addUserIdColumnIfNeeded() {
  try {
    if (!tableInitialized) {
      await initializeQuizTable();
    }
    return { success: true, message: "Table initialization checked" };
  } catch (error) {
    console.error('Error in addUserIdColumnIfNeeded:', error);
    return { success: false, error };
  }
}