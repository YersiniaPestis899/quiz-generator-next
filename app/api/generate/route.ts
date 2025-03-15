import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/generate
 * クイズ生成API
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディからパラメータを取得
    const body = await request.json();
    const { title, content, numQuestions = 5, difficulty = 'medium' } = body;
    
    // 入力検証
    if (!title || !content) {
      return NextResponse.json(
        { message: 'タイトルとコンテンツは必須です' }, 
        { status: 400 }
      );
    }
    
    // URLから匿名ユーザーIDを取得
    const url = new URL(request.url);
    const anonymousId = url.searchParams.get('anonymousId') || "anon_default";
    
    // ビルド時の仮実装: 実際のAI生成ではなくダミーデータを返す
    const quizId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // サンプルの問題を生成
    const questions = Array.from({ length: numQuestions }).map((_, index) => {
      const questionId = uuidv4();
      const correctId = uuidv4();
      
      return {
        id: questionId,
        text: `サンプル問題 ${index + 1}: ${content.substring(0, 30)}...に関する質問です`,
        answers: [
          { id: correctId, text: "これが正解です" },
          { id: uuidv4(), text: "不正解の選択肢1" },
          { id: uuidv4(), text: "不正解の選択肢2" },
          { id: uuidv4(), text: "不正解の選択肢3" }
        ],
        correctAnswerId: correctId,
        explanation: "これはビルド用サンプル説明です。実際のデプロイでは、Claude AIによる詳細な説明が提供されます。"
      };
    });
    
    // クイズオブジェクト作成
    const quiz = {
      id: quizId,
      title,
      difficulty,
      questions,
      created_at: timestamp,
      user_id: anonymousId
    };
    
    // 成功レスポンスを返す
    return NextResponse.json(quiz);
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    
    // エラーレスポンスを返す
    return NextResponse.json(
      { message: 'クイズの生成に失敗しました', error: error.message }, 
      { status: 500 }
    );
  }
}