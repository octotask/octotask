import type { AgentContext } from './CoreAgent';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class PromptFactory {
  generateSystemPrompt(
    _context: AgentContext,
    persona?: string,
    options: { includeWorkflows?: boolean; agentStatus?: string } = {},
  ): string {
    const expertise = this._getExpertise(persona);
    const workflows = options.includeWorkflows ? this._getWorkflows() : '';
    const modeInfo = options.agentStatus ? `\nCURRENT MODE: ${options.agentStatus.toUpperCase()}` : '';

    return `You are OctoTask, an intelligent AI coding agent.${expertise}${modeInfo}
Your goal is to help the user with their coding tasks by planning, acting, and reflecting.

${workflows}
Constraint: You are running in an Electron environment.
`;
  }

  private _getExpertise(persona?: string): string {
    if (!persona) {
      return '';
    }

    return `\n[ROLE: ${persona.toUpperCase()}]`;
  }

  private _getWorkflows(): string {
    return `
IMPORTANT WORKFLOW - CODE INTELLIGENCE (LSP):
1. Use 'go_to_definition', 'find_references', 'list_symbols', and 'get_hover' to explore code.
2. Note: LSP tools use 0-indexed line and character positions.

IMPORTANT WORKFLOW - SHADOW FILESYSTEM:
1. 'write_file' stages changes in a shadow filesystem.
2. Verify changes with 'read_file', then MUST call 'commit_changes' to apply or 'discard_changes' to revert.

IMPORTANT WORKFLOW - INTERACTIVE TERMINAL:
1. Use 'run_command' for quick tasks.
2. Use 'spawn_command' for long-running/interactive tasks.
3. Periodically call 'read_terminal' and use 'send_terminal_input' as needed.
`;
  }

  generateUserPrompt(goal: string, context: string, _history: Message[]): string {
    const { prompt } = this.generateStructuredUserPrompt(goal, context);
    return prompt;
  }

  generateStructuredUserPrompt(goal: string, context: string): { prompt: string; goal: string; context: string } {
    let prompt = `GOAL: ${goal}\n\n`;

    if (context) {
      prompt += `CONTEXT:\n${context}\n\n`;
    }

    return { prompt, goal, context };
  }
}
