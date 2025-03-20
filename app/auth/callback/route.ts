import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * 強化版 標準認証コールバックハンドラー
 * プライマリコールバックパス - 詳細診断と厳格エラー処理
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    console.log('標準認証コールバック詳細診断:', {
      url: requestUrl.toString(),
      params: Object.fromEntries(requestUrl.searchParams.entries()),
      headers: Object.fromEntries(Array.from(request.headers.entries())),
      timestamp: new Date().toISOString(),
    });
    
    // クエリパラメータ包括分析
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');
    
    // エラー状態の前方検出と処理
    if (error) {
      console.error('認証プロバイダーエラー詳細分析:', { 
        error, 
        errorDescription,
        timestamp: new Date().toISOString(), 
      });
      return NextResponse.redirect(
        new URL(`/auth?error=provider_error&details=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
      );
    }
    
    // 認証コード妥当性検証
    if (!code) {
      console.error('認証コード不在 - リクエスト診断:', {
        headers: Object.fromEntries(Array.from(request.headers.entries())),
        cookies: request.cookies,
        url: requestUrl.toString(),
      });
      return NextResponse.redirect(new URL('/auth?error=missing_code', requestUrl.origin));
    }
    
    console.log('認証コード検出 - セッション交換シーケンス開始');
    
    // クッキーコンテキスト強化
    const cookieStore = cookies();
    // 堅牢なクライアント初期化
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore,
    });
    
    // セッション交換プロセスの多段階検証
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('セッション交換障害詳細:', {
        error: sessionError,
        code: code.substring(0, 10) + '...', // 安全なログ出力
        timestamp: new Date().toISOString(),
      });
      return NextResponse.redirect(
        new URL(`/auth?error=session_error&details=${encodeURIComponent(sessionError.message)}`, requestUrl.origin)
      );
    }
    
    // セッション確立成功メトリクス
    console.log('認証サイクル完了 - セッション確立成功', {
      userId: data?.session?.user?.id ? (data.session.user.id.substring(0, 8) + '...') : 'unknown',
      expires: data?.session?.expires_at,
      timestamp: new Date().toISOString(),
    });
    
    // 認証フロー正常終了 - ホームへリダイレクト
    return NextResponse.redirect(new URL('/', requestUrl.origin));
  } catch (error) {
    // 例外状態の構造化分析
    const errorObj = error instanceof Error 
      ? { message: error.message, stack: error.stack } 
      : { raw: String(error) };
      
    console.error('標準認証コールバック例外発生:', {
      ...errorObj,
      timestamp: new Date().toISOString(),
    });
    
    // グレースフルデグラデーション - エラーページへ制御された遷移
    const errorMessage = errorObj.message || '未分類システムエラー';
    return NextResponse.redirect(
      new URL(`/auth?error=system_error&details=${encodeURIComponent(errorMessage)}`, 
        new URL(request.url).origin)
    );
  }
}