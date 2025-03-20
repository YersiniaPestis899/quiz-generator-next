import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * 認証診断APIエンドポイント
 * 認証環境と設定に関する情報を返す
 */
export async function GET(request: NextRequest) {
  try {
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
    
    // 認証設定情報
    const authConfig = {
      redirectUrl: `${environment.SITE_URL}/auth/callback`,
      cookieSecure: process.env.NODE_ENV === 'production',
      cookieSameSite: 'lax',
    };
    
    // レスポンスデータの構築
    const diagnosticData = {
      timestamp: new Date().toISOString(),
      environment,
      auth: {
        config: authConfig,
        session: sessionData ? {
          hasSession: Boolean(sessionData.session),
          expiresAt: sessionData.session?.expires_at,
          provider: sessionData.session?.user?.app_metadata?.provider,
        } : null,
        sessionError: sessionError ? {
          message: sessionError.message,
          status: sessionError.status
        } : null,
      },
      cookies: {
        count: cookieList.length,
        hasSbAuthCookie: cookieList.some(c => c.name.includes('sb-auth')),
        hasRefreshToken: cookieList.some(c => c.name.includes('refresh-token')),
        details: cookieList.map(c => ({
          name: c.name,
          value: c.name.includes('auth') ? '[masked]' : '[masked]',
          secure: c.secure,
          httpOnly: c.httpOnly,
          maxAge: c.maxAge,
          sameSite: c.sameSite,
        })),
      },
      request: {
        url: request.url,
        method: request.method,
        headers: {
          host: request.headers.get('host'),
          origin: request.headers.get('origin'),
          userAgent: request.headers.get('user-agent'),
          referer: request.headers.get('referer'),
        },
      },
    };
    
    // 診断データを返す
    return NextResponse.json(diagnosticData);
  } catch (error) {
    // エラー情報を返す
    const errorInfo = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null,
    };
    
    return NextResponse.json({ error: errorInfo }, { status: 500 });
  }
}