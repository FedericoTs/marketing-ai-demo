/**
 * API Route: /api/auth/check-admin
 * GET - Check if current user is admin
 *
 * Returns { isAdmin: boolean }
 */

import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/auth/admin';

export async function GET() {
  try {
    const isAdmin = await isCurrentUserAdmin();

    // Debug logging
    console.log('[Admin Check] isAdmin:', isAdmin);

    return NextResponse.json({
      isAdmin,
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json(
      { isAdmin: false },
      { status: 200 } // Return 200 with false rather than error
    );
  }
}
