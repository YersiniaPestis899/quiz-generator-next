import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * バックアップ認証コールバックハンドラー
 * 主要なコールバック処理に問題がある場合の代替ルート
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    console.log('API代替認証コールバック受信:', requestUrl.toString());

    // URLからcodeとerrorを抽出
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');
    
    // エラーパラメータを処理
    if (error) {
      console.error('認証プロバイダーからのエラー:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/auth?error=provider_error&details=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
      );
    }
    
    // コードパラメータがない場合
    if (!code) {
      console.error('認証コードが見つかりません');
      return NextResponse.redirect(
        new URL('/auth?error=missing_code', requestUrl.origin)
      );
    }
    
    console.log('認証コード受信確認 - セッション交換開始');
    
    // Supabaseクライアントを初期化
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // 認証コードを使用してセッションを交換
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('セッション交換エラー:', sessionError);
      return NextResponse.redirect(
        new URL(`/auth?error=session_error&details=${encodeURIComponent(sessionError.message)}`, requestUrl.origin)
      );
    }
    
    console.log('認証セッション確立成功 (API代替ルート)');
    
    // 認証成功・ホームページへリダイレクト
    return NextResponse.redirect(new URL('/', requestUrl.origin));
  } catch (error) {
    console.error('APIコールバック処理エラー:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    
    return NextResponse.redirect(
      new URL(`/auth?error=auth_failed&details=${encodeURIComponent(errorMessage)}`, new URL(request.url).origin)
    );
  }
}