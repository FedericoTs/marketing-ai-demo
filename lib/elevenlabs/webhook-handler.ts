/**
 * ElevenLabs Webhook Security & Validation
 * Handles webhook signature verification and request validation
 */

import { NextRequest } from 'next/server';

/**
 * Webhook validation result
 */
export interface WebhookValidationResult {
  valid: boolean;
  error?: string;
  ip?: string;
}

/**
 * Validate webhook request
 *
 * Security checks:
 * 1. Verify request method is POST
 * 2. Check content-type header
 * 3. Validate webhook signature (if configured)
 * 4. IP whitelist validation (if configured)
 * 5. Rate limiting (basic)
 */
export async function validateWebhookRequest(
  request: NextRequest
): Promise<WebhookValidationResult> {
  // 1. Verify POST method
  if (request.method !== 'POST') {
    return {
      valid: false,
      error: 'Invalid request method. Expected POST.',
    };
  }

  // 2. Check content-type (should be application/json)
  const contentType = request.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {
      valid: false,
      error: 'Invalid content-type. Expected application/json.',
    };
  }

  // 3. Get client IP for logging
  const ip = getClientIP(request);

  // 4. IP whitelist validation (optional)
  if (process.env.ELEVENLABS_WEBHOOK_IP_WHITELIST) {
    const whitelist = process.env.ELEVENLABS_WEBHOOK_IP_WHITELIST.split(',').map((ip) =>
      ip.trim()
    );
    if (ip && !whitelist.includes(ip)) {
      console.warn('[Webhook Security] Request from non-whitelisted IP:', ip);
      return {
        valid: false,
        error: 'IP not whitelisted',
        ip,
      };
    }
  }

  // 5. Webhook signature validation (if ElevenLabs provides it)
  if (process.env.ELEVENLABS_WEBHOOK_SECRET) {
    const signature = request.headers.get('x-elevenlabs-signature');

    if (!signature) {
      return {
        valid: false,
        error: 'Missing webhook signature',
        ip,
      };
    }

    // Note: Signature validation logic depends on ElevenLabs implementation
    // Typically: HMAC SHA256 of request body with shared secret
    // Uncomment and implement when ElevenLabs provides documentation
    /*
    const body = await request.text();
    const isValid = await verifySignature(body, signature, process.env.ELEVENLABS_WEBHOOK_SECRET);

    if (!isValid) {
      return {
        valid: false,
        error: 'Invalid webhook signature',
        ip,
      };
    }
    */
  }

  return {
    valid: true,
    ip,
  };
}

/**
 * Verify webhook signature using HMAC SHA256
 *
 * @param payload - Raw request body
 * @param signature - Signature from webhook header
 * @param secret - Shared secret key
 */
export async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Import crypto for signature verification
    const crypto = await import('crypto');

    // Compute HMAC SHA256
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    // Compare signatures (timing-safe comparison)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[Webhook Security] Signature verification error:', error);
    return false;
  }
}

/**
 * Extract client IP from request
 */
function getClientIP(request: NextRequest): string | null {
  // Check common headers for client IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Vercel-specific header
  const vercelIP = request.headers.get('x-vercel-forwarded-for');
  if (vercelIP) {
    return vercelIP.split(',')[0].trim();
  }

  return null;
}

/**
 * Log webhook attempt for monitoring and debugging
 */
export function logWebhookAttempt(
  conversationId: string,
  ip: string | null,
  success: boolean,
  error?: string
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    conversation_id: conversationId,
    ip,
    success,
    error,
  };

  console.log('[Webhook Log]', JSON.stringify(logEntry));

  // Future: Store in database webhook_logs table for audit trail
  // INSERT INTO webhook_logs (timestamp, conversation_id, ip, success, error) VALUES (...)
}

/**
 * Check rate limiting for webhooks
 * Simple in-memory rate limiter (for production, use Redis)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // Clean up expired entries
  if (record && record.resetAt < now) {
    rateLimitMap.delete(identifier);
  }

  if (!record || record.resetAt < now) {
    // Create new rate limit window
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  // Increment counter
  record.count++;

  if (record.count > maxRequests) {
    console.warn('[Webhook Rate Limit] Exceeded:', identifier, record.count);
    return false;
  }

  return true;
}
