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
    const searchParams = requestUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const state = searchParams.get('state'); // OAuth状態トークン
    
    // 完全なURLデバッグ情報
    console.log('受信コールバックURL詳細:', {
      fullUrl: requestUrl.toString(),
      path: requestUrl.pathname,
      queryString: requestUrl.search,
      allParams: Object.fromEntries(searchParams.entries()),
      hasCode: !!code,
      hasError: !!error,
      hasState: !!state
    });
    
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
      
      // トークン抽出の代替アプローチ
      // 一部のプロバイダーはcodeQueryパラメータではなくヘッダーやURLパスにトークンを含む場合がある
      let extractedCode = null;
      
      // ヘッダーからのIDトークン抽出試行
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        extractedCode = authHeader.substring(7); // 'Bearer ' の後のトークン部分
        console.log('認証ヘッダーからトークンを抽出しました');
      }
      
      // URLパスからのトークン抽出試行
      if (!extractedCode && requestUrl.pathname.includes('/')) {
        const pathSegments = requestUrl.pathname.split('/');
        if (pathSegments.length > 0) {
          const lastSegment = pathSegments[pathSegments.length - 1];
          // トークンらしきセグメントを探す
          if (lastSegment && lastSegment.length > 20) {
            extractedCode = lastSegment;
            console.log('URLパスから認証トークン候補を抽出しました');
          }
        }
      }
      
      // 対策的な代替手段がない場合は通常通りエラーに遷移
      if (!extractedCode) {
        return NextResponse.redirect(new URL('/auth?error=missing_code', requestUrl.origin));
      }
      
      // 抽出したトークンを使用して続行
      console.log('代替認証メカニズムを使用します:', {
        tokenLength: extractedCode.length,
        tokenStart: extractedCode.substring(0, 5) + '...'
      });
      code = extractedCode;
    } else {
      console.log('認証コード検出 - セッション交換プロセス開始');
    }
    
    // クッキーストア強化
    const cookieStore = cookies();
    // エラー耐性の高いクライアント初期化
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore,
    });
    
    // セッション交換プロセスの堅牢化
    try {
      console.log('セッション交換プロセス開始 - コード長:', code.length);
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (sessionError) {
        console.error('セッション交換障害診断:', {
          error: sessionError,
          message: sessionError.message,
          code: code.substring(0, 10) + '...' // コードの一部を安全にログ
        });
        
        // 拡張エラー診断情報
        const diagnosticInfo = {
          timestamp: new Date().toISOString(),
          statusCode: sessionError.status || 'unknown',
          errorCode: (sessionError as any).code || 'unknown',
          authProvider: 'google',
          requestPath: requestUrl.pathname,
          hasRefreshToken: cookieStore.getAll().some(c => c.name.includes('refresh-token'))
        };
        console.error('認証障害詳細診断:', diagnosticInfo);
        
        return NextResponse.redirect(
          new URL(`/auth?error=session_error&details=${encodeURIComponent(sessionError.message)}`, requestUrl.origin)
        );
      }
      
      // セッション確立成功指標
      console.log('認証サイクル完了 - セッション確立成功', {
        userId: data?.session?.user?.id ? (data.session.user.id.substring(0, 8) + '...') : 'unknown',
        expires: data?.session?.expires_at,
        expiresIn: data?.session?.expires_at ? Math.floor(data.session.expires_at * 1000 - Date.now()) / 1000 : 'unknown',
        provider: data?.session?.user?.app_metadata?.provider || 'unknown'
      });
      
      // クッキー設定を確認
      const allCookies = cookieStore.getAll();
      console.log('認証後のクッキー状態:', {
        count: allCookies.length,
        hasSbAuthCookie: allCookies.some(c => c.name.includes('sb-auth')),
        hasRefreshToken: allCookies.some(c => c.name.includes('refresh-token')),
      });
    } catch (exchangeError) {
      console.error('セッション交換プロセスの例外発生:', exchangeError);
      
      // セッション交換中の例外に対する対応
      const errorMessage = exchangeError instanceof Error 
        ? exchangeError.message 
        : 'セッション交換中の不明なエラー';
      
      return NextResponse.redirect(
        new URL(`/auth?error=exchange_error&details=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
      );
    }
    
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