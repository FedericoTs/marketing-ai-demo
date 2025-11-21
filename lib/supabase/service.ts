/**
 * Supabase Service Role Client
 *
 * Creates a Supabase client with service role key for server-side operations
 * that need to bypass Row Level Security (RLS).
 *
 * ⚠️ SECURITY WARNING:
 * - Service role key bypasses ALL RLS policies
 * - Only use in API routes and server-side code
 * - NEVER expose service role key to client-side code
 * - Validate all inputs before database operations
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

let serviceClient: ReturnType<typeof createSupabaseClient<Database>> | null = null;

/**
 * Create Supabase client with service role key (bypasses RLS)
 *
 * Use cases:
 * - Public API routes (demo system, webhooks)
 * - Background jobs and cron tasks
 * - Admin operations
 * - Data migrations
 */
export function createServiceClient() {
  // Reuse existing client if available
  if (serviceClient) {
    return serviceClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  serviceClient = createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceClient;
}
