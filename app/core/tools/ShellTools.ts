import { exec } from 'child_process';
import util from 'util';
import type { Tool } from '~/core/agent/ToolRouter';
import { InteractiveShell } from '~/core/workspace/InteractiveShell';

const execAsync = util.promisify(exec);

export class ShellTools {
  private _workspacePath: string;
  private _interactiveShell: InteractiveShell;

  constructor(workspacePath: string, interactiveShell: InteractiveShell) {
    this._workspacePath = workspacePath;
    this._interactiveShell = interactiveShell;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'run_command',
        description: 'Run a one-shot shell command and wait for completion. Use for quick tasks.',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Shell command to execute' },
          },
          required: ['command'],
        },
        execute: async (args: { command: string }) => {
          return this.runCommand(args.command);
        },
      },
      {
        name: 'spawn_command',
        description: 'Start a long-running or interactive shell command. Returns initial output.',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Interactive command to start' },
          },
          required: ['command'],
        },
        execute: async (args: { command: string }) => {
          return this._interactiveShell.spawn(args.command);
        },
      },
      {
        name: 'read_terminal',
        description: 'Read the latest output from the active interactive terminal session.',
        parameters: {
          type: 'object',
          properties: {},
        },
        execute: async () => {
          if (!this._interactiveShell.isAlive()) {
            return 'Error: No active terminal session. Use spawn_command first.';
          }

          return this._interactiveShell.read() || '(No new output)';
        },
      },
      {
        name: 'send_terminal_input',
        description: 'Send input (keystrokes) to the active interactive terminal session.',
        parameters: {
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Text to send to the terminal' },
          },
          required: ['input'],
        },
        execute: async (args: { input: string }) => {
          if (!this._interactiveShell.isAlive()) {
            return 'Error: No active terminal session. Use spawn_command first.';
          }

          this._interactiveShell.write(args.input + '\n');

          return `Sent input: ${args.input}`;
        },
      },
    ];
  }

  async runCommand(command: string): Promise<string> {
    console.log(`Executing shell command: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, { cwd: this._workspacePath });
      let output = stdout;

      if (stderr) {
        output += `\nStderr:\n${stderr}`;
      }

      return output || '(No output)';
    } catch (error: any) {
      return `Error executing command: ${error.message}\nStderr: ${error.stderr || ''}`;
    }
  }
}
