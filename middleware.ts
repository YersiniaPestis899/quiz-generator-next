import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 認証ミドルウェアの強化版実装
 * セッション管理、クッキー設定、および障害耐性を強化
 */
export async function middleware(req: NextRequest) {
  try {
    // ベースレスポンスの生成
    const res = NextResponse.next();
    
    // クッキー関連の堅牢化設定
    // 環境に応じて適切なSecure属性を設定
    const isSecure = process.env.NODE_ENV === 'production';
    const secureFlag = isSecure ? '; Secure' : '';
    
    res.headers.append('Set-Cookie', 
      `sb-auth-token-verification=true; SameSite=Lax; Path=/; HttpOnly${secureFlag}`);
    
    // リクエストの基本情報をログ出力
    const isDebugMode = req.headers.get('x-auth-debug') === 'true' || 
                        req.nextUrl.searchParams.get('auth_debug') === 'true';
    
    if (isDebugMode) {
      console.log('認証ミドルウェア診断:', {
        url: req.url,
        path: req.nextUrl.pathname,
        cookies: req.cookies,
        headers: Object.fromEntries(req.headers.entries()),
      });
    }
    
    // セッション処理の堅牢化
    try {
      // Supabaseミドルウェアクライアントの初期化
      const supabase = createMiddlewareClient({ req, res });
      
      // セッションリフレッシュの拡張エラーハンドリング
      const { data, error } = await supabase.auth.getSession();
      
      // セッション検証診断
      if (isDebugMode) {
        if (error) {
          console.error('ミドルウェアセッション取得エラー:', error);
        } else if (data?.session) {
          console.log('セッション有効性確認:', {
            userId: data.session.user?.id.substring(0, 8) + '...',
            expiresIn: Math.floor((data.session.expires_at || 0) * 1000 - Date.now()) / 1000
          });
        } else {
          console.log('有効なセッションなし');
        }
      }
    } catch (sessionError) {
      // セッション処理エラーがあっても処理は継続
      console.error('セッション処理例外:', sessionError);
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