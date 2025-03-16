import { NextRequest, NextResponse } from 'next/server';
import { getQuizzes, getQuiz, addUserIdColumnIfNeeded } from '@/lib/supabase';
import { getUserIdOrAnonymousId } from '@/lib/auth';

// これは実際の実装です - Supabaseからデータを取得

/**
 * GET /api/quizzes
 * ユーザー別クイズ取得API
 */
export async function GET(request: NextRequest) {
  try {
    console.log('API: Received request to fetch quizzes');
    // URLからすべての可能なIDパラメータを抽出
    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    const anonymousId = url.searchParams.get('anonymousId');
    const userId = url.searchParams.get('userId'); // 明示的なユーザーIDパラメータを追加
    
    console.log('API Request parameters:', { idParam, anonymousId, userId });

    // データベースカラム構造を確認
    console.log('API: Checking database column structure...');
    const columnCheck = await addUserIdColumnIfNeeded();
    console.log('Column check result:', columnCheck);

    // 現在のユーザーIDを取得（優先順位: 明示的なuserID > 匿名ID > 自動取得）
    console.log('API: Getting user ID...');
    let currentUserId;
    if (userId) {
      console.log('API: Using provided userId:', userId);
      currentUserId = userId;
    } else if (anonymousId) {
      console.log('API: Using provided anonymousId:', anonymousId);
      currentUserId = anonymousId;
    } else {
      console.log('API: No ID provided, getting from auth context');
      currentUserId = await getUserIdOrAnonymousId();
    }
    console.log('User ID for query:', currentUserId);
    
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
    
    // ユーザーのクイズを取得
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