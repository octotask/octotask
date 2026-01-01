import fs from 'fs/promises';
import path from 'path';
import type { FlowEntry } from '~/core/agent/Memory';
import type { TestResult } from '~/core/workspace/TestSurface';

export interface PersistedSession {
  version: string;
  sessionId: string;
  timestamp: number;
  goal: string;
  flow: FlowEntry[];
  testHistory: TestResult[];
  metadata?: {
    iterations: number;
    tokenMetrics?: {
      input: number;
      output: number;
      pruned: number;
      turns: number;
    };
  };
}

/**
 * FlowPersistence - Save and restore Flow sessions for long-horizon tasks
 *
 * Purpose:
 * - Enable session resumption after interruptions
 * - Preserve Flow timeline for analysis and learning
 * - Support multi-session task execution
 */
export class FlowPersistence {
  private _storagePath: string;
  private _currentSessionId: string | null = null;

  constructor(workspacePath: string) {
    this._storagePath = path.join(workspacePath, '.octotask', 'sessions');
  }

  /**
   * Save the current Flow session to disk
   */
  async saveSession(session: PersistedSession): Promise<string> {
    await fs.mkdir(this._storagePath, { recursive: true });

    const sessionFile = path.join(this._storagePath, `${session.sessionId}.json`);

    await fs.writeFile(sessionFile, JSON.stringify(session, null, 2), 'utf-8');

    this._currentSessionId = session.sessionId;

    return sessionFile;
  }

  /**
   * Load a Flow session from disk
   */
  async loadSession(sessionId: string): Promise<PersistedSession | null> {
    const sessionFile = path.join(this._storagePath, `${sessionId}.json`);

    try {
      const data = await fs.readFile(sessionFile, 'utf-8');

      return JSON.parse(data) as PersistedSession;
    } catch (error) {
      console.error(`Failed to load session ${sessionId}:`, error);

      return null;
    }
  }

  /**
   * List all available sessions
   */
  async listSessions(): Promise<Array<{ sessionId: string; timestamp: number; goal: string }>> {
    try {
      await fs.mkdir(this._storagePath, { recursive: true });

      const files = await fs.readdir(this._storagePath);
      const sessions: Array<{ sessionId: string; timestamp: number; goal: string }> = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionFile = path.join(this._storagePath, file);

          try {
            const data = await fs.readFile(sessionFile, 'utf-8');
            const session = JSON.parse(data) as PersistedSession;

            sessions.push({
              sessionId: session.sessionId,
              timestamp: session.timestamp,
              goal: session.goal,
            });
          } catch (error) {
            console.error(`Failed to read session file ${file}:`, error);
          }
        }
      }

      return sessions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to list sessions:', error);

      return [];
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const sessionFile = path.join(this._storagePath, `${sessionId}.json`);

    try {
      await fs.unlink(sessionFile);

      return true;
    } catch (error) {
      console.error(`Failed to delete session ${sessionId}:`, error);

      return false;
    }
  }

  /**
   * Get the most recent session
   */
  async getLastSession(): Promise<PersistedSession | null> {
    const sessions = await this.listSessions();

    if (sessions.length === 0) {
      return null;
    }

    return this.loadSession(sessions[0].sessionId);
  }

  /**
   * Create a session snapshot (for checkpointing during long tasks)
   */
  async createSnapshot(
    sessionId: string,
    goal: string,
    flow: FlowEntry[],
    testHistory: TestResult[],
    metadata?: PersistedSession['metadata'],
  ): Promise<string> {
    const session: PersistedSession = {
      version: '1.0.0',
      sessionId,
      timestamp: Date.now(),
      goal,
      flow,
      testHistory,
      metadata,
    };

    return this.saveSession(session);
  }

  /**
   * Auto-save session periodically during execution
   */
  async autoSave(
    sessionId: string,
    goal: string,
    flow: FlowEntry[],
    testHistory: TestResult[],
    metadata?: PersistedSession['metadata'],
  ): Promise<void> {
    try {
      await this.createSnapshot(sessionId, goal, flow, testHistory, metadata);
      console.log(`[FlowPersistence] Auto-saved session ${sessionId}`);
    } catch (error) {
      console.error('[FlowPersistence] Auto-save failed:', error);
    }
  }

  /**
   * Clean up old sessions (keep only last N sessions)
   */
  async cleanupOldSessions(keepCount: number = 10): Promise<number> {
    const sessions = await this.listSessions();

    if (sessions.length <= keepCount) {
      return 0;
    }

    const toDelete = sessions.slice(keepCount);
    let deletedCount = 0;

    for (const session of toDelete) {
      const success = await this.deleteSession(session.sessionId);

      if (success) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Export session to a portable format
   */
  async exportSession(sessionId: string, exportPath: string): Promise<boolean> {
    const session = await this.loadSession(sessionId);

    if (!session) {
      return false;
    }

    try {
      await fs.writeFile(exportPath, JSON.stringify(session, null, 2), 'utf-8');

      return true;
    } catch (error) {
      console.error(`Failed to export session to ${exportPath}:`, error);

      return false;
    }
  }

  /**
   * Import session from a portable format
   */
  async importSession(importPath: string): Promise<string | null> {
    try {
      const data = await fs.readFile(importPath, 'utf-8');
      const session = JSON.parse(data) as PersistedSession;

      // Generate new session ID to avoid conflicts
      const newSessionId = `${session.sessionId}_imported_${Date.now()}`;
      session.sessionId = newSessionId;
      session.timestamp = Date.now();

      await this.saveSession(session);

      return newSessionId;
    } catch (error) {
      console.error(`Failed to import session from ${importPath}:`, error);

      return null;
    }
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this._currentSessionId;
  }
}
