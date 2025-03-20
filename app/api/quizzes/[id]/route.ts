import { NextResponse } from 'next/server';
import { getQuiz } from '@/lib/supabase';

/**
 * GET /api/quizzes/[id]
 * IDで指定した特定のクイズを取得
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { message: 'クイズIDが指定されていません' }, 
        { status: 400 }
      );
    }
    
    const quiz = await getQuiz(id);
    
    if (!quiz) {
      return NextResponse.json(
        { message: '指定されたIDのクイズが見つかりませんでした' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(quiz);
  } catch (error: any) {
    console.error(`Error fetching quiz with ID ${params.id}:`, error);
    
    return NextResponse.json(
      { message: 'クイズの取得に失敗しました', error: error.message }, 
      { status: 500 }
    );
  }
}