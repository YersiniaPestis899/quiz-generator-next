import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/quizzes
 * ユーザー別クイズ取得API
 */
export async function GET(request: NextRequest) {
  try {
    // 本来はデータベース接続やクイズの取得処理を行う
    // ビルド時のみの仮実装としてサンプルデータを返す
    
    const sampleQuizzes = [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "サンプルクイズ - プログラミング基礎",
        difficulty: "medium",
        created_at: new Date().toISOString(),
        user_id: "anon_default",
        questions: [
          {
            id: "q1",
            text: "JavaScriptの基本的なデータ型はどれですか？",
            answers: [
              { id: "a1", text: "String" },
              { id: "a2", text: "Block" },
              { id: "a3", text: "Circuit" },
              { id: "a4", text: "Path" }
            ],
            correctAnswerId: "a1",
            explanation: "JavaScriptの基本的なデータ型には、String、Number、Boolean、Null、Undefinedなどがあります。"
          },
          {
            id: "q2",
            text: "HTMLの略称は何ですか？",
            answers: [
              { id: "a1", text: "Hyper Text Markup Language" },
              { id: "a2", text: "High Tech Modern Language" },
              { id: "a3", text: "Hyperlink Text Management Logic" },
              { id: "a4", text: "Home Tool Markup Language" }
            ],
            correctAnswerId: "a1",
            explanation: "HTMLはHyper Text Markup Languageの略で、ウェブページを作成するための標準マークアップ言語です。"
          }
        ]
      }
    ];

    return NextResponse.json(sampleQuizzes);
  } catch (error: any) {
    console.error('Error fetching quizzes:', error);
    
    return NextResponse.json(
      { message: 'クイズの取得に失敗しました', error: error.message }, 
      { status: 500 }
    );
  }
}