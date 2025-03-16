import { NextRequest, NextResponse } from 'next/server';
import { getQuizzes, getQuiz, addUserIdColumnIfNeeded } from '@/lib/supabase';
import { getUserIdOrAnonymousId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';  // 修正済み: supabaseクライアントの正しいインポート

/**
 * GET /api/quizzes
 * ユーザー別クイズ取得API
 */
export async function GET(request: NextRequest) {
  try {
    console.log('API: Received request to fetch quizzes');
    // URLからクイズIDとユーザーの匿名IDを抽出
    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    const anonymousId = url.searchParams.get('anonymousId');
    const isAuthenticated = url.searchParams.get('isAuthenticated') === 'true';
    const getAllQuizzes = url.searchParams.get('getAllQuizzes') === 'true';
    
    console.log('API Request parameters:', { 
      idParam, 
      anonymousId, 
      isAuthenticated, 
      getAllQuizzes
    });

    // データベースカラム構造を確認
    console.log('API: Checking database column structure...');
    const columnCheck = await addUserIdColumnIfNeeded();
    console.log('Column check result:', columnCheck);

    // 現在のユーザーIDを取得
    console.log('API: Getting user ID...');
    let userId = anonymousId || await getUserIdOrAnonymousId();
    console.log('User ID for query:', userId);
    
    // UUIDパターンを検出する正規表現
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuidUser = uuidPattern.test(userId);
    
    if (isUuidUser) {
      console.log('API: UUID形式のユーザーIDを検出 - 特別な処理を適用');
    }
    
    // 特殊モード: 認証済みユーザーまたは全クイズ要求の場合
    if (getAllQuizzes || isUuidUser) {
      console.log('API: 全クイズ取得モードを実行');
      try {
        // 改善: ログ出力を強化して詳細なデバッグ情報を提供
        console.log('API: 直接Supabaseクエリを実行 - 全クイズ取得');
        
        // 直接Supabaseから全クイズを取得
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('API: 全クイズ取得エラー:', error);
          return NextResponse.json(
            { message: '全クイズの取得に失敗しました', error: error.message }, 
            { status: 500 }
          );
        }
        
        // 改善: より詳細なレスポンス情報のログ出力
        console.log(`API: 全クイズモード - ${data?.length || 0}件のクイズを取得 (データサンプル: ${data && data.length > 0 ? JSON.stringify(data[0].id) : 'なし'})`);
        
        // 改善: データが空の場合でも空配列を明示的に返す
        return NextResponse.json(data || []);
      } catch (error) {
        console.error('API: 全クイズ取得中のエラー:', error);
        // エラー時は通常モードにフォールバック
        console.log('API: 通常モードにフォールバックします');
      }
    }
    
    // IDが指定されている場合は特定のクイズを取得
    if (idParam) {
      try {
        const quiz = await getQuiz(idParam, userId);
        
        if (!quiz) {
          return NextResponse.json(
            { message: '指定されたIDのクイズが見つかりませんでした' }, 
            { status: 404 }
          );
        }
        
        return NextResponse.json(quiz);
      } catch (quizError) {
        console.error(`Error fetching quiz ${idParam}:`, quizError);
        return NextResponse.json(
          { 
            message: '特定のクイズ取得に失敗しました', 
            error: quizError instanceof Error ? quizError.message : '不明なエラー'
          }, 
          { status: 500 }
        );
      }
    }
    
    // ユーザーのクイズを取得
    try {
      console.log(`API: クイズ取得を実行 - userId=${userId}`);
      const quizzes = await getQuizzes(userId);
      console.log(`API: ${quizzes.length} 件のクイズを取得しました`);
      
      return NextResponse.json(quizzes);
    } catch (quizError) {
      console.error('Error fetching quizzes:', quizError);
      return NextResponse.json(
        { 
          message: 'クイズ一覧の取得に失敗しました', 
          error: quizError instanceof Error ? quizError.message : '不明なエラー' 
        }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Detailed error in /api/quizzes:', error);
    
    // エラーオブジェクトの安全な処理
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorCause = error instanceof Error && error.cause ? String(error.cause) : 'unknown';
    
    console.error('Error details:', errorStack);
    
    return NextResponse.json(
      { 
        message: 'クイズの取得に失敗しました', 
        error: errorMessage, 
        stack: errorStack,
        cause: errorCause 
      }, 
      { status: 500 }
    );
  }
}