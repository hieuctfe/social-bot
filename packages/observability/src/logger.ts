export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

/**
 * Console-based logger for dev/testing.
 * In production, replace with pino or similar.
 */
export class ConsoleLogger implements Logger {
  constructor(private readonly bindings: Record<string, unknown> = {}) {}

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('DEBUG', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('INFO', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('WARN', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('ERROR', message, context);
  }

  child(bindings: Record<string, unknown>): Logger {
    return new ConsoleLogger({ ...this.bindings, ...bindings });
  }

  private log(level: string, message: string, context?: Record<string, unknown>): void {
    const entry = {
      level,
      time: new Date().toISOString(),
      ...this.bindings,
      message,
      ...context,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  }
}

export const defaultLogger: Logger = new ConsoleLogger({ service: 'social-bot' });
