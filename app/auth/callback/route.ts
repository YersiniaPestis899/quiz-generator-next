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
    const searchParams = requestUrl.searchParams;
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const state = searchParams.get('state'); // OAuth状態トークン
    
    // 完全なURLデバッグ情報
    console.log('受信コールバックURL詳細:', {
      fullUrl: requestUrl.toString(),
      path: requestUrl.pathname,
      queryString: requestUrl.search,
      allParams: Object.fromEntries(searchParams.entries()),
      hasCode: !!code,
      hasError: !!errorParam,
      hasState: !!state
    });
    
    // エラー状態の前方検出と処理
    if (errorParam) {
      console.error('認証プロバイダーエラー詳細分析:', { 
        errorParam, 
        errorDescription,
        timestamp: new Date().toISOString(), 
      });
      return NextResponse.redirect(
        new URL(`/auth?error=provider_error&details=${encodeURIComponent(errorDescription || errorParam)}`, requestUrl.origin)
      );
    }
    
    // 認証コード妥当性検証
    if (!code) {
      console.error('認証コード不在 - リクエスト診断:', {
        headers: Object.fromEntries(Array.from(request.headers.entries())),
        cookies: request.cookies,
        url: requestUrl.toString(),
      });
      
      // 代替認証メカニズムの試行
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
      
      // 対策的な代替手段がない場合
      if (!extractedCode) {
        // API転送が必要かもしれない
        console.log('代替認証メカニズムへの転送試行');
        return NextResponse.redirect(new URL('/api/auth/callback' + requestUrl.search, requestUrl.origin));
      }
      
      // 抽出したトークンを使用して続行
      console.log('代替認証メカニズムを使用します:', {
        tokenLength: extractedCode.length,
        tokenStart: extractedCode.substring(0, 5) + '...'
      });
      code = extractedCode;
    } else {
      console.log('認証コード検出 - セッション交換シーケンス開始');
    }
    
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
  } catch (err) {
    // 例外状態の構造化分析
    const errorObj = err instanceof Error 
      ? { message: err.message, stack: err.stack } 
      : { raw: String(err) };
      
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