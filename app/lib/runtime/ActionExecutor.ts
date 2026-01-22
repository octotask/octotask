import type { WebContainer } from '@webcontainer/api';
import { trace } from '@opentelemetry/api';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';
import { path as nodePath } from '~/utils/path';
import type { OctoShell } from '~/utils/shell';
import { createPatch } from 'diff';
import type { LLMService } from '~/lib/llm/LLMService';
import type { MemoryMonitor } from './MemoryMonitor';
import type { ActionState } from './action-types';
import { ActionCommandError } from './action-types';
import type { ActionAlert } from '~/types/actions';

const logger = createScopedLogger('ActionExecutor');
const tracer = trace.getTracer('action-executor');
const COMMAND_TIMEOUT_MS = 30_000;

export class ActionExecutor {
  #webcontainer: Promise<WebContainer>;
  #shellTerminal: () => OctoShell;
  #llmService: LLMService;
  #apiKeys: Record<string, string>;
  #memoryMonitor: MemoryMonitor;
  onAlert?: (alert: ActionAlert) => void;

  constructor(
    webcontainerPromise: Promise<WebContainer>,
    getShellTerminal: () => OctoShell,
    llmService: LLMService,
    apiKeys: Record<string, string>,
    memoryMonitor: MemoryMonitor,
    onAlert?: (alert: ActionAlert) => void,
  ) {
    this.#webcontainer = webcontainerPromise;
    this.#shellTerminal = getShellTerminal;
    this.#llmService = llmService;
    this.#apiKeys = apiKeys;
    this.#memoryMonitor = memoryMonitor;
    this.onAlert = onAlert;
  }

  async execute(action: ActionState, runnerId: string) {
    return tracer.startActiveSpan(`ActionExecutor.execute:${action.type}`, async (span) => {
      span.setAttributes({
        'action.type': action.type,
      });

      switch (action.type) {
        case 'shell':
        case 'build':
        case 'start':
          return this.#runShellAction(action, runnerId);
        case 'file':
          return this.#runFileAction(action);
        default:
          return unreachable(`Unknown action type: ${action.type}`);
      }
    });
  }

  async #runShellAction(action: ActionState, runnerId: string) {
    return tracer.startActiveSpan('ActionExecutor.runShellAction', async (span) => {
      span.setAttributes({
        'action.type': action.type,
        'action.content': action.content,
      });

      if (action.type !== 'shell' && action.type !== 'build' && action.type !== 'start') {
        unreachable('Expected shell, build, or start action');
      }

      if (this.#memoryMonitor.isMemoryUsageExceeded()) {
        const errorTitle = 'Memory Limit Exceeded';
        const errorDetails = 'Cannot execute command. Memory usage is too high.';
        this.onAlert?.({
          type: 'error',
          title: errorTitle,
          description: errorDetails,
          content: 'Memory usage is too high to execute the command.',
        });
        throw new ActionCommandError(errorTitle, errorDetails);
      }

      const shell = this.#shellTerminal();
      await shell.ready();

      if (!shell || !shell.terminal || !shell.process) {
        unreachable('Shell terminal not found');
      }

      const validationResult = await this.#validateShellCommand(action.content);

      if (validationResult.shouldModify && validationResult.modifiedCommand) {
        logger.debug(`Modified command: ${action.content} -> ${validationResult.modifiedCommand}`);
        action.content = validationResult.modifiedCommand;
      }

      const commandProcess = shell.process;

      const timeoutId = setTimeout(() => {
        logger.warn(`Command timed out after ${COMMAND_TIMEOUT_MS}ms. Killing process.`);
        commandProcess.kill();
      }, COMMAND_TIMEOUT_MS);

      try {
        const resp = await shell.executeCommand(runnerId, action.content, () => {
          logger.debug(`[${action.type}]:Aborting Action\n\n`, action);
          action.abort();
        });

        clearTimeout(timeoutId);

        logger.debug(`${action.type} Shell Response: [exit code:${resp?.exitCode}]`);

        if (resp?.exitCode !== 0) {
          const enhancedError = this.#createEnhancedShellError(action.content, resp?.exitCode, resp?.output);
          throw new ActionCommandError(enhancedError.title, enhancedError.details);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        span.recordException(error as any);
        throw error;
      }
    });
  }

  async #runFileAction(action: ActionState) {
    if (action.type !== 'file') {
      unreachable('Expected file action');
    }

    return tracer.startActiveSpan('ActionExecutor.runFileAction', async (span) => {
      span.setAttributes({
        'action.filePath': action.filePath,
      });

      const webcontainer = await this.#webcontainer;

      if (!this.#isPathInWorkspace(action.filePath, webcontainer.workdir)) {
        throw new ActionCommandError('Invalid File Path', `File path is outside of the workspace: ${action.filePath}`);
      }

      const relativePath = nodePath.relative(webcontainer.workdir, action.filePath);

      let oldContent = '';

      try {
        oldContent = await webcontainer.fs.readFile(relativePath, 'utf-8');
      } catch {
        // File might not exist
      }

      const patch = createPatch(relativePath, oldContent, action.content);
      const explanation = await this.#generateDiffExplanation(patch);

      this.onAlert?.({
        type: 'info',
        title: `File Change Preview: ${relativePath}`,
        description: explanation,
        content: '```diff\n' + patch + '\n```',
      });

      logger.debug(`File diff generated for ${relativePath}`);
    });
  }

  #isPathInWorkspace(filePath: string, workspaceDir: string): boolean {
    const absoluteFilePath = nodePath.isAbsolute(filePath)
      ? nodePath.normalize(filePath)
      : nodePath.normalize(nodePath.join(workspaceDir, filePath));

    return absoluteFilePath.startsWith(nodePath.normalize(workspaceDir + '/'));
  }

  async #generateDiffExplanation(patch: string): Promise<string> {
    return tracer.startActiveSpan('ActionExecutor.generateDiffExplanation', async (span) => {
      if (!patch.trim()) {
        return 'No changes detected.';
      }

      try {
        const response = await this.#llmService.generate({
          system:
            'You are a helpful assistant. Your task is to explain the following code changes in a concise and easy-to-understand way. Focus on the intent and impact of the changes.',
          message: `Please explain the following diff:\n\n${patch}`,
          model: 'claude-3-5-sonnet-20240620',
          provider: { name: 'Anthropic' } as any,
          apiKeys: this.#apiKeys,
        });
        return response.text;
      } catch (error) {
        logger.error('Failed to generate diff explanation:', error);
        span.recordException(error as any);

        return 'Could not generate an explanation for the changes.';
      }
    });
  }

  async #validateShellCommand(command: string): Promise<{
    shouldModify: boolean;
    modifiedCommand?: string;
    warning?: string;
  }> {
    const trimmedCommand = command.trim();

    if (trimmedCommand.startsWith('rm ') && !trimmedCommand.includes(' -f')) {
      const rmMatch = trimmedCommand.match(/^rm\s+(.+)$/);

      if (rmMatch) {
        const filePaths = rmMatch[1].split(/\s+/);

        try {
          const webcontainer = await this.#webcontainer;
          const existingFiles = [];

          for (const filePath of filePaths) {
            if (filePath.startsWith('-')) {
              continue;
            }

            try {
              await webcontainer.fs.readFile(filePath);
              existingFiles.push(filePath);
            } catch {
              // File doesn't exist
            }
          }

          if (existingFiles.length === 0) {
            return {
              shouldModify: true,
              modifiedCommand: `rm -f ${filePaths.join(' ')}`,
              warning: 'Added -f flag to rm command as target files do not exist',
            };
          } else if (existingFiles.length < filePaths.length) {
            return {
              shouldModify: true,
              modifiedCommand: `rm -f ${filePaths.join(' ')}`,
              warning: 'Added -f flag to rm command as some target files do not exist',
            };
          }
        } catch (error) {
          logger.debug('Could not validate rm command files:', error);
        }
      }
    }

    if (trimmedCommand.startsWith('cd ')) {
      const cdMatch = trimmedCommand.match(/^cd\s+(.+)$/);

      if (cdMatch) {
        const targetDir = cdMatch[1].trim();

        try {
          const webcontainer = await this.#webcontainer;
          await webcontainer.fs.readdir(targetDir);
        } catch {
          return {
            shouldModify: true,
            modifiedCommand: `mkdir -p ${targetDir} && cd ${targetDir}`,
            warning: 'Directory does not exist, created it first',
          };
        }
      }
    }

    if (trimmedCommand.match(/^(cp|mv)\s+/)) {
      const parts = trimmedCommand.split(/\s+/);

      if (parts.length >= 3) {
        const sourceFile = parts[1];

        try {
          const webcontainer = await this.#webcontainer;
          await webcontainer.fs.readFile(sourceFile);
        } catch {
          return {
            shouldModify: false,
            warning: `Source file '${sourceFile}' does not exist`,
          };
        }
      }
    }

    return { shouldModify: false };
  }

  #createEnhancedShellError(
    command: string,
    exitCode: number | undefined,
    output: string | undefined,
  ): { title: string; details: string } {
    const trimmedCommand = command.trim();
    const firstWord = trimmedCommand.split(/\s+/)[0];
    const errorPatterns = [
      {
        pattern: /cannot remove.*No such file or directory/,
        title: 'File Not Found',
        getMessage: () => {
          const fileMatch = output?.match(/'([^']+)'/);
          const fileName = fileMatch ? fileMatch[1] : 'file';

          return `The file '${fileName}' does not exist and cannot be removed.\n\nSuggestion: Use 'ls' to check what files exist, or use 'rm -f' to ignore missing files.`;
        },
      },
      {
        pattern: /No such file or directory/,
        title: 'File or Directory Not Found',
        getMessage: () => {
          if (trimmedCommand.startsWith('cd ')) {
            const dirMatch = trimmedCommand.match(/cd\s+(.+)/);
            const dirName = dirMatch ? dirMatch[1] : 'directory';

            return `The directory '${dirName}' does not exist.\n\nSuggestion: Use 'mkdir -p ${dirName}' to create it first, or check available directories with 'ls'.`;
          }

          return `The specified file or directory does not exist.\n\nSuggestion: Check the path and use 'ls' to see available files.`;
        },
      },
      {
        pattern: /Permission denied/,
        title: 'Permission Denied',
        getMessage: () =>
          `Permission denied for '${firstWord}'.\n\nSuggestion: The file may not be executable. Try 'chmod +x filename' first.`,
      },
      {
        pattern: /command not found/,
        title: 'Command Not Found',
        getMessage: () =>
          `The command '${firstWord}' is not available in WebContainer.\n\nSuggestion: Check available commands or use a package manager to install it.`,
      },
      {
        pattern: /Is a directory/,
        title: 'Target is a Directory',
        getMessage: () =>
          `Cannot perform this operation - target is a directory.\n\nSuggestion: Use 'ls' to list directory contents or add appropriate flags.`,
      },
      {
        pattern: /File exists/,
        title: 'File Already Exists',
        getMessage: () => `File already exists.\n\nSuggestion: Use a different name or add '-f' flag to overwrite.`,
      },
    ];

    for (const errorPattern of errorPatterns) {
      if (output && errorPattern.pattern.test(output)) {
        return {
          title: errorPattern.title,
          details: errorPattern.getMessage(),
        };
      }
    }

    let suggestion = '';

    if (trimmedCommand.startsWith('npm ')) {
      suggestion = '\n\nSuggestion: Try running "npm install" first or check package.json.';
    } else if (trimmedCommand.startsWith('git ')) {
      suggestion = "\n\nSuggestion: Check if you're in a git repository or if remote is configured.";
    } else if (trimmedCommand.match(/^(ls|cat|rm|cp|mv)/)) {
      suggestion = '\n\nSuggestion: Check file paths and use "ls" to see available files.';
    }

    return {
      title: `Command Failed (exit code: ${exitCode})`,
      details: `Command: ${trimmedCommand}\n\nOutput: ${output || 'No output available'}${suggestion}`,
    };
  }
}
