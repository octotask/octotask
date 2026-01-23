/**
 * Central error handling index
 * Exports all error types and utilities for consistent error handling across the app
 */

export { BaseAppError, isAppError, normalizeError } from './BaseAppError';
export type { BaseAppError as IBaseAppError };

export { LLMError, LLMAuthError, LLMRateLimitError, LLMTokenLimitError, LLMTimeoutError, isLLMError } from './LLMError';

export {
  ApiError,
  ApiAuthError,
  ApiNotFoundError,
  ApiValidationError,
  ApiRateLimitError,
  ApiTimeoutError,
  ApiNetworkError,
  isApiError,
} from './ApiError';

/**
 * Error handler middleware for catch blocks
 * Provides typed error handling with proper narrowing
 */
export function handleError(
  error: unknown,
  context?: {
    operation?: string;
    userId?: string;
    requestId?: string;
  },
): {
  error: BaseAppError;
  shouldRetry: boolean;
  statusCode: number;
} {
  let appError: BaseAppError;

  if (error instanceof BaseAppError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = new BaseAppError(error.message, {
      cause: error,
    });
  } else {
    appError = new BaseAppError(String(error));
  }

  // Add context information
  if (context) {
    appError.context = {
      ...appError.context,
      ...context,
    };
  }

  return {
    error: appError,
    shouldRetry: appError.canRetry(),
    statusCode: appError.statusCode,
  };
}

/**
 * Safe error message extractor
 * Ensures error message is always a string, never throws
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof BaseAppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as any).message);
  }

  return 'An unknown error occurred';
}

/**
 * Safe error code extractor
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof BaseAppError) {
    return error.code;
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Safe error status code extractor
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof BaseAppError) {
    return error.statusCode;
  }

  return 500;
}
