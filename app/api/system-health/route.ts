import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

/**
 * 統合システム健全性API
 * 認証システムと環境設定の完全な状態診断を提供
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // クッキーストアの初期化
    const cookieStore = cookies();
    const cookieList = cookieStore.getAll();
    
    // Supabaseクライアントの初期化
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // セッション情報の取得
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    // 環境変数（機密情報はマスク）
    const environment = {
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      VERCEL_ENV: process.env.VERCEL_ENV || 'unknown',
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
      SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing',
      SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || 'not-configured',
    };
    
    // バージョン情報
    const versionInfo = {
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
    
    // Cookie分析
    const cookieAnalysis = {
      count: cookieList.length,
      hasSbAuthCookie: cookieList.some(c => c.name.includes('sb-auth')),
      hasRefreshToken: cookieList.some(c => c.name.includes('refresh-token')),
      sameSiteSettings: cookieList
        .filter(c => c.name.includes('sb-') || c.name.includes('supabase'))
        .map(c => ({ name: c.name, sameSite: c.name.includes('sb-auth') ? 'lax' : 'unknown' })),
    };
    
    // リクエスト情報
    const requestInfo = {
      url: request.url,
      method: request.method,
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
    };
    
    // 認証設定
    const authConfig = {
      redirectUrl: `${environment.SITE_URL}/api/auth/callback`,
      alternativeRedirectUrl: `${environment.SITE_URL}/auth/callback`,
      cookieSecure: process.env.NODE_ENV === 'production',
      cookieSameSite: 'lax',
    };
    
    // 健全性診断
    const healthIndicators = {
      environmentComplete: Object.values(environment).every(v => v && v !== 'missing' && v !== 'not-configured'),
      cookiesExist: cookieAnalysis.count > 0,
      authCookiesExist: cookieAnalysis.hasSbAuthCookie,
      sessionActive: !!sessionData?.session,
      responseTime: Date.now() - startTime,
    };
    
    // 診断データのレスポンス構築
    const diagnosticData = {
      status: 'success',
      timestamp: new Date().toISOString(),
      version: versionInfo,
      environment,
      auth: {
        config: authConfig,
        session: sessionData ? {
          hasSession: Boolean(sessionData.session),
          expiresAt: sessionData.session?.expires_at,
          provider: sessionData.session?.user?.app_metadata?.provider,
          lastSignIn: sessionData.session?.user?.last_sign_in_at,
        } : null,
        sessionError: sessionError ? {
          message: sessionError.message,
          status: sessionError.status
        } : null,
      },
      cookies: cookieAnalysis,
      request: requestInfo,
      health: healthIndicators,
    };
    
    // HTTPレスポンスヘッダー設定
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, max-age=0');
    headers.set('Content-Type', 'application/json');
    
    // 診断データを返す
    return NextResponse.json(diagnosticData, { headers });
  } catch (error) {
    // エラー情報を構造化して返す
    const errorInfo = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json({ error: errorInfo }, { status: 500 });
  }
}