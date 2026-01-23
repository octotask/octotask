import { BaseAppError } from './BaseAppError';

/**
 * Error specific to LLM/AI model operations
 */
export class LLMError extends BaseAppError {
  readonly provider?: string;
  readonly model?: string;
  readonly tokenCount?: number;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      context?: Record<string, any>;
      cause?: Error;
      isRetryable?: boolean;
      provider?: string;
      model?: string;
      tokenCount?: number;
    } = {},
  ) {
    const { provider, model, tokenCount, ...baseOptions } = options;

    // Determine if error is retryable based on message patterns
    const isRetryable =
      options.isRetryable ??
      (message.includes('rate limit') ||
        message.includes('timeout') ||
        message.includes('temporary') ||
        message.includes('503') ||
        message.includes('429'));

    // Determine appropriate HTTP status code
    const statusCode = options.statusCode ?? determineStatusCode(message);

    super(message, {
      code: options.code || 'LLM_ERROR',
      statusCode,
      isRetryable,
      ...baseOptions,
    });

    this.name = 'LLMError';
    this.provider = provider;
    this.model = model;
    this.tokenCount = tokenCount;

    Object.setPrototypeOf(this, LLMError.prototype);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      provider: this.provider,
      model: this.model,
      tokenCount: this.tokenCount,
    };
  }
}

/**
 * Specific LLM error subtypes
 */
export class LLMAuthError extends LLMError {
  constructor(message: string, options: ConstructorParameters<typeof LLMError>[1] = {}) {
    super(message, {
      code: 'LLM_AUTH_ERROR',
      statusCode: 401,
      isRetryable: false,
      ...options,
    });
    this.name = 'LLMAuthError';
    Object.setPrototypeOf(this, LLMAuthError.prototype);
  }
}

export class LLMRateLimitError extends LLMError {
  readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, options: ConstructorParameters<typeof LLMError>[1] = {}) {
    super(message, {
      code: 'LLM_RATE_LIMIT',
      statusCode: 429,
      isRetryable: true,
      ...options,
    });
    this.name = 'LLMRateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, LLMRateLimitError.prototype);
  }
}

export class LLMTokenLimitError extends LLMError {
  constructor(message: string, options: ConstructorParameters<typeof LLMError>[1] = {}) {
    super(message, {
      code: 'LLM_TOKEN_LIMIT',
      statusCode: 400,
      isRetryable: false,
      ...options,
    });
    this.name = 'LLMTokenLimitError';
    Object.setPrototypeOf(this, LLMTokenLimitError.prototype);
  }
}

export class LLMTimeoutError extends LLMError {
  constructor(message: string, options: ConstructorParameters<typeof LLMError>[1] = {}) {
    super(message, {
      code: 'LLM_TIMEOUT',
      statusCode: 504,
      isRetryable: true,
      ...options,
    });
    this.name = 'LLMTimeoutError';
    Object.setPrototypeOf(this, LLMTimeoutError.prototype);
  }
}

/**
 * Determine appropriate HTTP status code from error message
 */
function determineStatusCode(message: string): number {
  if (message.includes('unauthorized') || message.includes('invalid api key')) {
    return 401;
  }

  if (message.includes('not found')) {
    return 404;
  }

  if (message.includes('rate limit')) {
    return 429;
  }

  if (message.includes('timeout')) {
    return 504;
  }

  return 500;
}

/**
 * Type guard for LLMError
 */
export function isLLMError(error: unknown): error is LLMError {
  return error instanceof LLMError;
}
