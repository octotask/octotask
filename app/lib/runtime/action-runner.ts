import type { WebContainer } from '@webcontainer/api';
import { trace } from '@opentelemetry/api';
import { atom, map } from 'nanostores';
import type { ActionAlert, DeployAlert, SupabaseAction, SupabaseAlert } from '~/types/actions';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';
import type { ActionCallbackData } from './message-parser';
import type { OctoShell } from '~/utils/shell';
import { LLMService } from '~/lib/llm/LLMService';
import type { MemoryMonitor } from './MemoryMonitor';
import { ActionExecutor } from './ActionExecutor';
import type { ActionStateUpdate } from './action-types';
import type { ActionsMap } from './action-types';

const logger = createScopedLogger('ActionRunner');
const tracer = trace.getTracer('action-runner');

export type ActionStatus = 'pending' | 'running' | 'complete' | 'aborted' | 'failed';

export class ActionRunner {
  #currentExecutionPromise: Promise<void> = Promise.resolve();
  #actionExecutor: ActionExecutor;

  runnerId = atom<string>(`${Date.now()}`);
  actions: ActionsMap = map({});
  onAlert?: (alert: ActionAlert) => void;
  onSupabaseAlert?: (alert: SupabaseAlert) => void;
  onDeployAlert?: (alert: DeployAlert) => void;
  buildOutput?: { path: string; exitCode: number; output: string };

  constructor(
    webcontainerPromise: Promise<WebContainer>,
    getShellTerminal: () => OctoShell,
    llmService: LLMService,
    apiKeys: Record<string, string>,
    memoryMonitor: MemoryMonitor,
    onAlert?: (alert: ActionAlert) => void,
    onSupabaseAlert?: (alert: SupabaseAlert) => void,
    onDeployAlert?: (alert: DeployAlert) => void,
  ) {
    this.#actionExecutor = new ActionExecutor(
      webcontainerPromise,
      getShellTerminal,
      llmService,
      apiKeys,
      memoryMonitor,
      onAlert,
    );
    this.onSupabaseAlert = onSupabaseAlert;
    this.onDeployAlert = onDeployAlert;
  }

  addAction(data: ActionCallbackData) {
    const { actionId } = data;

    const actions = this.actions.get();
    const action = actions[actionId];

    if (action) {
      // action already added
      return;
    }

    const abortController = new AbortController();

    this.actions.setKey(actionId, {
      ...data.action,
      status: 'pending',
      executed: false,
      abort: () => {
        abortController.abort();
        this.#updateAction(actionId, { status: 'aborted' });
      },
      abortSignal: abortController.signal,
    });

    this.#currentExecutionPromise.then(() => {
      this.#updateAction(actionId, { status: 'running' });
    });
  }

  async runAction(data: ActionCallbackData, isStreaming: boolean = false) {
    return tracer.startActiveSpan('ActionRunner.runAction', async (span) => {
      const { actionId } = data;
      const action = this.actions.get()[actionId];

      if (!action) {
        span.recordException(new Error(`Action ${actionId} not found`));
        span.end();
        unreachable(`Action ${actionId} not found`);
      }

      span.setAttributes({
        'action.id': actionId,
        'action.type': action.type,
        'action.streaming': isStreaming,
      });

      if (action.executed) {
        span.end();
        return; // No return value here
      }

      if (isStreaming && action.type !== 'file') {
        span.end();
        return; // No return value here
      }

      this.#updateAction(actionId, { ...action, ...data.action, executed: !isStreaming });

      this.#currentExecutionPromise = this.#currentExecutionPromise
        .then(() => {
          return this.#actionExecutor.execute(action, this.runnerId.get());
        })
        .catch((error) => {
          logger.error('Action execution promise failed:', error);
          span.recordException(error);
        });

      await this.#currentExecutionPromise;
      span.end();
    });
  }

  #updateAction(id: string, newState: ActionStateUpdate) {
    const actions = this.actions.get();
    this.actions.setKey(id, { ...actions[id], ...newState });
  }
  async handleSupabaseAction(action: SupabaseAction) {
    const { operation, content, filePath } = action;
    logger.debug('[Supabase Action]:', { operation, filePath, content });

    switch (operation) {
      case 'migration':
        if (!filePath) {
          throw new Error('Migration requires a filePath');
        }

        // Show alert for migration action
        this.onSupabaseAlert?.({
          type: 'info',
          title: 'Supabase Migration',
          description: `Create migration file: ${filePath}`,
          content,
          source: 'supabase',
        });

        // Create the migration file via ActionExecutor
        {
          const fileAction = {
            type: 'file' as const,
            filePath,
            content,
            status: 'pending' as const,
            executed: false,
            abort: () => {
              // noop - migration file actions don't support abort
            },
            abortSignal: new AbortController().signal,
          };
          await this.#actionExecutor.execute(fileAction, this.runnerId.get());

          return { success: true };
        }

      case 'query': {
        // Always show the alert and let the SupabaseAlert component handle connection state
        this.onSupabaseAlert?.({
          type: 'info',
          title: 'Supabase Query',
          description: 'Execute database query',
          content,
          source: 'supabase',
        });

        // The actual execution will be triggered from SupabaseChatAlert
        return { pending: true };
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  // Add this method declaration to the class
  handleDeployAction(
    stage: 'building' | 'deploying' | 'complete',
    status: ActionStatus,
    details?: {
      url?: string;
      error?: string;
      source?: 'netlify' | 'vercel' | 'github' | 'gitlab';
    },
  ): void {
    if (!this.onDeployAlert) {
      logger.debug('No deploy alert handler registered');
      return;
    }

    const alertType = status === 'failed' ? 'error' : status === 'complete' ? 'success' : 'info';

    const title =
      stage === 'building'
        ? 'Building Application'
        : stage === 'deploying'
          ? 'Deploying Application'
          : 'Deployment Complete';

    const description =
      status === 'failed'
        ? `${stage === 'building' ? 'Build' : 'Deployment'} failed`
        : status === 'running'
          ? `${stage === 'building' ? 'Building' : 'Deploying'} your application...`
          : status === 'complete'
            ? `${stage === 'building' ? 'Build' : 'Deployment'} completed successfully`
            : `Preparing to ${stage === 'building' ? 'build' : 'deploy'} your application`;

    const buildStatus =
      stage === 'building' ? status : stage === 'deploying' || stage === 'complete' ? 'complete' : 'pending';

    const deployStatus = stage === 'building' ? 'pending' : status;

    this.onDeployAlert({
      type: alertType,
      title,
      description,
      content: details?.error || '',
      url: details?.url,
      stage,
      buildStatus: buildStatus as any,
      deployStatus: deployStatus as any,
      source: details?.source || 'netlify',
    });
  }
}
