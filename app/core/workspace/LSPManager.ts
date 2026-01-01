import * as cp from 'child_process';
import * as rpc from 'vscode-jsonrpc/node';
import path from 'path';

export class LSPManager {
  private _workspacePath: string;
  private _connection: rpc.MessageConnection | null = null;
  private _process: cp.ChildProcess | null = null;
  private _isInitialized: boolean = false;

  constructor(workspacePath: string) {
    this._workspacePath = workspacePath;
  }

  async start(): Promise<void> {
    if (this._connection) {
      return;
    }

    console.log('LSPManager: Starting typescript-language-server...');

    /*
     * Spawn the language server
     * Note: We use --stdio to communicate via stdin/stdout
     */
    this._process = cp.spawn('npx', ['typescript-language-server', '--stdio'], {
      cwd: this._workspacePath,
      env: process.env,
    });

    this._connection = rpc.createMessageConnection(
      new rpc.StreamMessageReader(this._process.stdout!),
      new rpc.StreamMessageWriter(this._process.stdin!),
    );

    this._connection.listen();

    // Initialize the server
    const initializeParams: any = {
      processId: process.pid,
      rootUri: `file://${this._workspacePath}`,
      capabilities: {
        textDocument: {
          definition: { dynamicRegistration: true },
          references: { dynamicRegistration: true },
          documentSymbol: { dynamicRegistration: true },
          hover: { dynamicRegistration: true },
        },
      },
      workspaceFolders: [
        {
          uri: `file://${this._workspacePath}`,
          name: path.basename(this._workspacePath),
        },
      ],
    };

    try {
      const result = await this._connection.sendRequest('initialize', initializeParams);
      console.log('LSPManager: Initialized', result);
      await this._connection.sendNotification('initialized', {});
      this._isInitialized = true;
    } catch (error) {
      console.error('LSPManager: Initialization failed', error);
      this.stop();
      throw error;
    }
  }

  private _getPathUri(filePath: string): string {
    return `file://${filePath}`;
  }

  async openDocument(filePath: string, content: string): Promise<void> {
    if (!this._isInitialized) {
      await this.start();
    }

    const params = {
      textDocument: {
        uri: this._getPathUri(filePath),
        languageId: 'typescript',
        version: 1,
        text: content,
      },
    };

    await this._connection?.sendNotification('textDocument/didOpen', params);
  }

  async getDefinition(filePath: string, line: number, character: number): Promise<any> {
    if (!this._isInitialized) {
      await this.start();
    }

    /*
     * For definition, the server should ideally know the file.
     * In a real app, we'd sync on open/change.
     */

    const params = {
      textDocument: { uri: this._getPathUri(filePath) },
      position: { line, character },
    };

    return this._connection?.sendRequest('textDocument/definition', params);
  }

  async getReferences(filePath: string, line: number, character: number): Promise<any> {
    if (!this._isInitialized) {
      await this.start();
    }

    const params = {
      textDocument: { uri: this._getPathUri(filePath) },
      position: { line, character },
      context: { includeDeclaration: true },
    };

    return this._connection?.sendRequest('textDocument/references', params);
  }

  async getSymbols(filePath: string): Promise<any> {
    if (!this._isInitialized) {
      await this.start();
    }

    const params = {
      textDocument: { uri: this._getPathUri(filePath) },
    };

    return this._connection?.sendRequest('textDocument/documentSymbol', params);
  }

  async getHover(filePath: string, line: number, character: number): Promise<any> {
    if (!this._isInitialized) {
      await this.start();
    }

    const params = {
      textDocument: { uri: this._getPathUri(filePath) },
      position: { line, character },
    };

    return this._connection?.sendRequest('textDocument/hover', params);
  }

  stop(): void {
    if (this._connection) {
      this._connection.dispose();
      this._connection = null;
    }

    if (this._process) {
      this._process.kill();
      this._process = null;
    }

    this._isInitialized = false;
  }
}
