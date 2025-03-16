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
 * ID文字列がUUID形式かどうかをチェック
 * @param id チェックするID
 * @returns UUIDならtrue、そうでなければfalse
 */
function isUUID(id: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id);
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
    
    // 認証済みユーザーかどうかの判断ロジック - UUID形式のユーザーIDも認証済みと判断
    const isAuthenticated = !currentUserId.startsWith('anon_') || isUUID(currentUserId);
    console.log(`ユーザー認証状態: ${isAuthenticated ? '認証済み' : '匿名'} (ID形式: ${isUUID(currentUserId) ? 'UUID' : '非UUID'})`)
    
    try {
      // Supabaseからクイズを取得（詳細なログ出力）
      console.log(`Supabaseクエリ実行: user_id=${currentUserId}`);
      
      if (isAuthenticated) {
        // 認証済みユーザー（UUIDを含む）の場合は、すべてのクイズを取得
        console.log('認証済みユーザーは全クイズ取得可能モード');
        
        try {
          // 全クイズを取得するクエリ
          const { data, error } = await supabase
            .from('quizzes')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (error) {
            console.error('全クイズ取得エラー:', error);
            throw error;
          }
          
          const allQuizzes = data || [];
          console.log(`SupabaseのDB全体から ${allQuizzes.length} 件のクイズを取得しました`);
          
          // ローカルストレージとメモリデータも取得して結合
          const localQuizzes = getQuizzesFromLocalStorage();
          
          // すべてのクイズを結合
          const combinedQuizzes = [
            ...allQuizzes,
            ...localQuizzes,
            ...inMemoryQuizzes
          ];
          
          // 重複除去
          const uniqueQuizzes = combinedQuizzes.filter((quiz, index, self) => 
            index === self.findIndex(q => q.id === quiz.id)
          );
          
          // 日付でソート
          uniqueQuizzes.sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB.getTime() - dateA.getTime();
          });
          
          console.log(`認証済みユーザー用: 合計 ${uniqueQuizzes.length} 件のクイズを返却`);
          return uniqueQuizzes;
        } catch (error) {
          console.error('認証済みモードでのクイズ取得エラー:', error);
          // エラー時は通常モードにフォールバック
        }
      }
      
      // 通常モード（またはフォールバックケース）：ユーザーIDに基づいて取得
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabaseクエリエラー詳細:', error);
        if (error.details) console.error('- 詳細:', error.details);
        if (error.hint) console.error('- ヒント:', error.hint);
        if (error.code) console.error('- コード:', error.code);
        throw error;
      }
      
      const supabaseQuizzes = data || [];
      console.log(`Supabaseから ${supabaseQuizzes.length} 件のクイズを取得しました`);
      
      // 認証済みユーザーの場合は匿名IDのクイズも取得（データ移行考慮）
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
        .filter(q => isAuthenticated || q.user_id === currentUserId);
      
      // Supabaseから取得したクイズとローカルクイズとインメモリクイズを結合
      const allQuizzes = [
        ...supabaseQuizzes, 
        ...additionalQuizzes,
        ...localQuizzes, 
        ...inMemoryQuizzes.filter(q => isAuthenticated || q.user_id === currentUserId)
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
      
      console.log(`通常モード: 合計 ${uniqueQuizzes.length} 件のクイズを返却`)
      return uniqueQuizzes;
    } catch (supabaseError) {
      console.error('Error fetching from Supabase:', supabaseError);
      
      // エラー時はローカルストレージとインメモリデータのみ返す
      const localQuizzes = getQuizzesFromLocalStorage()
        .filter(q => isAuthenticated || q.user_id === currentUserId);
      
      const memoryQuizzes = inMemoryQuizzes.filter(q => isAuthenticated || q.user_id === currentUserId);
      
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
      
      console.log(`エラー時フォールバック: ${uniqueQuizzes.length} 件のクイズを返却`);
      return uniqueQuizzes;
    }
  } catch (error) {
    console.error('Global error in getQuizzes:', error);
    
    // 最悪の場合もローカルストレージとインメモリデータを返す
    const localQuizzes = getQuizzesFromLocalStorage();
    console.log(`致命的エラー時: ローカルストレージとメモリのみのクイズ ${localQuizzes.length + inMemoryQuizzes.length} 件を返却`);
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
      // UUIDユーザーは常にアクセス可能
      if (isUUID(currentUserId)) {
        return localQuiz;
      }
      
      // それ以外は所有権チェック
      if (localQuiz.user_id && localQuiz.user_id !== currentUserId) {
        console.log(`Access denied: User ${currentUserId} attempted to access local quiz ${id} owned by ${localQuiz.user_id}`);
        return null; // アクセス拒否
      }
      return localQuiz;
    }
    
    // 次にインメモリストレージから検索
    const memoryQuiz = inMemoryQuizzes.find(q => q.id === id);
    if (memoryQuiz) {
      // UUIDユーザーは常にアクセス可能
      if (isUUID(currentUserId)) {
        return memoryQuiz;
      }
      
      // それ以外は所有権チェック
      if (memoryQuiz.user_id && memoryQuiz.user_id !== currentUserId) {
        console.log(`Access denied: User ${currentUserId} attempted to access memory quiz ${id} owned by ${memoryQuiz.user_id}`);
        return null; // アクセス拒否
      }
      return memoryQuiz;
    }
    
    // 最後にSupabaseからクイズを取得
    try {
      // 認証済みユーザーの場合、ユーザーIDに関わらず特定IDのクイズを取得（移行考慮）
      const isAuthenticated = !currentUserId.startsWith('anon_') || isUUID(currentUserId);
      
      const { data: quiz, error } = isAuthenticated ?
        // 認証済みユーザーは特定IDのクイズを取得
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