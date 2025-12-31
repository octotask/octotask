import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { EventEmitter } from 'events';

export class InteractiveShell extends EventEmitter {
  private _process: ChildProcessWithoutNullStreams | null = null;
  private _outputBuffer: string = '';
  private _workspacePath: string;

  constructor(workspacePath: string) {
    super();
    this._workspacePath = workspacePath;
  }

  async spawn(command: string): Promise<string> {
    if (this._process) {
      this.kill();
    }

    console.log(`InteractiveShell: Spawning "${command}"`);

    // Use /bin/bash -c to handle complex commands and redirections
    this._process = spawn('/bin/bash', ['-c', command], {
      cwd: this._workspacePath,
      env: { ...process.env, FORCE_COLOR: '1' },
    });

    this._process.stdout.on('data', (data) => {
      const text = data.toString();
      this._outputBuffer += text;
      this.emit('output', text);
    });

    this._process.stderr.on('data', (data) => {
      const text = data.toString();
      this._outputBuffer += text;
      this.emit('output', text);
    });

    this._process.on('close', (code) => {
      console.log(`InteractiveShell: Process exited with code ${code}`);
      this._process = null;
      this.emit('exit', code);
    });

    // Wait a bit for initial output
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.read());
      }, 500);
    });
  }

  write(data: string): void {
    if (!this._process) {
      throw new Error('No active process to write to.');
    }

    this._process.stdin.write(data);
  }

  read(): string {
    const output = this._outputBuffer;
    this._outputBuffer = '';

    return output;
  }

  isAlive(): boolean {
    return this._process !== null;
  }

  kill(): void {
    if (this._process) {
      console.log('InteractiveShell: Killing active process');
      this._process.kill('SIGINT');
      this._process = null;
    }
  }
}
