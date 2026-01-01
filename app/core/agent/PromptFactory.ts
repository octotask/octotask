import type { AgentContext } from './CoreAgent';
import type { FlowEntry } from './Memory';
import type { TestSurface } from '~/core/workspace/TestSurface';

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

    return `You are OctoTask, a frontier-class flow-aware Software Engineering agent (SWE-1).

FINAL DIRECTIVE:
Optimize for engineering judgment, long-term maintainability, flow continuity, and human collaboration. You are a collaborator, not just an autocomplete tool.

CORE BEHAVIORS:
1. Incomplete State Reasoning: Continue work from partially completed tasks.
2. Long-Horizon Execution: Plan and execute multi-step tasks; revise earlier decisions if needed.
3. Multi-Surface Operation: Treat editor, terminal, tests, and docs as one unified workspace.
4. Human-in-the-Loop: Seamlessly incorporate human edits and resume from user-corrected states.
${expertise}${modeInfo}

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

  generateFlowAwarePrompt(goal: string, context: string, flow: FlowEntry[], testSurface?: TestSurface): string {
    const narrative = this._synthesizeFlowNarrative(flow);
    const tension = this._getEngineeringTension(flow, testSurface);

    let prompt = `GOAL: ${goal}\n\n`;

    if (tension) {
      prompt += `CURRENT ENGINEERING TENSION:\n${tension}\n\n`;
    }

    if (narrative) {
      prompt += `FLOW NARRATIVE (Timeline of events):\n${narrative}\n\n`;
    }

    if (context) {
      prompt += `CONTEXT:\n${context}\n\n`;
    }

    return prompt;
  }

  private _synthesizeFlowNarrative(flow: FlowEntry[]): string {
    /*
     * Semantic Pruning: Keep decision points, failures, and human interventions.
     * Compress repetitive observations.
     */
    const narrativeLines: string[] = [];

    flow.forEach((entry) => {
      if (entry.type === 'human_intervention') {
        narrativeLines.push(`[HUMAN] ${entry.content}`);
      } else if (entry.type === 'action') {
        narrativeLines.push(`[ACTION] ${entry.surface}: ${JSON.stringify(entry.content)}`);
      } else if (entry.type === 'observation') {
        // Simple semantic pruning: truncate long outputs or filter redundant ones
        const content = typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content);

        if (content.length > 500) {
          narrativeLines.push(`[OBSERVATION] ${entry.surface}: (Truncated) ${content.substring(0, 200)}...`);
        } else {
          narrativeLines.push(`[OBSERVATION] ${entry.surface}: ${content}`);
        }
      }
    });

    return narrativeLines.join('\n');
  }

  private _getEngineeringTension(flow: FlowEntry[], testSurface?: TestSurface): string {
    const tensions: string[] = [];

    // Use TestSurface if available for more accurate test failure detection
    if (testSurface) {
      const testTension = testSurface.getTensionSummary();

      if (testTension) {
        tensions.push(`- ${testTension}`);

        // Add failure analysis if available
        const analyses = testSurface.analyzeFailures(flow);

        if (analyses.length > 0) {
          const affectedFiles = [...new Set(analyses.flatMap((a) => a.affectedFiles))];

          if (affectedFiles.length > 0) {
            tensions.push(`  Possibly related to changes in: ${affectedFiles.slice(0, 5).join(', ')}`);
          }
        }
      }
    } else {
      // Fallback: Detect failing tests from flow
      const lastTestFails = flow.filter(
        (e) => e.surface === 'test' && e.content.toString().toLowerCase().includes('fail'),
      );

      if (lastTestFails.length > 0) {
        tensions.push(`- Tests failing after recent changes: ${lastTestFails.map((f) => f.id).join(', ')}`);
      }
    }

    // Detect human corrections
    const humanInputs = flow.filter((e) => e.type === 'human_intervention');

    if (humanInputs.length > 0) {
      tensions.push(`- User corrected approach mid-task: "${humanInputs[humanInputs.length - 1].content}"`);
    }

    return tensions.length > 0 ? tensions.join('\n') : '';
  }

  generateStructuredUserPrompt(goal: string, context: string): { prompt: string; goal: string; context: string } {
    let prompt = `GOAL: ${goal}\n\n`;

    if (context) {
      prompt += `CONTEXT:\n${context}\n\n`;
    }

    return { prompt, goal, context };
  }
}
