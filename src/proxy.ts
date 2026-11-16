import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextMiddleware, NextRequest } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { isClerkConfigured } from '@/lib/clerk-auth';
import { SESSION_COOKIE } from '@/lib/session';

const isProtectedRoute = createRouteMatcher([
  '/app(.*)',
  '/studio(.*)',
  '/api/studio(.*)',
  '/api/publish(.*)',
  '/api/setup(.*)',
  '/api/hash(.*)',
  '/api/pipes(.*)',
]);

function buildReturnPath(req: NextRequest): string {
  const pathname = req.nextUrl.pathname.startsWith('/studio')
    ? req.nextUrl.pathname.replace(/^\/studio/, '/app')
    : req.nextUrl.pathname;
  return `${pathname}${req.nextUrl.search}`;
}

let cachedClerkHandler: NextMiddleware | null = null;

function getClerkProxyHandler(): NextMiddleware {
  if (cachedClerkHandler) return cachedClerkHandler;
  const handler = clerkMiddleware(async (auth, req: NextRequest) => {
    if (!isProtectedRoute(req)) {
      return NextResponse.next();
    }

    const { userId } = await auth();
    if (userId) {
      if (req.nextUrl.pathname.startsWith('/studio')) {
        return NextResponse.redirect(new URL(buildReturnPath(req), req.url));
      }
      return NextResponse.next();
    }

    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sign in to use asterisk.' }, { status: 401 });
    }

    const login = new URL('/login', req.url);
    login.searchParams.set('next', buildReturnPath(req));
    return NextResponse.redirect(login);
  }) as unknown as NextMiddleware;
  cachedClerkHandler = handler;
  return handler;
}

/**
 * Auth gate for `/app` and its API routes, plus global Clerk session detection
 * across marketing pages so returning Pipes members are recognized immediately.
 */
export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isClerkConfigured()) {
    return getClerkProxyHandler()(request, event);
  }

  if (!isProtectedRoute(request)) {
    return NextResponse.next();
  }

  if (request.cookies.get(SESSION_COOKIE)?.value) {
    if (request.nextUrl.pathname.startsWith('/studio')) {
      return NextResponse.redirect(new URL(buildReturnPath(request), request.url));
    }
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Sign in to use asterisk.' }, { status: 401 });
  }

  const login = new URL('/login', request.url);
  login.searchParams.set('next', buildReturnPath(request));
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
