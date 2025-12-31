import { CoreAgent, type AgentContext } from './CoreAgent';

export class DefaultAgent extends CoreAgent {
  private _persona?: string;

  constructor(context: AgentContext, persona?: string, depth: number = 0) {
    super(context, depth);
    this._persona = persona;
  }

  async plan(goal: string): Promise<any> {
    /*
     * For now, DefaultAgent uses the base runLoop logic
     * which effectively does its own planning via the LLM.
     */
    return { goal };
  }

  /*
   * Override to pass persona to prompt factory if needed in future iterations
   * For now we'll handle the persona logic in PromptFactory.ts directly
   * and pass it through the agent's context or a specific method.
   */

  get persona(): string | undefined {
    return this._persona;
  }
}
