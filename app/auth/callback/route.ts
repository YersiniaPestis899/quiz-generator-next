import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * OAuth認証コールバック処理
 * Googleログイン後にリダイレクトされ、認証コードをセッションと交換します
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // codeを使用してセッションを交換
    await supabase.auth.exchangeCodeForSession(code);
  }

  // ユーザーをメインページまたは指定されたリダイレクト先にリダイレクト
  return NextResponse.redirect(new URL('/', request.url));
}