/**
 * Next.js Middleware
 * Handles:
 * 1. Rate limiting (optional, feature-flagged)
 * 2. Supabase authentication for protected routes
 */

import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { checkRateLimit } from '@/lib/middleware/rate-limiter';

export async function middleware(request: NextRequest) {
  // PHASE 4: Rate Limiting (optional, feature-flagged)
  // Check rate limit before auth to prevent abuse
  const rateLimitResult = checkRateLimit(request);

  if (rateLimitResult.limited) {
    // Return 429 Too Many Requests with rate limit headers
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: rateLimitResult.message,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...rateLimitResult.headers,
        },
      }
    );
  }

  // Continue with auth middleware
  const response = await updateSession(request);

  // Add rate limit headers to successful responses
  Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handle auth separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
