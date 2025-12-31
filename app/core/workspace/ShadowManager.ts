import fs from 'fs/promises';
import path from 'path';

export class ShadowManager {
  private _workspacePath: string;
  private _shadowPath: string;

  constructor(workspacePath: string) {
    this._workspacePath = workspacePath;
    this._shadowPath = path.join(workspacePath, '.octotask', 'shadow');
  }

  private _resolveShadowPath(relativePath: string): string {
    return path.join(this._shadowPath, relativePath);
  }

  async applyShadow(relativePath: string, content: string): Promise<void> {
    const shadowFile = this._resolveShadowPath(relativePath);
    await fs.mkdir(path.dirname(shadowFile), { recursive: true });
    await fs.writeFile(shadowFile, content, 'utf-8');
    console.log(`ShadowManager: Staged changes for ${relativePath} in ${shadowFile}`);
  }

  async commit(relativePath: string): Promise<void> {
    const shadowFile = this._resolveShadowPath(relativePath);
    const targetFile = path.join(this._workspacePath, relativePath);

    try {
      const content = await fs.readFile(shadowFile, 'utf-8');
      await fs.mkdir(path.dirname(targetFile), { recursive: true });
      await fs.writeFile(targetFile, content, 'utf-8');
      await fs.unlink(shadowFile);
      console.log(`ShadowManager: Committed changes to ${relativePath}`);
    } catch (error) {
      console.error(`ShadowManager: Failed to commit ${relativePath}:`, error);
      throw error;
    }
  }

  async commitAll(): Promise<string[]> {
    const committed: string[] = [];
    const walk = async (dir: string) => {
      const files = await fs.readdir(dir, { withFileTypes: true });

      for (const file of files) {
        const res = path.resolve(dir, file.name);

        if (file.isDirectory()) {
          await walk(res);
        } else {
          const rel = path.relative(this._shadowPath, res);
          await this.commit(rel);
          committed.push(rel);
        }
      }
    };

    try {
      if (await this._exists(this._shadowPath)) {
        await walk(this._shadowPath);
      }

      return committed;
    } catch (error) {
      console.error('ShadowManager: Error during commitAll:', error);
      throw error;
    }
  }

  async getEffectiveContent(relativePath: string): Promise<string | null> {
    const shadowFile = this._resolveShadowPath(relativePath);
    const targetFile = path.join(this._workspacePath, relativePath);

    if (await this._exists(shadowFile)) {
      return fs.readFile(shadowFile, 'utf-8');
    }

    if (await this._exists(targetFile)) {
      return fs.readFile(targetFile, 'utf-8');
    }

    return null;
  }

  async clearShadow(): Promise<void> {
    try {
      await fs.rm(this._shadowPath, { recursive: true, force: true });
      console.log('ShadowManager: Cleared shadow directory.');
    } catch (error) {
      console.error('ShadowManager: Error clearing shadow:', error);
    }
  }

  private async _exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
