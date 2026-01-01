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
import { TextUtility } from '~/utils/TextUtility';
import { TestSurface } from '~/core/workspace/TestSurface';
import { FlowPersistence } from '~/core/workspace/FlowPersistence';

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
  protected testSurface: TestSurface;
  protected flowPersistence: FlowPersistence;
  protected _sessionId: string;
  protected _tokenMetrics = {
    input: 0,
    output: 0,
    pruned: 0,
    turns: 0,
  };

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
    this.testSurface = new TestSurface();
    this.flowPersistence = new FlowPersistence(context.workspacePath);
    this._sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Register Tools with Grouping
    const fsTools = new FileSystemTools(context.workspacePath, this.shadowManager);
    const shTools = new ShellTools(context.workspacePath, this.interactiveShell);
    const hoTools = new HandoverTools(context, this.delegationDepth + 1);
    const lspTools = new LSPTools(this.lspManager);

    fsTools.getTools().forEach((t) => this.toolRouter.registerTool({ ...t, groups: ['ACT', 'CODE'] }));
    shTools.getTools().forEach((t) => this.toolRouter.registerTool({ ...t, groups: ['ACT', 'SHELL'] }));
    hoTools.getTools().forEach((t) => this.toolRouter.registerTool({ ...t, groups: ['PLAN', 'ACT'] }));
    lspTools.getTools().forEach((t) => this.toolRouter.registerTool({ ...t, groups: ['PLAN', 'LSP'] }));

    // Register default search tool
    this.toolRouter.registerTool({
      name: 'search_workspace',
      description: 'Search the codebase using semantic search.',
      groups: ['PLAN', 'WORKSPACE'],
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
      this.status = 'planning';
      this.emit('status', this.status);

      // 1. Context Retrieval (RAG)
      const contextResults = await this.vectorStore.search(goal);
      const contextStr = contextResults.map((r) => r.chunk).join('\n---\n');

      // 2. Plan / Decide Action
      const persona = (this as any).persona;
      const systemPrompt = this.promptFactory.generateSystemPrompt(this.context, persona, {
        includeWorkflows: iterations === 1,
        agentStatus: this.status,
      });

      // Synthesis Flow Narrative from FlowStore
      const flowStore = this.memory.getFlowStore();
      const flowAwarePrompt = this.promptFactory.generateFlowAwarePrompt(
        goal,
        contextStr,
        flowStore.getWindow(),
        this.testSurface,
      );

      console.log('--- System Prompt ---\n', systemPrompt);
      console.log('--- Flow-Aware User Prompt ---\n', flowAwarePrompt);

      /*
       * 3. LLM Call
       * Retrieve keys
       */
      const apiKeys: Record<string, string> = {};

      if (this.context.vault) {
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
        // Construct messages: history + current prompt
        const messages = [...this.memory.getHistory(), { role: 'user' as const, content: flowAwarePrompt }];

        response = await llmService.generate({
          system: systemPrompt,
          messages,
          model: modelName,
          provider: { name: providerName } as any,
          apiKeys,
          serverEnv: {},
          tools: this.toolRouter.getToolsForSDK(this.status === 'planning' ? 'PLAN' : 'ACT'),
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

            // FLOW: Log Action
            const actionEntry = flowStore.append({
              type: 'action',
              surface: this._getSurfaceForTool(toolCall.toolName),
              content: { tool: toolCall.toolName, args: toolCall.args },
            });

            const rawResult = await this.toolRouter.executeTool(toolCall.toolName, toolCall.args);

            // Graduated Truncation based on current context load
            const currentContextSize = JSON.stringify(this.memory.getHistory()).length / 4;
            const truncationLevel = currentContextSize > 20000 ? 'heavy' : 'medium';
            const result =
              typeof rawResult === 'string' ? TextUtility.smartTruncate(rawResult, truncationLevel) : rawResult;

            // FLOW: Log Observation (Causality linked to Action)
            flowStore.append({
              type: 'observation',
              surface: this._getSurfaceForTool(toolCall.toolName),
              content: result,
              causedBy: [actionEntry.id],
            });

            toolResults.push({ toolCallId: toolCall.toolCallId, result });
          } catch (e: any) {
            toolResults.push({ toolCallId: toolCall.toolCallId, error: e.message });
          }
        }
      }

      // 5. Observe / Memorize
      this.status = 'observing';
      this.emit('status', this.status);

      // Token Tracking (Simplified Estimation)
      const inputEst = (systemPrompt.length + flowAwarePrompt.length) / 4;
      const outputEst = resultText.length / 4;
      const prunedEst = contextStr.length / 4;

      this._tokenMetrics.input += inputEst;
      this._tokenMetrics.output += outputEst;
      this._tokenMetrics.pruned += prunedEst;
      this._tokenMetrics.turns++;

      console.log(
        `[TELEMETRY] Turn ${iterations}: In: ${Math.round(inputEst)}, Out: ${Math.round(outputEst)}, Pruned: ${Math.round(prunedEst)}`,
      );

      // 5.1 Failure Isolation: Separate successful results from intermediate failures
      const successfulResults = toolResults.filter((r) => !r.error);
      const failedResults = toolResults.filter((r) => r.error);

      // Persist GOAL and Successful results to Conversational Memory
      this.memory.add({ role: 'user', content: `GOAL: ${goal}` });
      this.memory.add({ role: 'assistant', content: resultText });

      if (successfulResults.length > 0) {
        this.memory.add({ role: 'system', content: `Tool Successes: ${JSON.stringify(successfulResults)}` });
      }

      // Isolate Failures to Telemetry (Not sent back to LLM context)
      if (failedResults.length > 0) {
        console.warn(`[GOVERNANCE] Isolating ${failedResults.length} tool failures from context.`);
        this.memory.addTelemetry(
          { role: 'system', content: `Isolated Tool Failures: ${JSON.stringify(failedResults)}` },
          { turn: iterations },
        );
      }

      // 5.2 Context Budget Alarm
      const currentContextSize = JSON.stringify(this.memory.getHistory()).length / 4;

      if (currentContextSize > 30000) {
        console.error(`[GOVERNANCE] Context size Alert: ${Math.round(currentContextSize)} tokens. Growth rate high.`);
      }

      // 5.3 Auto-save session every 3 iterations
      if (iterations % 3 === 0) {
        await this.flowPersistence.autoSave(
          this._sessionId,
          goal,
          flowStore.getWindow(),
          this.testSurface.getHistory(),
          {
            iterations,
            tokenMetrics: this._tokenMetrics,
          },
        );
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

  private _getSurfaceForTool(toolName: string): any {
    if (['read_file', 'write_file', 'list_files', 'search_workspace'].includes(toolName)) {
      return 'editor';
    }

    if (['run_command', 'spawn_command', 'read_terminal', 'send_terminal_input'].includes(toolName)) {
      return 'terminal';
    }

    if (toolName.includes('test')) {
      return 'test';
    }

    if (['go_to_definition', 'find_references', 'list_symbols'].includes(toolName)) {
      return 'lsp';
    }

    return 'docs';
  }
}
