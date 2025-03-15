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
    // URLからクイズIDとユーザーの匿名IDを抽出
    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    const anonymousId = url.searchParams.get('anonymousId');
    
    console.log('API Request parameters:', { idParam, anonymousId });

    // データベースカラム構造を確認
    console.log('API: Checking database column structure...');
    const columnCheck = await addUserIdColumnIfNeeded();
    console.log('Column check result:', columnCheck);

    // 現在のユーザーIDを取得
    console.log('API: Getting user ID...');
    const userId = anonymousId || await getUserIdOrAnonymousId();
    console.log('User ID for query:', userId);
    
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
      const quizzes = await getQuizzes(userId);
      console.log(`Retrieved ${quizzes.length} quizzes for user ${userId}`);
      
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