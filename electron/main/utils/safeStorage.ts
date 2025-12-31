import { safeStorage } from 'electron';
import Store from 'electron-store';
import crypto from 'crypto';

const store = new Store();

// Fallback encryption key in case safeStorage is not available (e.g. Linux without keyring)
// In a real production scenario, we might want to warn the user or use a different strategy.
const FALLBACK_KEY_STORAGE = 'octotask_fallback_key';

function getFallbackKey(): Buffer {
  let keyHex = store.get(FALLBACK_KEY_STORAGE) as string;
  if (!keyHex) {
    keyHex = crypto.randomBytes(32).toString('hex');
    store.set(FALLBACK_KEY_STORAGE, keyHex);
  }
  return Buffer.from(keyHex, 'hex');
}

export function encryptString(text: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(text).toString('base64');
  }

  // Fallback encryption
  const key = getFallbackKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `FALLBACK:${iv.toString('hex')}:${encrypted}`;
}

export function decryptString(encryptedText: string): string {
  if (encryptedText.startsWith('FALLBACK:')) {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid fallback encryption format');
    }
    const iv = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const key = getFallbackKey();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(encryptedText, 'base64'));
  }

  throw new Error('Encryption not available and data was not encrypted with fallback');
}
