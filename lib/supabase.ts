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
 * @param quiz - 保存するクイズオブジェクト
 */
export async function saveQuiz(quiz: Quiz) {
  try {
    // ユーザーIDを取得
    const userId = await getUserIdOrAnonymousId();
    
    // クイズオブジェクトにユーザーIDを追加
    const quizWithUserId = {
      ...quiz,
      user_id: userId
    };
    
    console.log('Saving quiz to Supabase:', { id: quiz.id, title: quiz.title });
    
    // まずローカルストレージに保存（フォールバックとして）
    saveQuizToLocalStorage(quizWithUserId);
    
    const { data, error } = await supabase
      .from('quizzes')
      .insert([quizWithUserId])
      .select()
      .single();
    
    if (error) {
      console.error('Error saving quiz to Supabase:', error);
      
      // エラー発生時はインメモリストレージに保存
      inMemoryQuizzes.push(quizWithUserId);
      console.log('Saved quiz to in-memory storage as fallback');
      
      // UIにはエラーを表示せずクイズデータを返す
      return quizWithUserId;
    }
    
    console.log('Quiz saved successfully to Supabase:', data);
    return data;
  } catch (error) {
    console.error('Exception saving quiz:', error);
    
    // 例外発生時もインメモリストレージに保存
    inMemoryQuizzes.push({
      ...quiz,
      user_id: await getUserIdOrAnonymousId()
    });
    
    return quiz;
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
    
    // これが認証済みユーザーか判断
    const isAuthenticated = currentUserId && !currentUserId.startsWith('anon_');
    console.log(`ユーザー認証状態: ${isAuthenticated ? '認証済み' : '匿名'}`)
    
    try {
      // ユーザーのクイズを取得する基本クエリ
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      const supabaseQuizzes = data || [];
      console.log(`ユーザー ${currentUserId} のクイズを ${supabaseQuizzes.length} 件取得しました`);
      
      // 認証済みユーザーの場合、以前の匿名IDのクイズも取得
      let additionalQuizzes: Quiz[] = [];
      if (isAuthenticated && typeof window !== 'undefined') {
        try {
          // 古い匿名IDをローカルストレージから取得
          const oldAnonymousId = localStorage.getItem('old_anonymous_id');
          if (oldAnonymousId && oldAnonymousId.startsWith('anon_')) {
            console.log('古い匿名IDでのクイズも取得:', oldAnonymousId);
            const { data: anonData } = await supabase
              .from('quizzes')
              .select('*')
              .eq('user_id', oldAnonymousId);
              
            if (anonData && anonData.length > 0) {
              console.log(`古い匿名IDから ${anonData.length} 件のクイズを取得`);
              additionalQuizzes = anonData;
            }
          }
        } catch (e) {
          console.error('追加クイズ取得エラー:', e);
        }
      }
      
      // ローカルストレージからも取得
      const localQuizzes = getQuizzesFromLocalStorage()
        .filter(q => q.user_id === currentUserId);
      
      // Supabaseから取得したクイズとローカルクイズとインメモリクイズを結合
      const allQuizzes = [
        ...supabaseQuizzes, 
        ...additionalQuizzes,
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
      
      console.log(`合計 ${uniqueQuizzes.length} 件のクイズを返却`)
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

/**
 * 他のユーザーが作成したコミュニティクイズを取得する関数
 * @param titleSearch - タイトル検索キーワード（オプション）
 */
export async function getCommunityQuizzes(titleSearch?: string): Promise<Quiz[]> {
  try {
    console.log('コミュニティクイズを取得します', titleSearch ? `検索語: ${titleSearch}` : '');
    
    // 現在のユーザーIDを取得（自分以外のクイズを取得するため）
    const currentUserId = await getUserIdOrAnonymousId();
    
    // クエリの構築
    let query = supabase
      .from('quizzes')
      .select('*')
      .neq('user_id', currentUserId) // 自分以外のクイズ
      .not('user_id', 'like', 'anon_%'); // 匿名ユーザーのクイズは除外
      
    // 検索条件があれば追加
    if (titleSearch && titleSearch.trim() !== '') {
      query = query.ilike('title', `%${titleSearch}%`);
    }
    
    // 日付の降順でソート
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('コミュニティクイズ取得エラー:', error);
      return [];
    }
    
    console.log(`${data?.length || 0} 件のコミュニティクイズを取得しました`);
    return data || [];
  } catch (error) {
    console.error('getCommunityQuizzes関数エラー:', error);
    return [];
  }
}

/**
 * 自分のクイズをタイトルで検索する関数
 * @param titleSearch - タイトル検索キーワード
 * @param userId - 検索対象ユーザーID（指定がない場合は現在のユーザー）
 */
export async function searchMyQuizzes(titleSearch: string, userId?: string): Promise<Quiz[]> {
  try {
    // 検索するユーザーIDを決定
    const searchUserId = userId || await getUserIdOrAnonymousId();
    console.log(`ユーザー ${searchUserId} のクイズを「${titleSearch}」で検索`);
    
    if (!titleSearch || titleSearch.trim() === '') {
      console.log('検索キーワードが空のため、通常のクイズ一覧を返します');
      return getQuizzes(searchUserId);
    }
    
    // Supabaseでの検索
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('user_id', searchUserId)
      .ilike('title', `%${titleSearch}%`)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('クイズ検索エラー:', error);
      
      // エラー時はローカルストレージとインメモリから検索
      const localQuizzes = getQuizzesFromLocalStorage().filter(q => 
        q.user_id === searchUserId && 
        q.title.toLowerCase().includes(titleSearch.toLowerCase())
      );
      
      const memoryQuizzes = inMemoryQuizzes.filter(q => 
        q.user_id === searchUserId &&
        q.title.toLowerCase().includes(titleSearch.toLowerCase())
      );
      
      // 重複除去と日付ソート
      const allQuizzes = [...localQuizzes, ...memoryQuizzes];
      const uniqueQuizzes = allQuizzes.filter((quiz, index, self) => 
        index === self.findIndex(q => q.id === quiz.id)
      );
      
      uniqueQuizzes.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log(`ローカルとメモリから ${uniqueQuizzes.length} 件の検索結果を返します`);
      return uniqueQuizzes;
    }
    
    console.log(`"${titleSearch}" に一致する ${data?.length || 0} 件のクイズを取得しました`);
    return data || [];
  } catch (error) {
    console.error('searchMyQuizzes関数エラー:', error);
    return [];
  }
}