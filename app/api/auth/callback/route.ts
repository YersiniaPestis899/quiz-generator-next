import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * 強化版 Supabase Auth OAuth コールバックハンドラー
 * 詳細診断ログと堅牢なエラー処理を実装
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    console.log('認証コールバック詳細診断:', {
      url: requestUrl.toString(),
      params: Object.fromEntries(requestUrl.searchParams.entries()),
      headers: Object.fromEntries(Array.from(request.headers.entries())),
    });
    
    // クエリパラメータ分析
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');
    
    // エラー状態の詳細ロギングと処理
    if (error) {
      console.error('認証プロバイダーエラー詳細:', { error, errorDescription });
      return NextResponse.redirect(
        new URL(`/auth?error=provider_error&details=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
      );
    }
    
    // 認証コード検証の強化
    if (!code) {
      console.error('認証コード欠落 - リクエスト診断:', {
        headers: Object.fromEntries(Array.from(request.headers.entries())),
      });
      return NextResponse.redirect(new URL('/auth?error=missing_code', requestUrl.origin));
    }
    
    console.log('認証コード検出 - セッション交換プロセス開始');
    
    // クッキーストア強化
    const cookieStore = cookies();
    // エラー耐性の高いクライアント初期化
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore,
    });
    
    // セッション交換プロセスの堅牢化
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('セッション交換障害診断:', {
        error: sessionError,
        code: code.substring(0, 10) + '...' // コードの一部を安全にログ
      });
      return NextResponse.redirect(
        new URL(`/auth?error=session_error&details=${encodeURIComponent(sessionError.message)}`, requestUrl.origin)
      );
    }
    
    // セッション確立成功指標
    console.log('認証サイクル完了 - セッション確立成功', {
      userId: data?.session?.user?.id ? (data.session.user.id.substring(0, 8) + '...') : 'unknown',
      expires: data?.session?.expires_at
    });
    
    // 認証フロー完了 - ホームページへリダイレクト
    return NextResponse.redirect(new URL('/', requestUrl.origin));
  } catch (error) {
    // 例外の構造化分析
    const errorObj = error instanceof Error 
      ? { message: error.message, stack: error.stack } 
      : { raw: String(error) };
      
    console.error('認証コールバック例外発生:', errorObj);
    
    // 障害回復メカニズム - エラーページへ制御された移行
    const errorMessage = errorObj.message || '未分類システムエラー';
    return NextResponse.redirect(
      new URL(`/auth?error=system_error&details=${encodeURIComponent(errorMessage)}`, 
        new URL(request.url).origin)
    );
  }
}