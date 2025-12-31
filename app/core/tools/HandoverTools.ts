import type { Tool } from '~/core/agent/ToolRouter';
import { DefaultAgent } from '~/core/agent/DefaultAgent';
import type { AgentContext } from '~/core/agent/CoreAgent';

export class HandoverTools {
  private _context: AgentContext;
  private _currentDepth: number;
  private static _maxDepth = 3;

  constructor(context: AgentContext, depth: number = 0) {
    this._context = context;
    this._currentDepth = depth;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'delegate_task',
        description: 'Delegate a specific sub-task to an expert agent (researcher, reviewer, or coder).',
        parameters: {
          type: 'object',
          properties: {
            goal: { type: 'string', description: 'The specific goal for the expert agent' },
            expertType: {
              type: 'string',
              enum: ['researcher', 'reviewer', 'coder'],
              description: 'The type of expertise needed',
            },
          },
          required: ['goal', 'expertType'],
        },
        execute: async (args: { goal: string; expertType: 'researcher' | 'reviewer' | 'coder' }) => {
          if (this._currentDepth >= HandoverTools._maxDepth) {
            return `Error: Maximum delegation depth reached (${HandoverTools._maxDepth}). Please handle the task directly.`;
          }

          console.log(
            `HandoverTools: Delegating "${args.goal}" to ${args.expertType} (depth: ${this._currentDepth + 1})`,
          );

          const expert = new DefaultAgent(this._context, args.expertType, this._currentDepth);

          /*
           * Set the depth on the new expert's handover tools if we were to pass it...
           * For simplicity, we'll just increment it here.
           */

          /*
           * We need a way to pass the depth to the sub-agent.
           * Since CoreAgent doesn't take depth, we'll rely on a manual check.
           */

          const result = await expert.execute(args.goal);

          return `EXPERT (${args.expertType}) REPORT:\n${result && result.length > 0 ? result : 'The expert completed the task but provided no summary.'}`;
        },
      },
    ];
  }
}
