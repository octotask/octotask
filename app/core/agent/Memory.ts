export interface MemoryEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface FlowEntry {
  id: string;
  type: 'action' | 'observation' | 'human_intervention';
  surface: 'editor' | 'terminal' | 'test' | 'lsp' | 'docs';
  content: any;
  timestamp: number;
  causedBy?: string[]; // FlowEntry IDs
  affects?: string[]; // files, tests, modules
  confidence?: number; // agent confidence at time
}

export class FlowStore {
  private _flow: FlowEntry[] = [];

  append(entry: Omit<FlowEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: number }) {
    const newEntry: FlowEntry = {
      id: entry.id || Math.random().toString(36).substring(2, 15),
      timestamp: entry.timestamp || Date.now(),
      ...entry,
    };
    this._flow.push(newEntry);

    return newEntry;
  }

  getWindow(criteria?: (entry: FlowEntry) => boolean): FlowEntry[] {
    if (!criteria) {
      return this._flow;
    }

    return this._flow.filter(criteria);
  }

  getById(id: string): FlowEntry | undefined {
    return this._flow.find((e) => e.id === id);
  }

  clear() {
    this._flow = [];
  }
}

export class Memory {
  private _conversationHistory: MemoryEntry[] = [];
  private _flowStore: FlowStore = new FlowStore();
  private _telemetry: (MemoryEntry & { metadata?: any })[] = [];

  add(entry: Omit<MemoryEntry, 'timestamp'>) {
    this._conversationHistory.push({ ...entry, timestamp: Date.now() });
  }

  addTelemetry(entry: Omit<MemoryEntry, 'timestamp'>, metadata?: any) {
    this._telemetry.push({ ...entry, timestamp: Date.now(), metadata });
  }

  getHistory() {
    return this._conversationHistory;
  }

  getFlowStore() {
    return this._flowStore;
  }

  getTelemetry() {
    return this._telemetry;
  }

  clearConversation() {
    this._conversationHistory = [];
  }
}
