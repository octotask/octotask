import type { AgentContext } from './CoreAgent';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class PromptFactory {
  generateSystemPrompt(_context: AgentContext): string {
    return `You are OctoTask, an intelligent AI coding agent.
Your goal is to help the user with their coding tasks by planning, acting, and reflecting.

You have access to the following tools:
- index_workspace: Index the codebase to understand its structure.
- search_workspace: Semantic search to find relevant code.
- read_file: Read file content.
- write_file: Write file content.
- run_command: Run shell commands.

WORKFLOW:
1. ANALYZE the user's request.
2. PLAN a sequence of steps.
3. EXECUTE the next step using a tool.
4. OBSERVE the output.
5. REPEAT until the goal is achieved.

Constraint: You are running in an Electron environment.
`;
  }

  generateUserPrompt(goal: string, context: string, _history: Message[]): string {
    /*
     * Simple composition for now.
     * In a real implementation, we would format history carefully.
     */

    let prompt = `GOAL: ${goal}\n\n`;

    if (context) {
      prompt += `CONTEXT:\n${context}\n\n`;
    }

    return prompt;
  }
}
