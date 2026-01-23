/**
 * Logger Dependency Injection Interface
 *
 * This interface defines the contract for logging without circular dependencies.
 * Stores and other modules should depend on this interface, not concrete implementations.
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'none';

export interface ILogger {
  trace(...messages: any[]): void;
  debug(...messages: any[]): void;
  info(...messages: any[]): void;
  warn(...messages: any[]): void;
  error(...messages: any[]): void;
  setLevel(level: LogLevel): void;
}

export interface IScopedLogger extends ILogger {
  scope: string;
}

/**
 * Debug Logger Interface
 *
 * Separate interface for debug logging functionality to avoid circular dependencies
 */
export interface IDebugLogger {
  initialize(): void;
  startCapture(): void;
  stopCapture(): void;
  enableDebugMode(): void;
  disableDebugMode(): void;
  getStatus(): {
    initialized: boolean;
    capturing: boolean;
    enabled: boolean;
  };
  updateConfig(config: Record<string, any>): void;
  captureLog(entry: any): void;
  captureError(entry: any): void;
  captureNetworkRequest(request: any): void;
  captureUserAction(action: string, target?: string, data?: any): void;
  captureTerminalLog(entry: any): void;
  generateDebugLog(): Promise<any>;
}

/**
 * Logger Provider Interface
 *
 * Used to provide logger instances to modules via dependency injection
 */
export interface ILoggerProvider {
  getLogger(scope?: string): ILogger;
  getDebugLogger(): IDebugLogger | null;
}
