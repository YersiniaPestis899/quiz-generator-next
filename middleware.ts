import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for Supabase Auth
 * Refreshes session if expired and sets cookies
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Create Supabase client specific to this middleware
  const supabase = createMiddlewareClient({ req, res });
  
  // Refresh session if expired - required for Server Components
  await supabase.auth.getSession();
  
  return res;
}

// Specify routes that should trigger this middleware
export const config = {
  matcher: [
    // Apply to all routes except those starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - api/ routes that don't require authentication
    '/((?!_next/static|_next/image|favicon.ico|api/check-environment).*)',
  ],
};