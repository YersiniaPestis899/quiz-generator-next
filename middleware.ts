import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 強化版 Next.js Middleware for Supabase Auth
 * セッション管理と認証状態保持の堅牢化
 */
export async function middleware(req: NextRequest) {
  try {
    // ベースレスポンスの生成
    const res = NextResponse.next();
    
    // リクエストの基本情報をログ（診断モード）
    const isDebugMode = req.headers.get('x-auth-debug') === 'true' || 
                        req.nextUrl.searchParams.get('auth_debug') === 'true';
    
    if (isDebugMode) {
      console.log('認証ミドルウェア診断:', {
        url: req.url,
        path: req.nextUrl.pathname,
        headers: Object.fromEntries(req.headers.entries()),
      });
    }
    
    // Supabaseミドルウェアクライアントの初期化
    const supabase = createMiddlewareClient({ req, res });
    
    // クロスブラウザ互換性のためのCookieヘッダー追加
    res.headers.append('Set-Cookie', 
      'sb-auth-token-verification=true; SameSite=Lax; Secure; Path=/; HttpOnly');
    
    // セッションリフレッシュの拡張エラーハンドリング
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (isDebugMode && error) {
        console.error('ミドルウェアセッション取得エラー:', error);
      }
      
      if (isDebugMode && data?.session) {
        console.log('ミドルウェアセッション検証:', {
          hasSession: !!data.session,
          expiresIn: data.session ? 
            Math.floor((data.session.expires_at || 0) * 1000 - Date.now()) / 1000 : null,
        });
      }
    } catch (sessionError) {
      // セッション取得エラーを記録するが、ユーザーエクスペリエンスは中断しない
      console.error('ミドルウェアセッション処理例外:', sessionError);
    }
    
    return res;
  } catch (error) {
    // 致命的なミドルウェアエラーの場合でも、アプリケーションの動作は継続
    console.error('認証ミドルウェア重大例外:', error);
    return NextResponse.next();
  }
}

// ミドルウェアが適用されるルートの最適化
export const config = {
  matcher: [
    // 以下で始まるルートを除くすべてのルートに適用:
    // - _next/static (静的ファイル)
    // - _next/image (画像最適化ファイル)
    // - favicon.ico (ファビコンファイル)
    // - 認証が不要なAPI
    // - 認証コールバックURL（別途処理が必要）
    '/((?!_next/static|_next/image|favicon.ico|api/check-environment|api/auth/diagnose|api/auth/callback|auth/callback).*)',
  ],
};