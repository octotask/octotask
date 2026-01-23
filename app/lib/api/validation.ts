/**
 * Central validation utilities for all API routes
 * Ensures type-safe parsing and rejection of invalid payloads early
 */

import { z } from 'zod';

// Constants for size limits
export const VALIDATION_LIMITS = {
  MAX_COOKIE_SIZE: 4096, // Standard cookie size limit
  MAX_JSON_PAYLOAD: 10 * 1024 * 1024, // 10MB
  MAX_QUERY_PARAM_SIZE: 2048,
  MAX_STORAGE_ITEM_SIZE: 5 * 1024 * 1024, // 5MB for localStorage/sessionStorage
} as const;

/**
 * Safe JSON parse with schema validation
 * @param data - Data to parse
 * @param schema - Zod schema for validation
 * @returns Parsed and validated data or error
 */
export async function safeParse<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
): Promise<{ success: true; data: T } | { success: false; error: z.ZodError }> {
  try {
    const result = schema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return { success: false, error: result.error };
  } catch (error) {
    const zodError = new z.ZodError([
      {
        code: 'custom',
        message: error instanceof Error ? error.message : 'Unknown parsing error',
        path: [],
      },
    ]);
    return { success: false, error: zodError };
  }
}

/**
 * Safe JSON.parse with size validation
 * @param jsonString - JSON string to parse
 * @param maxSize - Maximum allowed size in bytes
 * @returns Parsed object or error
 */
export function safeJSONParse(
  jsonString: string,
  maxSize: number = VALIDATION_LIMITS.MAX_JSON_PAYLOAD,
): { success: true; data: unknown } | { success: false; error: Error } {
  try {
    // Check size first
    const sizeInBytes = new Blob([jsonString]).size;

    if (sizeInBytes > maxSize) {
      return {
        success: false,
        error: new Error(`JSON payload exceeds maximum size of ${maxSize} bytes`),
      };
    }

    const parsed = JSON.parse(jsonString);

    return { success: true, data: parsed };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to parse JSON'),
    };
  }
}

/**
 * Safe JSON.stringify with size validation
 * @param obj - Object to stringify
 * @param maxSize - Maximum allowed size in bytes
 * @returns JSON string or error
 */
export function safeJSONStringify(
  obj: unknown,
  maxSize: number = VALIDATION_LIMITS.MAX_JSON_PAYLOAD,
): { success: true; data: string } | { success: false; error: Error } {
  try {
    const stringified = JSON.stringify(obj);
    const sizeInBytes = new Blob([stringified]).size;

    if (sizeInBytes > maxSize) {
      return {
        success: false,
        error: new Error(`Stringified JSON exceeds maximum size of ${maxSize} bytes`),
      };
    }

    return { success: true, data: stringified };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to stringify JSON'),
    };
  }
}

/**
 * Parse and validate request body with schema
 * @param request - Fetch API Request object
 * @param schema - Zod schema for validation
 * @returns Parsed and validated data or error
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const contentType = request.headers.get('content-type');

    if (!contentType?.includes('application/json')) {
      return { success: false, error: 'Content-Type must be application/json' };
    }

    const bodyText = await request.text();
    const parseResult = safeJSONParse(bodyText);

    if (!parseResult.success) {
      return { success: false, error: `Invalid JSON: ${parseResult.error.message}` };
    }

    const validateResult = await safeParse(parseResult.data, schema);

    if (!validateResult.success) {
      const errorMessages = validateResult.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      return { success: false, error: `Validation error: ${errorMessages}` };
    }

    return { success: true, data: validateResult.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error parsing request body',
    };
  }
}

/**
 * Parse and validate query parameters with schema
 * @param url - URL or URL string
 * @param schema - Zod schema for validation
 * @returns Parsed and validated params or error
 */
export function validateQueryParams<T>(
  url: URL | string,
  schema: z.ZodSchema<T>,
): { success: true; data: T } | { success: false; error: string } {
  try {
    const urlObj = typeof url === 'string' ? new URL(url) : url;
    const params: Record<string, string | string[]> = {};

    urlObj.searchParams.forEach((value, key) => {
      const existing = params[key];

      if (existing) {
        params[key] = Array.isArray(existing) ? [...existing, value] : [existing as string, value];
      } else {
        params[key] = value;
      }
    });

    const validateResult = z.record(z.any()).safeParse(params);

    if (!validateResult.success) {
      return { success: false, error: 'Failed to parse query parameters' };
    }

    const schemaResult = schema.safeParse(validateResult.data);

    if (!schemaResult.success) {
      const errorMessages = schemaResult.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join('; ');
      return { success: false, error: `Query validation error: ${errorMessages}` };
    }

    return { success: true, data: schemaResult.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error parsing query parameters',
    };
  }
}

/**
 * Common API schemas
 */
export const commonSchemas = {
  /**
   * Optional API key schema
   */
  apiKey: z.string().min(1, 'API key cannot be empty').max(1000),

  /**
   * Email schema
   */
  email: z.string().email('Invalid email format').max(255),

  /**
   * URL schema
   */
  url: z.string().url('Invalid URL format').max(2048),

  /**
   * Pagination schema
   */
  pagination: z.object({
    page: z.number().int().positive('Page must be a positive integer').default(1),
    limit: z.number().int().positive('Limit must be a positive integer').max(100).default(20),
  }),

  /**
   * Provider name schema
   */
  provider: z.enum(['openai', 'anthropic', 'gemini', 'cohere', 'bedrock']),

  /**
   * Model name schema
   */
  model: z.string().min(1, 'Model name cannot be empty').max(255),
} as const;

/**
 * Create a validated response with proper error handling
 * @param data - Response data
 * @param status - HTTP status code
 */
export function createValidatedResponse<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create an error response with schema validation
 * @param error - Error message or ZodError
 * @param status - HTTP status code
 */
export function createErrorResponse(error: string | z.ZodError, status: number = 400): Response {
  let errorData: Record<string, unknown>;

  if (error instanceof z.ZodError) {
    errorData = {
      error: 'Validation error',
      details: error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    };
  } else {
    errorData = {
      error: typeof error === 'string' ? error : 'An error occurred',
    };
  }

  return createValidatedResponse(errorData, status);
}

/**
 * Defer heavy JSON parsing with requestIdleCallback
 * Falls back to immediate parsing if requestIdleCallback not supported
 * @param jsonString - JSON string to parse
 * @param schema - Optional Zod schema for validation
 */
export function deferJsonParsing<T = unknown>(jsonString: string, schema?: z.ZodSchema<T>): Promise<T | unknown> {
  return new Promise((resolve, reject) => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        try {
          const parseResult = safeJSONParse(jsonString);

          if (!parseResult.success) {
            reject(parseResult.error);
            return;
          }

          if (schema) {
            const validateResult = z.lazy(() => schema).safeParse(parseResult.data);

            if (validateResult.success) {
              resolve(validateResult.data);
            } else {
              reject(validateResult.error);
            }
          } else {
            resolve(parseResult.data);
          }
        } catch (error) {
          reject(error);
        }
      });
    } else {
      // Fallback to immediate parsing
      try {
        const parseResult = safeJSONParse(jsonString);

        if (!parseResult.success) {
          reject(parseResult.error);
          return;
        }

        if (schema) {
          const validateResult = schema.safeParse(parseResult.data);

          if (validateResult.success) {
            resolve(validateResult.data);
          } else {
            reject(validateResult.error);
          }
        } else {
          resolve(parseResult.data);
        }
      } catch (error) {
        reject(error);
      }
    }
  });
}
