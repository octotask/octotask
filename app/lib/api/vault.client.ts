/**
 * Client-side wrapper for the Electron Vault IPC
 * Handles proper typing and fallback for SSR/Browser environments
 */

interface Vault {
  saveSecret: (key: string, value: string) => Promise<boolean>;
  getSecret: (key: string) => Promise<string | null>;
  deleteSecret: (key: string) => Promise<boolean>;
}

declare global {
  interface Window {
    ipc: {
      vault: Vault;
      [key: string]: any;
    };
  }
}

class VaultClient {
  private _isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.ipc?.vault;
  }

  async saveSecret(key: string, value: string): Promise<boolean> {
    if (!this._isAvailable()) {
      console.warn('Vault not available, secrets cannot be saved securely.');
      return false;
    }

    return window.ipc.vault.saveSecret(key, value);
  }

  async getSecret(key: string): Promise<string | null> {
    if (!this._isAvailable()) {
      return null;
    }

    return window.ipc.vault.getSecret(key);
  }

  async deleteSecret(key: string): Promise<boolean> {
    if (!this._isAvailable()) {
      return false;
    }

    return window.ipc.vault.deleteSecret(key);
  }
}

export const vault = new VaultClient();
