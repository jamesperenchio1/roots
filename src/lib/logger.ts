/**
 * Simple structured logger.
 * Errors and warnings are forwarded to Sentry when a DSN is configured.
 */

import { Scope, captureException, captureMessage } from '@sentry/react';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

function envBool(value: unknown): boolean {
  return value === true || value === 'true';
}

function isDev(): boolean {
  return envBool(import.meta.env.DEV);
}

function sentryEnabled(): boolean {
  return !isDev() && Boolean(import.meta.env.VITE_SENTRY_DSN);
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

    // Console output
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    if (level === 'error') {
      console.error(prefix, message, context || '', error || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, context || '');
    } else if (isDev()) {
      console.log(prefix, message, context || '');
    }

    // Forward to Sentry
    if (sentryEnabled()) {
      this.sendToSentry(entry);
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
      } else if (entry.level === 'warn') {
        captureMessage(entry.message, { level: 'warning', extra: entry.context });
      } else {
        captureMessage(entry.message, { level: entry.level, extra: entry.context });
      }
    } catch (e) {
      // Fail silently so logging never crashes the app.
      console.warn('[Logger] Sentry send failed', e);
    }
  }
}

export const logger = new Logger();
