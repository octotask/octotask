import { EventEmitter } from 'events';
import { Indexer } from '~/core/workspace/Indexer';
import { VectorStore } from '~/core/workspace/VectorStore';
import { PromptFactory } from './PromptFactory';
import { Memory } from './Memory';
import { LLMService } from '~/lib/llm/LLMService';
import { PROVIDER_LIST } from '~/utils/constants';
import { ToolRouter } from './ToolRouter';
import { FileSystemTools } from '~/core/tools/FileSystemTools';
import { ShellTools } from '~/core/tools/ShellTools';

export type AgentStatus = 'idle' | 'planning' | 'acting' | 'observing' | 'indexing';

export interface AgentContext {
  workspacePath: string;
  vault: any; // Interface for vault
}

export abstract class CoreAgent extends EventEmitter {
  protected status: AgentStatus = 'idle';
  protected context: AgentContext;
  protected indexer: Indexer;
  protected vectorStore: VectorStore;
  protected promptFactory: PromptFactory;
  protected memory: Memory;
  protected toolRouter: ToolRouter;

  constructor(context: AgentContext) {
    super();
    this.context = context;
    this.indexer = new Indexer();
    this.vectorStore = new VectorStore();
    this.promptFactory = new PromptFactory();
    this.memory = new Memory();
    this.toolRouter = new ToolRouter();

    // Register Tools
    const fsTools = new FileSystemTools(context.workspacePath);
    const shTools = new ShellTools(context.workspacePath);

    [...fsTools.getTools(), ...shTools.getTools()].forEach((tool) => {
      this.toolRouter.registerTool(tool);
    });

    // Register default search tool
    this.toolRouter.registerTool({
      name: 'search_workspace',
      description: 'Search the codebase using semantic search.',
      schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
      execute: async (args: { query: string }) => {
        return this.searchWorkspace(args.query);
      },
    });
  }

  async initializeWorkspace() {
    this.status = 'indexing';
    this.emit('status', this.status);

    try {
      console.log('CoreAgent: Starting workspace indexing...');

      const documents = await this.indexer.indexWorkspace(this.context.workspacePath);

      if (documents.length > 0) {
        await this.vectorStore.addDocuments(documents);
        console.log('CoreAgent: Workspace indexing complete.');
      } else {
        console.warn('CoreAgent: No documents found to index.');
      }
    } catch (error) {
      console.error('CoreAgent: Error initializing workspace:', error);
    } finally {
      this.status = 'idle';
      this.emit('status', this.status);
    }
  }

  async searchWorkspace(query: string) {
    return this.vectorStore.search(query);
  }

  async execute(goal: string) {
    return this.runLoop(goal);
  }

  protected async runLoop(goal: string) {
    console.log(`CoreAgent: Starting loop for goal: "${goal}"`);
    this.status = 'planning';
    this.emit('status', this.status);

    let iterations = 0;
    const MAX_ITERATIONS = 10;
    let running = true;

    while (running && iterations < MAX_ITERATIONS) {
      iterations++;
      console.log(`CoreAgent: Iteration ${iterations}`);

      // 1. Context Retrieval (RAG)
      const contextResults = await this.vectorStore.search(goal);
      const contextStr = contextResults.map((r) => r.chunk).join('\n---\n');

      // 2. Plan / Decide Action
      const systemPrompt = this.promptFactory.generateSystemPrompt(this.context);
      const userPrompt = this.promptFactory.generateUserPrompt(goal, contextStr, this.memory.getHistory());

      console.log('--- System Prompt ---\n', systemPrompt);
      console.log('--- User Prompt ---\n', userPrompt);

      /*
       * 3. LLM Call
       * Retrieve keys
       */
      const apiKeys: Record<string, string> = {};

      if (this.context.vault) {
        // If vault is available, we assume context.vault implements getSecret interface
        for (const p of PROVIDER_LIST) {
          try {
            const key = await this.context.vault.getSecret(p.name);

            if (key) {
              apiKeys[p.name] = key;
            }
          } catch (e) {
            console.warn(`Failed to retrieve key for ${p.name}:`, e);
          }
        }
      }

      let providerName = 'Anthropic';
      let modelName = 'claude-3-5-sonnet-20240620';

      if (!apiKeys[providerName]) {
        providerName = 'OpenAI';
        modelName = 'gpt-4o';
      }

      const llmService = new LLMService();
      let resultText = '';

      try {
        const response = await llmService.generate({
          system: systemPrompt,
          message: userPrompt,
          model: modelName,
          provider: { name: providerName } as any,
          apiKeys,
          serverEnv: {},
        });
        resultText = response.text;
        console.log('LLM Response:', resultText);
      } catch (error: any) {
        console.error('LLM Generation Error:', error);
        this.memory.add({ role: 'system', content: `Error: ${error.message}` });
        break;
      }

      // 4. Parse Action
      let plan;

      try {
        const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/) || resultText.match(/{[\s\S]*}/);

        if (jsonMatch) {
          plan = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          console.log('CoreAgent: Could not parse JSON plan. Raw:', resultText);
          plan = { action: 'observe', args: { note: resultText } };
        }
      } catch (e) {
        console.error('CoreAgent: JSON Parse Error:', e);
        plan = { action: 'observe', args: { error: 'Failed to parse plan from LLM' } };
      }

      // 5. Act
      this.status = 'acting';
      this.emit('status', this.status);

      let actionResult;
      console.log('CoreAgent: Plan execution:', plan);

      if (plan.action && plan.action !== 'observe' && plan.action !== 'finish') {
        try {
          actionResult = await this.act(plan);
        } catch (e: any) {
          actionResult = `Error executing ${plan.action}: ${e.message}`;
        }
      } else if (plan.action === 'finish') {
        actionResult = 'Finished.';
        running = false;
      } else {
        actionResult = 'Observation: ' + (plan.args?.note || 'No action taken.');
      }

      // 6. Observe / Memorize
      this.status = 'observing';
      this.emit('status', this.status);

      this.memory.add({ role: 'user', content: userPrompt });
      this.memory.add({ role: 'assistant', content: resultText });
      this.memory.add({ role: 'system', content: `Tool Output: ${JSON.stringify(actionResult)}` });

      if (plan.action === 'finish' || iterations >= MAX_ITERATIONS) {
        running = false;
      }
    }

    this.status = 'idle';
    this.emit('status', this.status);
    console.log('CoreAgent: Loop finished.');
  }

  abstract plan(goal: string): Promise<any>;

  async act(plan: any): Promise<any> {
    if (!plan || !plan.action) {
      throw new Error('Invalid plan: missing action');
    }

    console.log(`CoreAgent: Acting - ${plan.action}`, plan.args);

    return this.toolRouter.executeTool(plan.action, plan.args || {});
  }

  async observe(): Promise<any> {
    return null;
  }
}
