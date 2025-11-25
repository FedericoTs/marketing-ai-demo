/**
 * Environment Variable Validation
 *
 * Validates all required environment variables on application startup
 * Prevents runtime errors from missing configuration
 *
 * Usage: Import and call validateEnv() in root layout or middleware
 */

interface EnvConfig {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // App Config
  NEXT_PUBLIC_APP_URL: string;

  // Encryption
  LANDING_PAGE_ENCRYPTION_KEY: string;

  // API Keys (optional in development)
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;

  // Stripe (optional in development)
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;

  // PostGrid (optional in development)
  POSTGRID_API_KEY?: string;

  // Resend (optional in development)
  RESEND_API_KEY?: string;
}

class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * Validate environment variables
 * @param strict - Fail on missing optional vars (production mode)
 */
export function validateEnv(strict: boolean = false): EnvConfig {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const required: (keyof EnvConfig)[] = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_APP_URL',
    'LANDING_PAGE_ENCRYPTION_KEY',
  ];

  // Optional but recommended
  const optional: (keyof EnvConfig)[] = [
    'OPENAI_API_KEY',
    'ELEVENLABS_API_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'POSTGRID_API_KEY',
    'RESEND_API_KEY',
  ];

  // Check required variables
  for (const key of required) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Check optional variables (warn in strict mode)
  if (strict) {
    for (const key of optional) {
      const value = process.env[key];
      if (!value || value.trim() === '') {
        warnings.push(`Missing optional environment variable: ${key}`);
      }
    }
  }

  // Throw error if any required variables are missing
  if (errors.length > 0) {
    throw new EnvValidationError(
      `Environment validation failed:\n${errors.join('\n')}\n\n` +
      `Please check your .env.local file and ensure all required variables are set.`
    );
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('[Environment Validation] Warnings:');
    warnings.forEach(w => console.warn(`  - ${w}`));
  }

  // Validate encryption key length (must be 32 bytes for AES-256)
  const encryptionKey = process.env.LANDING_PAGE_ENCRYPTION_KEY;
  if (encryptionKey && encryptionKey.length !== 32) {
    throw new EnvValidationError(
      `LANDING_PAGE_ENCRYPTION_KEY must be exactly 32 characters (256 bits). ` +
      `Current length: ${encryptionKey.length}. ` +
      `Generate a new key with: openssl rand -base64 32`
    );
  }

  // Validate encryption key is not default value
  if (encryptionKey === 'dev-key-change-in-production-32b') {
    if (process.env.NODE_ENV === 'production') {
      throw new EnvValidationError(
        'LANDING_PAGE_ENCRYPTION_KEY is still set to default dev value in production! ' +
        'Generate a new key with: openssl rand -base64 32'
      );
    } else {
      console.warn('[Environment Validation] Warning: Using default encryption key in development');
    }
  }

  // Validate URL formats
  try {
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  } catch {
    throw new EnvValidationError(
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`
    );
  }

  try {
    new URL(process.env.NEXT_PUBLIC_APP_URL!);
  } catch {
    throw new EnvValidationError(
      `NEXT_PUBLIC_APP_URL is not a valid URL: ${process.env.NEXT_PUBLIC_APP_URL}`
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
    LANDING_PAGE_ENCRYPTION_KEY: process.env.LANDING_PAGE_ENCRYPTION_KEY!,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    POSTGRID_API_KEY: process.env.POSTGRID_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  };
}

/**
 * Get validated environment config
 * Caches result to avoid re-validation
 */
let cachedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (!cachedEnv) {
    cachedEnv = validateEnv(process.env.NODE_ENV === 'production');
  }
  return cachedEnv;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Get app URL (with trailing slash removed)
 */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, '');
}

/**
 * Initialize environment validation on app startup
 * Call this in root layout or middleware
 */
export function initEnv(): void {
  try {
    validateEnv(process.env.NODE_ENV === 'production');
    console.log('✅ Environment validation passed');
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(`\n❌ ${error.message}\n`);
      if (process.env.NODE_ENV === 'production') {
        throw error; // Fail fast in production
      }
    }
    throw error;
  }
}
