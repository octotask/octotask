import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { Indexer } from '~/core/workspace/Indexer';
import { VectorStore } from '~/core/workspace/VectorStore';
import { PromptFactory } from './PromptFactory';
import { Memory } from './Memory';
import { LLMService } from '~/lib/llm/LLMService';
import { PROVIDER_LIST } from '~/utils/constants';
import { ToolRouter } from './ToolRouter';
import { FileSystemTools } from '~/core/tools/FileSystemTools';
import { ShellTools } from '~/core/tools/ShellTools';
import { HandoverTools } from '~/core/tools/HandoverTools';
import { LSPTools } from '~/core/tools/LSPTools';
import { ShadowManager } from '~/core/workspace/ShadowManager';
import { InteractiveShell } from '~/core/workspace/InteractiveShell';
import { LSPManager } from '~/core/workspace/LSPManager';

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
  protected shadowManager: ShadowManager;
  protected delegationDepth: number;
  protected interactiveShell: InteractiveShell;
  protected lspManager: LSPManager;

  constructor(context: AgentContext, depth: number = 0) {
    super();
    this.context = context;
    this.delegationDepth = depth;
    this.indexer = new Indexer();
    this.vectorStore = new VectorStore();
    this.promptFactory = new PromptFactory();
    this.memory = new Memory();
    this.toolRouter = new ToolRouter();
    this.shadowManager = new ShadowManager(context.workspacePath);
    this.interactiveShell = new InteractiveShell(context.workspacePath);
    this.lspManager = new LSPManager(context.workspacePath);

    // Register Tools
    const fsTools = new FileSystemTools(context.workspacePath, this.shadowManager);
    const shTools = new ShellTools(context.workspacePath, this.interactiveShell);
    const hoTools = new HandoverTools(context, this.delegationDepth + 1);
    const lspTools = new LSPTools(this.lspManager);

    [...fsTools.getTools(), ...shTools.getTools(), ...hoTools.getTools(), ...lspTools.getTools()].forEach((tool) => {
      this.toolRouter.registerTool(tool);
    });

    // Register default search tool
    this.toolRouter.registerTool({
      name: 'search_workspace',
      description: 'Search the codebase using semantic search.',
      parameters: {
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

    const storagePath = path.join(this.context.workspacePath, '.octotask');
    const vectorStorePath = path.join(storagePath, 'vector_store.json');
    const metadataPath = path.join(storagePath, 'metadata.json');

    try {
      console.log('CoreAgent: Starting workspace indexing...');

      // 1. Load existing state
      await this.vectorStore.load(vectorStorePath);

      let oldMetadata = {};

      try {
        const metaData = await fs.readFile(metadataPath, 'utf-8');
        oldMetadata = JSON.parse(metaData);
      } catch {
        // Safe to ignore if metadata doesn't exist
      }

      // 2. Incremental Index
      const indexResult = await this.indexer.indexWorkspace(this.context.workspacePath, oldMetadata);

      // 3. Sync Vector Store
      for (const deletedFile of indexResult.deletedFiles) {
        this.vectorStore.removeDocuments(deletedFile);
      }

      for (const changedDoc of indexResult.changedDocuments) {
        // Clear old vectors if the file was modified
        this.vectorStore.removeDocuments(changedDoc.path);
      }

      if (indexResult.changedDocuments.length > 0) {
        await this.vectorStore.addDocuments(
          indexResult.changedDocuments.map((doc) => ({
            path: doc.path,
            chunks: doc.chunks,
          })),
        );
      }

      // 4. Persist state
      await this.vectorStore.save(vectorStorePath);
      await fs.mkdir(storagePath, { recursive: true });
      await fs.writeFile(metadataPath, JSON.stringify(indexResult.metadata), 'utf-8');

      console.log('CoreAgent: Workspace indexing complete.');
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

  async execute(goal: string): Promise<string> {
    return this.runLoop(goal);
  }

  protected async runLoop(goal: string): Promise<string> {
    console.log(`CoreAgent: Starting loop for goal: "${goal}"`);
    this.status = 'planning';
    this.emit('status', this.status);

    let iterations = 0;
    const MAX_ITERATIONS = 10;
    let running = true;
    let resultText = '';

    while (running && iterations < MAX_ITERATIONS) {
      iterations++;
      console.log(`CoreAgent: Iteration ${iterations}`);

      // 1. Context Retrieval (RAG)
      const contextResults = await this.vectorStore.search(goal);
      const contextStr = contextResults.map((r) => r.chunk).join('\n---\n');

      // 2. Plan / Decide Action
      const persona = (this as any).persona; // Use property if it exists (e.g. on DefaultAgent)
      const systemPrompt = this.promptFactory.generateSystemPrompt(this.context, persona);
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
      let response;

      try {
        response = await llmService.generate({
          system: systemPrompt,
          message: userPrompt,
          model: modelName,
          provider: { name: providerName } as any,
          apiKeys,
          serverEnv: {},
          tools: this.toolRouter.getToolsForSDK(),
        });
        resultText = response.text;
        console.log('LLM Response Text:', resultText);
      } catch (error: any) {
        console.error('LLM Generation Error:', error);
        this.memory.add({ role: 'system', content: `Error: ${error.message}` });
        break;
      }

      // 4. Act
      this.status = 'acting';
      this.emit('status', this.status);

      const toolResults: any[] = [];

      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          try {
            console.log(`CoreAgent: Executing tool call: ${toolCall.toolName}`, toolCall.args);

            const result = await this.toolRouter.executeTool(toolCall.toolName, toolCall.args);
            toolResults.push({ toolCallId: toolCall.toolCallId, result });
          } catch (e: any) {
            toolResults.push({ toolCallId: toolCall.toolCallId, error: e.message });
          }
        }
      }

      // 5. Observe / Memorize
      this.status = 'observing';
      this.emit('status', this.status);

      this.memory.add({ role: 'user', content: userPrompt });
      this.memory.add({ role: 'assistant', content: resultText });

      if (toolResults.length > 0) {
        this.memory.add({ role: 'system', content: `Tool Results: ${JSON.stringify(toolResults)}` });
      }

      /*
       * Detect "finish" if LLM just gave text without tools and it looks like it's done
       * Or if iterations reach max.
       * In professional apps, we'd have a specific "finish" tool.
       */
      if (!response.toolCalls || response.toolCalls.length === 0) {
        if (resultText.toLowerCase().includes('task complete') || resultText.toLowerCase().includes('finished')) {
          running = false;
        }
      }

      if (iterations >= MAX_ITERATIONS) {
        running = false;
      }
    }

    this.status = 'idle';
    this.emit('status', this.status);
    this.interactiveShell.kill();
    this.lspManager.stop();
    console.log('CoreAgent: Loop finished.');

    return resultText;
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
