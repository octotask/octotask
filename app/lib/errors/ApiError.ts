import { BaseAppError } from './BaseAppError';

/**
 * Error specific to API operations and HTTP requests
 */
export class ApiError extends BaseAppError {
  readonly method?: string;
  readonly url?: string;
  readonly responseStatus?: number;
  readonly responseData?: any;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      context?: Record<string, any>;
      cause?: Error;
      isRetryable?: boolean;
      method?: string;
      url?: string;
      responseStatus?: number;
      responseData?: any;
    } = {},
  ) {
    const { method, url, responseStatus, responseData, ...baseOptions } = options;

    // Determine if error is retryable based on status code
    const isRetryable =
      options.isRetryable ??
      (responseStatus !== undefined && (responseStatus === 429 || responseStatus === 503 || responseStatus >= 500));

    // Use response status as HTTP status code if available
    const statusCode = options.statusCode ?? responseStatus ?? 500;

    super(message, {
      code: options.code || 'API_ERROR',
      statusCode,
      isRetryable,
      ...baseOptions,
    });

    this.name = 'ApiError';
    this.method = method;
    this.url = url;
    this.responseStatus = responseStatus;
    this.responseData = responseData;

    Object.setPrototypeOf(this, ApiError.prototype);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      method: this.method,
      url: this.url,
      responseStatus: this.responseStatus,
      responseData: this.responseData,
    };
  }
}

/**
 * Specific API error subtypes
 */
export class ApiAuthError extends ApiError {
  constructor(message: string, options: ConstructorParameters<typeof ApiError>[1] = {}) {
    super(message, {
      code: 'API_AUTH_ERROR',
      statusCode: 401,
      isRetryable: false,
      ...options,
    });
    this.name = 'ApiAuthError';
    Object.setPrototypeOf(this, ApiAuthError.prototype);
  }
}

export class ApiNotFoundError extends ApiError {
  constructor(message: string, options: ConstructorParameters<typeof ApiError>[1] = {}) {
    super(message, {
      code: 'API_NOT_FOUND',
      statusCode: 404,
      isRetryable: false,
      ...options,
    });
    this.name = 'ApiNotFoundError';
    Object.setPrototypeOf(this, ApiNotFoundError.prototype);
  }
}

export class ApiValidationError extends ApiError {
  readonly validationErrors?: Record<string, string[]>;

  constructor(
    message: string,
    validationErrors?: Record<string, string[]>,
    options: ConstructorParameters<typeof ApiError>[1] = {},
  ) {
    super(message, {
      code: 'API_VALIDATION_ERROR',
      statusCode: 400,
      isRetryable: false,
      ...options,
    });
    this.name = 'ApiValidationError';
    this.validationErrors = validationErrors;
    Object.setPrototypeOf(this, ApiValidationError.prototype);
  }
}

export class ApiRateLimitError extends ApiError {
  readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, options: ConstructorParameters<typeof ApiError>[1] = {}) {
    super(message, {
      code: 'API_RATE_LIMIT',
      statusCode: 429,
      isRetryable: true,
      ...options,
    });
    this.name = 'ApiRateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, ApiRateLimitError.prototype);
  }
}

export class ApiTimeoutError extends ApiError {
  constructor(message: string, options: ConstructorParameters<typeof ApiError>[1] = {}) {
    super(message, {
      code: 'API_TIMEOUT',
      statusCode: 504,
      isRetryable: true,
      ...options,
    });
    this.name = 'ApiTimeoutError';
    Object.setPrototypeOf(this, ApiTimeoutError.prototype);
  }
}

export class ApiNetworkError extends ApiError {
  constructor(message: string, options: ConstructorParameters<typeof ApiError>[1] = {}) {
    super(message, {
      code: 'API_NETWORK_ERROR',
      statusCode: 503,
      isRetryable: true,
      ...options,
    });
    this.name = 'ApiNetworkError';
    Object.setPrototypeOf(this, ApiNetworkError.prototype);
  }
}

/**
 * Type guard for ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
