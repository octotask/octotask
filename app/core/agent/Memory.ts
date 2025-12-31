export interface MemoryEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export class Memory {
  private _shortTerm: MemoryEntry[] = [];
  private _longTerm: MemoryEntry[] = [];

  add(entry: Omit<MemoryEntry, 'timestamp'>) {
    this._shortTerm.push({ ...entry, timestamp: Date.now() });
  }

  getHistory() {
    return [...this._longTerm, ...this._shortTerm];
  }

  clearShortTerm() {
    this._longTerm.push(...this._shortTerm);
    this._shortTerm = [];
  }
}
