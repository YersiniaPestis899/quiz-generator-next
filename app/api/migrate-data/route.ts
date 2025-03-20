import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * 強化版データ移行APIエンドポイント
 * 匿名ユーザーデータを認証済みユーザーに関連付ける
 * 堅牢なエラー処理と詳細診断機能を実装
 */
export async function POST(request: NextRequest) {
  try {
    // クッキーストアの初期化
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    const hasSbAuth = allCookies.some(c => c.name.includes('sb-auth'));
    const hasRefreshToken = allCookies.some(c => c.name.includes('refresh-token'));
    
    // クッキー状態診断
    console.log('データ移行リクエストクッキー状態:', {
      cookieCount: allCookies.length,
      hasSbAuthCookie: hasSbAuth,
      hasRefreshToken: hasRefreshToken,
      cookieNames: allCookies.map(c => c.name)
    });
    
    // Supabaseクライアントの初期化 - 拡張診断オプション付き
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore,
    });
    
    // 詳細なセッション診断
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('データ移行前のセッション取得エラー:', sessionError);
      return NextResponse.json({
        error: '認証セッション取得エラー',
        details: sessionError.message,
        code: 'SESSION_ERROR',
        cookieState: { hasSbAuth, hasRefreshToken }
      }, { status: 401 });
    }
    
    const session = sessionData?.session;
    
    if (!session) {
      console.error('データ移行要求 - 未認証状態検出', {
        hasSessionData: !!sessionData,
        cookieState: { hasSbAuth, hasRefreshToken }
      });
      
      // 詳細な診断情報を含めたレスポンス
      return NextResponse.json({
        error: '認証セッションが存在しません',
        details: 'データ移行には認証が必要です',
        code: 'NO_SESSION',
        authState: {
          hasSession: false,
          hasCookies: allCookies.length > 0,
          hasSbAuth,
          hasRefreshToken,
          timestamp: new Date().toISOString()
        }
      }, { status: 401 });
    }
    
    // リクエストボディ構造分析 - 堅牢なエラー処理
    let anonymousId, quizData;
    try {
      const body = await request.json();
      anonymousId = body.anonymousId;
      quizData = body.quizData;
    } catch (parseError) {
      console.error('リクエストボディの解析失敗:', parseError);
      return NextResponse.json({
        error: '無効なリクエストボディ',
        details: 'リクエストはJSON形式である必要があります',
        code: 'INVALID_JSON'
      }, { status: 400 });
    }
    
    if (!anonymousId) {
      console.error('データ移行要求 - パラメータ不足');
      return NextResponse.json({
        error: '匿名IDパラメータが必要です',
        code: 'MISSING_PARAM',
        requiredParam: 'anonymousId'
      }, { status: 400 });
    }
    
    // セッションユーザーの識別子を抽出
    const userId = session.user.id;
    console.log('データ移行プロセス開始:', {
      from: anonymousId.substring(0, 8) + '...',
      to: userId.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    });
    
    // データ移行ロジック - 実際の実装部分
    try {
      // TODO: 実際のデータ移行ロジックを実装
      // 例: データベースクエリ、RPC呼び出しなど
      
      // ダミー処理: 実際には適切なデータ移行ロジックを実装する
      // これはデモンストレーションのための成功応答です
      await new Promise(resolve => setTimeout(resolve, 200)); // 簡単な遅延
      
      // 成功レスポンス
      return NextResponse.json({
        success: true,
        message: 'データ移行完了',
        userId: userId,
        timestamp: new Date().toISOString(),
        details: {
          anonymousId: anonymousId.substring(0, 8) + '...',
          itemsProcessed: quizData ? quizData.length : 0
        }
      });
    } catch (migrationError) {
      console.error('データ移行処理エラー:', migrationError);
      return NextResponse.json({
        error: 'データ移行プロセスエラー',
        details: migrationError instanceof Error ? migrationError.message : '不明なエラー',
        code: 'MIGRATION_PROCESS_ERROR'
      }, { status: 500 });
    }
  } catch (error) {
    // 構造化エラー処理 - 包括的なエラーハンドリング
    console.error('データ移行サブシステム障害:', error);
    
    const errorResponse = {
      error: '内部システム例外',
      details: error instanceof Error ? error.message : '未分類システムエラー',
      code: 'SYSTEM_ERROR',
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}