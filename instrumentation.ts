/**
 * Server Instrumentation
 *
 * Runs once when the server starts (both dev and production)
 * Used for environment validation and startup tasks
 *
 * Reference: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

import { initEnv } from './lib/config/env-validation';

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🚀 Initializing server...');

    // Validate environment variables
    try {
      initEnv();
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1); // Fail fast in production
      }
    }

    console.log('✅ Server initialization complete');
  }
}
