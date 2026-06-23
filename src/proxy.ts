import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define which routes are publicly accessible (no auth required)
const isPublicRoute = createRouteMatcher([
  '/',                          // Landing page
  '/sign-in(.*)',               // Clerk sign-in (catches all sub-routes)
  '/sign-up(.*)',               // Clerk sign-up
  '/api/webhooks/(.*)',         // Clerk webhook (signed by Clerk, not user)
]);

const handler = clerkMiddleware(async (auth, request) => {
  // If the route is not public, require authentication
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export function proxy(request: any, event: any) {
  return handler(request, event);
}

export const config = {
  // Run proxy on all routes EXCEPT static files and Next.js internals
  matcher: [
    // Match all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
