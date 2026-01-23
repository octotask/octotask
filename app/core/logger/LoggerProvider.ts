/**
 * Logger Provider Implementation
 *
 * Provides logger instances without creating circular dependencies.
 * This module is imported by stores and other modules.
 */

import type { ILogger, IScopedLogger, IDebugLogger, ILoggerProvider, LogLevel } from './LoggerInterface';

let defaultLogger: ILogger | null = null;
let debugLoggerInstance: IDebugLogger | null = null;
let loggerInitialized = false;

/**
 * LoggerProvider - Provides logger instances via dependency injection
 */
export class LoggerProvider implements ILoggerProvider {
  private static _instance: LoggerProvider;

  private constructor() {}

  static getInstance(): LoggerProvider {
    if (!LoggerProvider._instance) {
      LoggerProvider._instance = new LoggerProvider();
    }

    return LoggerProvider._instance;
  }

  /**
   * Initialize the logger provider with concrete implementations
   * Call this once during app startup
   */
  static async initialize(logger: ILogger, debugLogger?: IDebugLogger): Promise<void> {
    defaultLogger = logger;

    if (debugLogger) {
      debugLoggerInstance = debugLogger;
    }

    loggerInitialized = true;
  }

  getLogger(scope?: string): ILogger {
    if (!defaultLogger) {
      // Fallback to a no-op logger if not initialized
      return createNoOpLogger();
    }

    if (scope) {
      return createScopedLogger(defaultLogger, scope);
    }

    return defaultLogger;
  }

  getDebugLogger(): IDebugLogger | null {
    return debugLoggerInstance;
  }
}

/**
 * Create a no-op logger for emergency fallback
 */
function createNoOpLogger(): ILogger {
  return {
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    setLevel: () => {},
  };
}

/**
 * Create a scoped logger wrapper
 */
function createScopedLogger(baseLogger: ILogger, scope: string): IScopedLogger {
  return {
    scope,
    trace: (...messages: any[]) => baseLogger.trace(`[${scope}]`, ...messages),
    debug: (...messages: any[]) => baseLogger.debug(`[${scope}]`, ...messages),
    info: (...messages: any[]) => baseLogger.info(`[${scope}]`, ...messages),
    warn: (...messages: any[]) => baseLogger.warn(`[${scope}]`, ...messages),
    error: (...messages: any[]) => baseLogger.error(`[${scope}]`, ...messages),
    setLevel: (level: LogLevel) => baseLogger.setLevel(level),
  };
}

/**
 * Get the default logger provider instance
 */
export function getLoggerProvider(): ILoggerProvider {
  return LoggerProvider.getInstance();
}

/**
 * Check if logger is initialized
 */
export function isLoggerInitialized(): boolean {
  return loggerInitialized;
}
