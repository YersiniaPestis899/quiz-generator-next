import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 匿名ユーザーデータを認証済みユーザーIDに移行するAPI
 * ログイン後に匿名IDで作成されたクイズを認証済みユーザーIDに紐付け直します
 */
export async function POST(request: NextRequest) {
  try {
    const { anonymousId, userId } = await request.json();
    
    if (!anonymousId || !userId) {
      return NextResponse.json(
        { message: '必要なパラメータが不足しています' },
        { status: 400 }
      );
    }
    
    console.log(`匿名データ移行: ${anonymousId} → ${userId}`);
    
    // Supabaseでデータ移行を実行
    const { error } = await supabase
      .from('quizzes')
      .update({ user_id: userId })
      .eq('user_id', anonymousId);
    
    if (error) {
      console.error('Supabaseデータ移行エラー:', error);
      return NextResponse.json(
        { message: 'データ移行に失敗しました', error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `${anonymousId} から ${userId} へのデータ移行が完了しました` 
    });
  } catch (error) {
    console.error('データ移行処理エラー:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: errorMessage },
      { status: 500 }
    );
  }
}