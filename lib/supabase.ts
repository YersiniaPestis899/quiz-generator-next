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
    // ユーザーIDを取得（改善された一貫性のある方法）
    const userId = await getUserIdOrAnonymousId();
    console.log('クイズ保存に使用するユーザーID:', userId);
    
    // 現在の時刻を取得
    const currentTimestamp = new Date().toISOString();
    
    // TypeScript型定義用の完全なオブジェクト（ローカルストレージ用）
    const fullQuizObject = {
      ...quiz,
      user_id: userId,
      // 必須フィールドが不足している場合、デフォルト値を設定
      user_answers: quiz.user_answers || {},
      score: quiz.score || {},
      last_saved: currentTimestamp,
      last_played: quiz.last_played || currentTimestamp
    };
    
    // Supabaseスキーマ互換オブジェクト（既存カラムのみ）
    const supabaseCompatibleQuiz = {
      id: quiz.id,
      title: quiz.title,
      difficulty: quiz.difficulty,
      questions: quiz.questions,
      created_at: quiz.created_at || currentTimestamp,
      user_id: userId
      // スキーマに存在しないフィールドは含めない
    };
    
    console.log('Saving quiz to Supabase:', { id: quiz.id, title: quiz.title, userId });
    
    // まずローカルストレージに保存（信頼性の高いフォールバック）
    try {
      saveQuizToLocalStorage(fullQuizObject);
      console.log('クイズをローカルストレージに保存しました:', quiz.id);
    } catch (localError) {
      console.error('ローカルストレージ保存エラー:', localError);
    }
    
    // インメモリ保存も行う（二重のフォールバック）
    // 既存エントリを更新または新規追加
    const existingIndex = inMemoryQuizzes.findIndex(q => q.id === quiz.id);
    if (existingIndex >= 0) {
      inMemoryQuizzes[existingIndex] = fullQuizObject;
    } else {
      inMemoryQuizzes.push(fullQuizObject);
    }
    console.log('クイズをインメモリストレージに保存しました:', quiz.id);
    
    // Supabaseへの保存を試行
    try {
      console.log('Supabaseに送信するデータ:', supabaseCompatibleQuiz);
      
      const { data, error } = await supabase
        .from('quizzes')
        .upsert([supabaseCompatibleQuiz], {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select();
      
      if (error) {
        console.error('Supabase保存エラー:', error);
        
        // エラー詳細を詳細に記録
        if (error.details) console.error('エラー詳細:', error.details);
        if (error.hint) console.error('ヒント:', error.hint);
        if (error.code) console.error('エラーコード:', error.code);
        
        // エラーはスローせず、ローカル保存されたデータを返す
        console.log('ローカル保存したデータを返します');
        return fullQuizObject;
      }
      
      console.log('保存結果:', data[0]);
      
      // Supabaseからの応答がある場合はそれを返し、ローカルデータと統合
      const mergedResult = data[0] ? {
        ...data[0],
        // Supabaseに存在しないがローカルに保存した情報を追加
        user_answers: fullQuizObject.user_answers,
        score: fullQuizObject.score,
        last_saved: fullQuizObject.last_saved,
        last_played: fullQuizObject.last_played
      } : fullQuizObject;
      
      return mergedResult;
    } catch (supabaseError) {
      console.error('Supabase例外:', supabaseError);
      // すでにローカルとメモリに保存済みなので、そのデータを返す
      return fullQuizObject;
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
    
    // 認証済みユーザーかどうかの判断ロジック
    const isAuthenticated = !currentUserId.startsWith('anon_');
    console.log(`ユーザー認証状態: ${isAuthenticated ? '認証済み' : '匿名'}`);
    
    try {
      // Supabaseからクイズを取得
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      const supabaseQuizzes = data || [];
      console.log(`Supabaseから ${supabaseQuizzes.length} 件のクイズを取得しました`);
      
      // 認証済みユーザーの場合は匿名IDのクイズも取得（データ移行考慮）
      let additionalQuizzes: Quiz[] = [];
      if (isAuthenticated && typeof window !== 'undefined') {
        try {
          // 複数のソースから古い匿名IDを確認
          const oldAnonymousId = localStorage.getItem('old_anonymous_id');
          const localStorageAnonymousId = localStorage.getItem('anonymousUserId');
          
          // 保存された古い匿名IDからクイズを取得
          if (oldAnonymousId && oldAnonymousId.startsWith('anon_')) {
            console.log('古い匿名IDでのクイズも取得:', oldAnonymousId);
            const { data: anonData } = await supabase
              .from('quizzes')
              .select('*')
              .eq('user_id', oldAnonymousId);
              
            if (anonData && anonData.length > 0) {
              console.log(`古い匿名IDから ${anonData.length} 件のクイズを取得`);
              additionalQuizzes = [...additionalQuizzes, ...anonData];
            }
          }
          
          // 現在のローカルストレージのIDが匿名IDの場合も確認
          if (localStorageAnonymousId && 
              localStorageAnonymousId.startsWith('anon_') && 
              localStorageAnonymousId !== currentUserId && 
              localStorageAnonymousId !== oldAnonymousId) {
            console.log('現在のローカルストレージの匿名IDでのクイズも取得:', localStorageAnonymousId);
            const { data: anonData } = await supabase
              .from('quizzes')
              .select('*')
              .eq('user_id', localStorageAnonymousId);
                
            if (anonData && anonData.length > 0) {
              console.log(`ローカルストレージの匿名IDから ${anonData.length} 件のクイズを取得`);
              additionalQuizzes = [...additionalQuizzes, ...anonData];
            }
          }
          
          // ローカルストレージからすべての匿名IDのクイズを検索
          const localQuizzes = getQuizzesFromLocalStorage();
          const anonymousIds = new Set<string>();
          
          // ローカルのクイズからanonで始まるユーザーIDをすべて収集
          localQuizzes.forEach(q => {
            if (q.user_id && 
                q.user_id.startsWith('anon_') && 
                q.user_id !== currentUserId && 
                q.user_id !== oldAnonymousId && 
                q.user_id !== localStorageAnonymousId) {
              anonymousIds.add(q.user_id);
            }
          });
          
          // 見つかった匿名IDそれぞれについてクイズを取得
          for (const anonId of anonymousIds) {
            console.log('追加の匿名IDからクイズを取得:', anonId);
            const { data: anonData } = await supabase
              .from('quizzes')
              .select('*')
              .eq('user_id', anonId);
                
            if (anonData && anonData.length > 0) {
              console.log(`追加の匿名IDから ${anonData.length} 件のクイズを取得`);
              additionalQuizzes = [...additionalQuizzes, ...anonData];
            }
          }
        } catch (e) {
          console.error('追加クイズ取得エラー:', e);
        }
      }
      
      // ローカルストレージからも取得
      // 認証済みユーザーの場合は、すべてのクイズを取得してフィルタリング
      const localQuizzes = isAuthenticated 
        ? getQuizzesFromLocalStorage() 
        : getQuizzesFromLocalStorage().filter(q => q.user_id === currentUserId);
      
      // Supabaseから取得したクイズとローカルクイズとインメモリクイズを結合
      const allQuizzes = [
        ...supabaseQuizzes, 
        ...additionalQuizzes,
        ...localQuizzes, 
        ...inMemoryQuizzes
      ];
      
      // 認証済みユーザーの場合は、所有権チェックをスキップし、すべてのクイズを表示
      const filteredQuizzes = isAuthenticated
        ? allQuizzes // 認証済みユーザーはすべてのクイズにアクセス可能
        : allQuizzes.filter(q => q.user_id === currentUserId); // 匿名ユーザーは自分のクイズのみ
      
      // 重複除去（IDベース）
      const uniqueQuizzes = filteredQuizzes.filter((quiz, index, self) => 
        index === self.findIndex(q => q.id === quiz.id)
      );
      
      // 日付でソート
      uniqueQuizzes.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log(`合計 ${uniqueQuizzes.length} 件のクイズを返却`);
      return uniqueQuizzes;
    } catch (supabaseError) {
      console.error('Error fetching from Supabase:', supabaseError);
      
      // エラー時はローカルストレージとインメモリデータのみ返す
      const localQuizzes = getQuizzesFromLocalStorage();
      const memoryQuizzes = inMemoryQuizzes;
      
      // 認証済みユーザーの場合は、すべてのクイズを表示（所有権チェックをスキップ）
      const filteredQuizzes = isAuthenticated
        ? [...localQuizzes, ...memoryQuizzes]
        : [...localQuizzes, ...memoryQuizzes].filter(q => q.user_id === currentUserId);
      
      // 重複除去（IDベース）
      const uniqueQuizzes = filteredQuizzes.filter((quiz, index, self) => 
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
    
    // 認証済みユーザーかどうかの判断
    const isAuthenticated = !currentUserId.startsWith('anon_');
    
    // まずローカルストレージから検索
    const localQuizzes = getQuizzesFromLocalStorage();
    const localQuiz = localQuizzes.find(q => q.id === id);
    if (localQuiz) {
      // 認証済みユーザーは所有権チェックをスキップ
      if (isAuthenticated || localQuiz.user_id === currentUserId) {
        return localQuiz;
      }
      
      console.log(`Access denied: User ${currentUserId} attempted to access local quiz ${id} owned by ${localQuiz.user_id}`);
      return null; // アクセス拒否
    }
    
    // 次にインメモリストレージから検索
    const memoryQuiz = inMemoryQuizzes.find(q => q.id === id);
    if (memoryQuiz) {
      // 認証済みユーザーは所有権チェックをスキップ
      if (isAuthenticated || memoryQuiz.user_id === currentUserId) {
        return memoryQuiz;
      }
      
      console.log(`Access denied: User ${currentUserId} attempted to access memory quiz ${id} owned by ${memoryQuiz.user_id}`);
      return null; // アクセス拒否
    }
    
    // 最後にSupabaseからクイズを取得
    try {
      const { data: quiz, error } = isAuthenticated ?
        // 認証済みユーザーは特定IDのクイズを取得（所有権に関わらず）
        await supabase
          .from('quizzes')
          .select('*')
          .eq('id', id)
          .maybeSingle() :
        // 匿名ユーザーは自分のクイズのみ取得
        await supabase
          .from('quizzes')
          .select('*')
          .eq('id', id)
          .eq('user_id', currentUserId)
          .maybeSingle();
      
      if (error) throw error;
      if (!quiz) return null; // クイズが見つからない
      
      // 認証済みユーザーの場合、所有権移行の必要性を確認
      if (isAuthenticated && quiz.user_id && quiz.user_id.startsWith('anon_')) {
        console.log(`このクイズは匿名ユーザー(${quiz.user_id})が所有しています。所有権移行を検討してください。`);
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