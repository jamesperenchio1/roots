/**
 * Simple structured logger.
 * In production, this should be wired to an error tracking service
 * (e.g. Sentry, LogRocket, or a custom endpoint).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

const isDev = import.meta.env.DEV;

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
    } else if (isDev) {
      console.log(prefix, message, context || '');
    }

    // In production, send errors to tracking service
    if (!isDev && level === 'error') {
      this.sendToRemote(entry);
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (isDev) this.log('debug', message, context);
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

  private sendToRemote(entry: LogEntry) {
    // TODO: Wire to Sentry, LogRocket, or custom endpoint
    // fetch('/api/log', { method: 'POST', body: JSON.stringify(entry) });
    console.warn('[Logger] Remote logging not configured', entry);
  }
}

export const logger = new Logger();
