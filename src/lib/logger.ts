/**
 * Simple structured logger.
 * Errors and warnings are forwarded to Sentry when a DSN is configured.
 * Info/debug logs stay local; PII is scrubbed before leaving the browser.
 */

import { Scope, captureException, captureMessage } from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

const SENSITIVE_KEYS = [
  'email',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'apikey',
  'api_key',
  'secret',
  'authorization',
  'promptpay_id',
  'phone',
  'address',
];

function envBool(value: unknown): boolean {
  return value === true || value === 'true';
}

function isDev(): boolean {
  return envBool(process.env.NODE_ENV === 'development');
}

function sentryEnabled(): boolean {
  return !isDev() && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => lower.includes(s));
}

function scrubValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Redact anything that looks like an email, JWT, or long token.
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '[REDACTED_EMAIL]';
    if (/^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i.test(value)) return '[REDACTED_JWT]';
    if (/^[A-Za-z0-9_=-]{32,}$/i.test(value)) return '[REDACTED_TOKEN]';
  }
  return value;
}

function scrubContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;
  const scrubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (isSensitiveKey(key)) {
      scrubbed[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      scrubbed[key] = scrubContext(value as Record<string, unknown>);
    } else {
      scrubbed[key] = scrubValue(value);
    }
  }
  return scrubbed;
}

class Logger {
  private buffer: LogEntry[] = [];
  private maxBuffer = 100;

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    this.buffer.push(entry);
    if (this.buffer.length > this.maxBuffer) {
      this.buffer.shift();
    }

    // Console output: only in development; never print context in production.
    if (isDev()) {
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
      if (level === 'error') {
        console.error(prefix, message, context || '', error || '');
      } else if (level === 'warn') {
        console.warn(prefix, message, context || '');
      } else {
        console.log(prefix, message, context || '');
      }
    }

    // Forward only warnings and errors to Sentry, and scrub context first.
    if (sentryEnabled() && (level === 'warn' || level === 'error')) {
      this.sendToSentry({ ...entry, context: scrubContext(entry.context) });
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (isDev()) this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log('error', message, context, error);
  }

  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  private sendToSentry(entry: LogEntry) {
    try {
      const scope = new Scope();
      if (entry.context) scope.setContext('logger', entry.context);
      if (entry.level === 'error') {
        captureException(entry.error || new Error(entry.message), scope);
      } else {
        captureMessage(entry.message, { level: 'warning', extra: entry.context });
      }
    } catch (e) {
      // Fail silently so logging never crashes the app.
      if (isDev()) console.warn('[Logger] Sentry send failed', e);
    }
  }
}

export const logger = new Logger();
