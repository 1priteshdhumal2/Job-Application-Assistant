/**
 * Safe logging utility without leaking credentials or complex objects
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITIES: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger {
  private namespace: string;
  private minLevel: LogLevel;

  constructor(namespace: string, minLevel: LogLevel = "info") {
    this.namespace = namespace;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITIES[level] >= LEVEL_PRIORITIES[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${this.namespace}] ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message), ...args);
    }
  }
}

export function createLogger(
  namespace: string,
  level: LogLevel = "info",
): Logger {
  return new Logger(namespace, level);
}
