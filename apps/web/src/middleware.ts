import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const publicRoutes = ['/', '/login', '/register', '/api/auth'];

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthenticated = !!req.auth;
  const isPublicRoute = publicRoutes.some(
    (route) => nextUrl.pathname === route || nextUrl.pathname.startsWith('/api/auth'),
  );

  // Redirect authenticated users from auth pages to dashboard
  if (isAuthenticated && (nextUrl.pathname === '/login' || nextUrl.pathname === '/register')) {
    return NextResponse.redirect(new URL('/inbox', nextUrl));
  }

  // Redirect unauthenticated users from protected routes to login
  if (!isAuthenticated && !isPublicRoute) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
