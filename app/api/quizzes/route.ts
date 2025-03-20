import { NextRequest, NextResponse } from 'next/server';
import { getQuizzes, getQuiz, addUserIdColumnIfNeeded, getCommunityQuizzes, searchMyQuizzes } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/auth';

// これは実際の実装です - Supabaseからデータを取得

/**
 * GET /api/quizzes
 * ユーザー別クイズ取得API
 */
export async function GET(request: NextRequest) {
  try {
    console.log('API: Received request to fetch quizzes');
    // URLからすべての可能なパラメータを抽出
    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    const anonymousId = url.searchParams.get('anonymousId');
    const userId = url.searchParams.get('userId'); // 明示的なユーザーIDパラメータを追加
    const searchQuery = url.searchParams.get('search'); // 検索クエリ
    const communityMode = url.searchParams.get('community') === 'true'; // コミュニティモード
    
    console.log('API Request parameters:', { idParam, anonymousId, userId, searchQuery, communityMode });

    // データベースカラム構造を確認
    console.log('API: Checking database column structure...');
    const columnCheck = await addUserIdColumnIfNeeded();
    console.log('Column check result:', columnCheck);

    // 現在のユーザーIDを取得
    // 単純化: 認証済みユーザーのみサポート
    console.log('API: Getting authenticated user ID...');
    let currentUserId;
    if (userId) {
      console.log('API: Using provided userId:', userId);
      currentUserId = userId;
    } else {
      console.log('API: Getting from auth session');
      currentUserId = await getCurrentUserId();
    }
    
    // 認証されていない場合は空の配列を返す
    if (!currentUserId) {
      console.log('認証されていないユーザー - 空の結果を返します');
      return NextResponse.json([], { status: 200 });
    }
    
    console.log('Authenticated User ID for query:', currentUserId);
    
    // IDが指定されている場合は特定のクイズを取得
    if (idParam) {
      try {
        const quiz = await getQuiz(idParam, currentUserId);
        
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
    
    // コミュニティモードの場合、他ユーザーのクイズを取得
    if (communityMode) {
      try {
        console.log('コミュニティクイズを取得します');
        const communityQuizzes = await getCommunityQuizzes(searchQuery || undefined);
        console.log(`${communityQuizzes.length} 件のコミュニティクイズを取得しました`);
        return NextResponse.json(communityQuizzes);
      } catch (communityError) {
        console.error('コミュニティクイズ取得エラー:', communityError);
        return NextResponse.json(
          { 
            message: 'コミュニティクイズの取得に失敗しました', 
            error: communityError instanceof Error ? communityError.message : '不明なエラー' 
          }, 
          { status: 500 }
        );
      }
    }

    // 検索クエリがある場合、タイトル検索を実行
    if (searchQuery && searchQuery.trim() !== '') {
      try {
        console.log(`「${searchQuery}」でクイズを検索します`);
        const searchResults = await searchMyQuizzes(searchQuery, currentUserId);
        console.log(`${searchResults.length} 件の検索結果を取得しました`);
        return NextResponse.json(searchResults);
      } catch (searchError) {
        console.error('クイズ検索エラー:', searchError);
        return NextResponse.json(
          { 
            message: 'クイズの検索に失敗しました', 
            error: searchError instanceof Error ? searchError.message : '不明なエラー' 
          }, 
          { status: 500 }
        );
      }
    }
    
    // 通常のユーザーのクイズを取得
    try {
      const quizzes = await getQuizzes(currentUserId);
      console.log(`Retrieved ${quizzes.length} quizzes for user ${currentUserId}`);
      
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