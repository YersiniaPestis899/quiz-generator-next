import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Supabase Auth OAuth コールバックハンドラー
 * OAuth認証後にリダイレクトされるエンドポイント
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  // codeパラメータがない場合はエラーページへリダイレクト
  if (!code) {
    return NextResponse.redirect(new URL('/auth?error=missing_code', request.url));
  }
  
  // Supabaseクライアントを初期化
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  try {
    // 認証コードを使用してセッションを交換
    await supabase.auth.exchangeCodeForSession(code);
    
    // 認証成功、ホームページへリダイレクト
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Auth callback error:', error);
    
    // 認証失敗、エラーページへリダイレクト
    return NextResponse.redirect(new URL('/auth?error=auth_failed', request.url));
  }
}