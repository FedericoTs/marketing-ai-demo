/**
 * OAuth Callback Route Handler
 *
 * This route handles the OAuth callback from providers like Google.
 * It exchanges the auth code for a session and redirects to the dashboard.
 *
 * Required for: Google OAuth, Email confirmation links
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('[Auth Callback] OAuth error:', error, error_description);
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(error_description || error)}`, requestUrl.origin)
    );
  }

  if (code) {
    const supabase = await createClient();

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[Auth Callback] Code exchange error:', exchangeError);
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      );
    }

    if (data.user) {
      console.log('[Auth Callback] Successfully authenticated user:', data.user.email);

      // For OAuth users, create Stripe customer in background (fire-and-forget)
      // This is done via the session created on the client side
      // The signup page handles this for email/password users

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // No code present, redirect to login
  console.warn('[Auth Callback] No code provided');
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin));
}
