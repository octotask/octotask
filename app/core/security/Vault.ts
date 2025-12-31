export interface VaultProvider {
  saveSecret(key: string, value: string): Promise<boolean>;
  getSecret(key: string): Promise<string | null>;
  deleteSecret(key: string): Promise<boolean>;
}

export class Vault implements VaultProvider {
  /*
   * This implementation will delegate to the Main Process or Environment Specific vault
   * For now, it's a placeholder interface that aligns with our electron/main/utils/safeStorage
   */

  constructor(private _provider: VaultProvider) {}

  async saveSecret(key: string, value: string) {
    return this._provider.saveSecret(key, value);
  }

  async getSecret(key: string) {
    return this._provider.getSecret(key);
  }

  async deleteSecret(key: string) {
    return this._provider.deleteSecret(key);
  }
}
