import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import type { NextRequest } from 'next/dist/server/web/spec-extension/request';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  // 🟢 BULLETPROOF FIX: Added forgot-password and reset-password to auth pages
  const isAuthPage = 
    req.nextUrl.pathname.startsWith('/login') || 
    req.nextUrl.pathname.startsWith('/register') ||
    req.nextUrl.pathname.startsWith('/forgot-password') ||
    req.nextUrl.pathname.startsWith('/reset-password');

  if (isAuthPage) {
    if (token) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    let from = req.nextUrl.pathname;
    if (req.nextUrl.search) {
      from += req.nextUrl.search;
    }
    return NextResponse.redirect(
      new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
