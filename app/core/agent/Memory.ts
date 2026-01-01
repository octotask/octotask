export interface MemoryEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export class Memory {
  private _shortTerm: MemoryEntry[] = [];
  private _longTerm: MemoryEntry[] = [];
  private _telemetry: (MemoryEntry & { metadata?: any })[] = [];

  add(entry: Omit<MemoryEntry, 'timestamp'>) {
    this._shortTerm.push({ ...entry, timestamp: Date.now() });
  }

  addTelemetry(entry: Omit<MemoryEntry, 'timestamp'>, metadata?: any) {
    this._telemetry.push({ ...entry, timestamp: Date.now(), metadata });
  }

  getHistory() {
    return [...this._longTerm, ...this._shortTerm];
  }

  getTelemetry() {
    return this._telemetry;
  }

  clearShortTerm() {
    this._longTerm.push(...this._shortTerm);
    this._shortTerm = [];
  }
}
