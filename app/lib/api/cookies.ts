import type { ProviderSettings } from '~/types/environment';
import { z } from 'zod';
import { safeJSONParse, VALIDATION_LIMITS } from './validation';

export function parseCookies(cookieHeader: string | null) {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  // Validate cookie header size
  if (new Blob([cookieHeader]).size > VALIDATION_LIMITS.MAX_COOKIE_SIZE) {
    console.warn('Cookie header exceeds maximum allowed size');
    return cookies;
  }

  // Split the cookie string by semicolons and spaces
  const items = cookieHeader.split(';').map((cookie) => cookie.trim());

  items.forEach((item) => {
    const [name, ...rest] = item.split('=');

    if (name && rest.length > 0) {
      // Decode the name and value, and join value parts in case it contains '='
      const decodedName = decodeURIComponent(name.trim());
      const decodedValue = decodeURIComponent(rest.join('=').trim());
      cookies[decodedName] = decodedValue;
    }
  });

  return cookies;
}

/**
 * @deprecated usage of cookies for API keys is insecure. Use vault.client.ts instead.
 */
export function getApiKeysFromCookie(cookieHeader: string | null): Record<string, string> {
  const cookies = parseCookies(cookieHeader);
  const apiKeysStr = cookies.apiKeys;

  if (!apiKeysStr) {
    return {};
  }

  const parseResult = safeJSONParse(apiKeysStr, VALIDATION_LIMITS.MAX_COOKIE_SIZE);

  if (!parseResult.success) {
    console.warn('Failed to parse API keys from cookie:', parseResult.error.message);
    return {};
  }

  // Validate that it's a record of strings
  const schema = z.record(z.string());
  const validationResult = schema.safeParse(parseResult.data);

  if (!validationResult.success) {
    console.warn('Invalid API keys format in cookie');
    return {};
  }

  return validationResult.data;
}

export function getProviderSettingsFromCookie(cookieHeader: string | null): ProviderSettings {
  const cookies = parseCookies(cookieHeader);
  const providersStr = cookies.providers;

  if (!providersStr) {
    return {};
  }

  const parseResult = safeJSONParse(providersStr, VALIDATION_LIMITS.MAX_COOKIE_SIZE);

  if (!parseResult.success) {
    console.warn('Failed to parse provider settings from cookie:', parseResult.error.message);
    return {};
  }

  // Validate provider settings structure
  const schema = z.record(z.object({}).passthrough());
  const validationResult = schema.safeParse(parseResult.data);

  if (!validationResult.success) {
    console.warn('Invalid provider settings format in cookie');
    return {};
  }

  return validationResult.data as ProviderSettings;
}
