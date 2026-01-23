/**
 * Base error class for all application errors
 * Provides structured error handling with serialization and observability
 */
export class BaseAppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly context?: Record<string, any>;
  readonly cause?: Error;
  readonly timestamp: string;
  readonly isRetryable: boolean;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      context?: Record<string, any>;
      cause?: Error;
      isRetryable?: boolean;
    } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code || 'INTERNAL_ERROR';
    this.statusCode = options.statusCode || 500;
    this.context = options.context;
    this.cause = options.cause;
    this.timestamp = new Date().toISOString();
    this.isRetryable = options.isRetryable ?? false;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, BaseAppError.prototype);
  }

  /**
   * Serialize error for logging and transmission
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp,
      isRetryable: this.isRetryable,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
      cause: this.cause
        ? {
            message: this.cause.message,
            stack: process.env.NODE_ENV === 'development' ? this.cause.stack : undefined,
          }
        : undefined,
    };
  }

  /**
   * Format error for console/logging
   */
  toString(): string {
    const context = this.context ? ` | Context: ${JSON.stringify(this.context)}` : '';
    const cause = this.cause ? ` | Cause: ${this.cause.message}` : '';

    return `[${this.code}] ${this.message}${context}${cause}`;
  }

  /**
   * Check if this error can be retried
   */
  canRetry(): boolean {
    return this.isRetryable;
  }
}

/**
 * Type guard for BaseAppError
 */
export function isAppError(error: unknown): error is BaseAppError {
  return error instanceof BaseAppError;
}

/**
 * Normalize any error to BaseAppError
 */
export function normalizeError(error: unknown): BaseAppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new BaseAppError(error.message, {
      code: 'UNKNOWN_ERROR',
      cause: error,
    });
  }

  return new BaseAppError(String(error), {
    code: 'UNKNOWN_ERROR',
  });
}
