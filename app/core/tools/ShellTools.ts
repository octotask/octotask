import { exec } from 'child_process';
import util from 'util';
import type { Tool } from '~/core/agent/ToolRouter';

const execAsync = util.promisify(exec);

export class ShellTools {
  private _workspacePath: string;

  constructor(workspacePath: string) {
    this._workspacePath = workspacePath;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'run_command',
        description: 'Run a shell command. Use with caution.',
        schema: {
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
    ];
  }

  async runCommand(command: string): Promise<string> {
    /*
     * SECURITY: This is highly dangerous in a real production app without strict sandboxing.
     * For this prototype, we assume the user trusts the agent (which is running locally).
     */

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
