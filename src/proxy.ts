import {
  clerkMiddleware as _clerkMiddleware,
  createRouteMatcher as _createRouteMatcher,
} from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';

// NOTE: Clerk edge middleware is intentionally bypassed to allow local smoke
// testing without a Clerk tenant. Per user request, the Clerk-by-pass is
// PRESERVED (not fixed) — see NeuralJEE_FAANG_Code_Audit.md §4.1–4.4. When
// ready to enforce auth at the edge, rename this file to `middleware.ts` and
// wire up _clerkMiddleware with the public-route matcher below.
const _isPublicRoute = _createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk(.*)',
]);
void _clerkMiddleware;
void _isPublicRoute;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
