/**
 * Structured Logging Utility
 *
 * Feature-flagged logging wrapper with levels, filtering, and formatting
 * Phase 3 - Logging Utility
 *
 * Features:
 * - Zero external dependencies
 * - Feature-flagged via environment variables
 * - Log levels (DEBUG, INFO, WARN, ERROR)
 * - Structured logging with context
 * - Color-coded console output (development)
 * - Timestamp tracking
 * - Namespace/component filtering
 */

/**
 * Log levels (ordered by severity)
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4, // Disable all logging
}

/**
 * Log context for structured logging
 */
export interface LogContext {
  [key: string]: any;
  component?: string;
  action?: string;
  userId?: string;
  organizationId?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  includeTimestamp: boolean;
  includeContext: boolean;
  colorize: boolean;
  namespace?: string;
}

/**
 * ANSI color codes for console output
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

/**
 * Get logger configuration from environment
 */
function getConfig(namespace?: string): LoggerConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  // Parse log level from environment
  const envLevel = process.env.NEXT_PUBLIC_LOG_LEVEL?.toUpperCase() || 'INFO';
  const level = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;

  return {
    // Enabled by default in development, disabled in test, configurable in production
    enabled: isTest
      ? false
      : process.env.NEXT_PUBLIC_LOGGING_ENABLED !== 'false',

    // Log level from environment
    level,

    // Include timestamp (always true)
    includeTimestamp: true,

    // Include context (configurable)
    includeContext: process.env.NEXT_PUBLIC_LOG_CONTEXT !== 'false',

    // Colorize in development
    colorize: isDevelopment && !isTest,

    // Namespace for filtering
    namespace,
  };
}

/**
 * Format timestamp
 */
function formatTimestamp(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const ms = now.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * Colorize text (only in development)
 */
function colorize(text: string, color: keyof typeof COLORS, colorizeEnabled: boolean): string {
  if (!colorizeEnabled) return text;
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

/**
 * Format log level badge
 */
function formatLevel(level: LogLevel, colorizeEnabled: boolean): string {
  switch (level) {
    case LogLevel.DEBUG:
      return colorize('[DEBUG]', 'gray', colorizeEnabled);
    case LogLevel.INFO:
      return colorize('[INFO] ', 'blue', colorizeEnabled);
    case LogLevel.WARN:
      return colorize('[WARN] ', 'yellow', colorizeEnabled);
    case LogLevel.ERROR:
      return colorize('[ERROR]', 'red', colorizeEnabled);
    default:
      return '[LOG]  ';
  }
}

/**
 * Format namespace
 */
function formatNamespace(namespace: string | undefined, colorizeEnabled: boolean): string {
  if (!namespace) return '';
  return colorize(`[${namespace}]`, 'cyan', colorizeEnabled) + ' ';
}

/**
 * Format context for display
 */
function formatContext(context: LogContext | undefined, colorizeEnabled: boolean): string {
  if (!context || Object.keys(context).length === 0) return '';

  const formatted = Object.entries(context)
    .map(([key, value]) => {
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return `${colorize(key, 'magenta', colorizeEnabled)}=${colorize(valueStr, 'white', colorizeEnabled)}`;
    })
    .join(' ');

  return `| ${formatted}`;
}

/**
 * Core logging function
 */
function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  config?: LoggerConfig
): void {
  const cfg = config || getConfig();

  // Check if logging is enabled
  if (!cfg.enabled) return;

  // Check if log level is sufficient
  if (level < cfg.level) return;

  // Build log parts
  const parts: string[] = [];

  // Timestamp
  if (cfg.includeTimestamp) {
    parts.push(colorize(formatTimestamp(), 'gray', cfg.colorize));
  }

  // Level badge
  parts.push(formatLevel(level, cfg.colorize));

  // Namespace
  if (cfg.namespace) {
    parts.push(formatNamespace(cfg.namespace, cfg.colorize));
  }

  // Message
  parts.push(message);

  // Context
  if (cfg.includeContext && context) {
    parts.push(formatContext(context, cfg.colorize));
  }

  // Output to appropriate console method
  const logLine = parts.join(' ');

  switch (level) {
    case LogLevel.DEBUG:
      console.debug(logLine);
      break;
    case LogLevel.INFO:
      console.log(logLine);
      break;
    case LogLevel.WARN:
      console.warn(logLine);
      break;
    case LogLevel.ERROR:
      console.error(logLine);
      break;
  }
}

/**
 * Logger class for namespaced logging
 */
export class Logger {
  private config: LoggerConfig;

  constructor(namespace?: string) {
    this.config = getConfig(namespace);
  }

  /**
   * Log debug message (lowest priority)
   */
  debug(message: string, context?: LogContext): void {
    log(LogLevel.DEBUG, message, context, this.config);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    log(LogLevel.INFO, message, context, this.config);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    log(LogLevel.WARN, message, context, this.config);
  }

  /**
   * Log error message (highest priority)
   */
  error(message: string, context?: LogContext): void {
    log(LogLevel.ERROR, message, context, this.config);
  }

  /**
   * Time a function execution
   */
  async time<T>(
    label: string,
    fn: () => Promise<T> | T,
    context?: LogContext
  ): Promise<T> {
    const start = performance.now();
    this.debug(`${label} started`, context);

    try {
      const result = await fn();
      const duration = Math.round(performance.now() - start);

      this.info(`${label} completed`, {
        ...context,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);

      this.error(`${label} failed`, {
        ...context,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.config.namespace);

    // Override log methods to include additional context
    const originalDebug = childLogger.debug.bind(childLogger);
    const originalInfo = childLogger.info.bind(childLogger);
    const originalWarn = childLogger.warn.bind(childLogger);
    const originalError = childLogger.error.bind(childLogger);

    childLogger.debug = (message: string, context?: LogContext) => {
      originalDebug(message, { ...additionalContext, ...context });
    };

    childLogger.info = (message: string, context?: LogContext) => {
      originalInfo(message, { ...additionalContext, ...context });
    };

    childLogger.warn = (message: string, context?: LogContext) => {
      originalWarn(message, { ...additionalContext, ...context });
    };

    childLogger.error = (message: string, context?: LogContext) => {
      originalError(message, { ...additionalContext, ...context });
    };

    return childLogger;
  }
}

/**
 * Create a logger instance
 *
 * @param namespace - Namespace for filtering logs (e.g., 'API', 'Database', 'Auth')
 * @returns Logger instance
 *
 * @example
 * ```typescript
 * const logger = createLogger('CampaignService');
 *
 * logger.info('Loading campaigns', { userId: user.id });
 * logger.warn('Rate limit approaching', { remaining: 10 });
 * logger.error('Failed to save campaign', { campaignId, error: err.message });
 *
 * // Time async operations
 * const data = await logger.time('fetchCampaigns', async () => {
 *   return await fetch('/api/campaigns');
 * }, { userId: user.id });
 * ```
 */
export function createLogger(namespace?: string): Logger {
  return new Logger(namespace);
}

/**
 * Global logger instance (for quick logging without namespace)
 */
export const logger = createLogger();

/**
 * Convenience functions (use global logger)
 */
export const debug = (message: string, context?: LogContext) => logger.debug(message, context);
export const info = (message: string, context?: LogContext) => logger.info(message, context);
export const warn = (message: string, context?: LogContext) => logger.warn(message, context);
export const error = (message: string, context?: LogContext) => logger.error(message, context);
