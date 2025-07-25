import type {
  ActionType,
  OctotaskAction,
  OctotaskActionData,
  FileAction,
  ShellAction,
  SupabaseAction,
} from '~/types/actions';
import type { OctotaskArtifactData } from '~/types/artifact';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';

const ARTIFACT_TAG_OPEN = '<octotaskArtifact';
const ARTIFACT_TAG_CLOSE = '</octotaskArtifact>';
const ARTIFACT_ACTION_TAG_OPEN = '<octotaskAction';
const ARTIFACT_ACTION_TAG_CLOSE = '</octotaskAction>';
const OCTOTASK_QUICK_ACTIONS_OPEN = '<octotask-quick-actions>';
const OCTOTASK_QUICK_ACTIONS_CLOSE = '</octotask-quick-actions>';

const logger = createScopedLogger('MessageParser');

export interface ArtifactCallbackData extends OctotaskArtifactData {
  messageId: string;
}

export interface ActionCallbackData {
  artifactId: string;
  messageId: string;
  actionId: string;
  action: OctotaskAction;
}

export type ArtifactCallback = (data: ArtifactCallbackData) => void;
export type ActionCallback = (data: ActionCallbackData) => void;

export interface ParserCallbacks {
  onArtifactOpen?: ArtifactCallback;
  onArtifactClose?: ArtifactCallback;
  onActionOpen?: ActionCallback;
  onActionStream?: ActionCallback;
  onActionClose?: ActionCallback;
}

interface ElementFactoryProps {
  messageId: string;
}

type ElementFactory = (props: ElementFactoryProps) => string;

export interface StreamingMessageParserOptions {
  callbacks?: ParserCallbacks;
  artifactElement?: ElementFactory;
}

interface MessageState {
  position: number;
  insideArtifact: boolean;
  insideAction: boolean;
  currentArtifact?: OctotaskArtifactData;
  currentAction: OctotaskActionData;
  actionId: number;
}

function cleanoutMarkdownSyntax(content: string) {
  const codeBlockRegex = /^\s*```\w*\n([\s\S]*?)\n\s*```\s*$/;
  const match = content.match(codeBlockRegex);

  return match ? match[1] : content;
}

function cleanEscapedTags(content: string) {
  return content.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export class StreamingMessageParser {
  #messages = new Map<string, MessageState>();

  constructor(private _options: StreamingMessageParserOptions = {}) {}

  parse(messageId: string, input: string) {
    let state = this.#messages.get(messageId);

    if (!state) {
      state = {
        position: 0,
        insideAction: false,
        insideArtifact: false,
        currentAction: { content: '' },
        actionId: 0,
      };
      this.#messages.set(messageId, state);
    }

    let output = '';
    let i = state.position;

    while (i < input.length) {
      if (input.startsWith(OCTOTASK_QUICK_ACTIONS_OPEN, i)) {
        const actionsBlockEnd = input.indexOf(OCTOTASK_QUICK_ACTIONS_CLOSE, i);

        if (actionsBlockEnd !== -1) {
          const actionsBlockContent = input.slice(i + OCTOTASK_QUICK_ACTIONS_OPEN.length, actionsBlockEnd);
          const quickActionRegex = /<octotask-quick-action([^>]*)>([\s\S]*?)<\/octotask-quick-action>/g;
          let match;
          const buttons = [];

          while ((match = quickActionRegex.exec(actionsBlockContent)) !== null) {
            const tagAttrs = match[1];
            const label = match[2];
            const type = this.#extractAttribute(tagAttrs, 'type');
            const message = this.#extractAttribute(tagAttrs, 'message');
            const path = this.#extractAttribute(tagAttrs, 'path');
            const href = this.#extractAttribute(tagAttrs, 'href');
            buttons.push(
              createQuickActionElement(
                { type: type || '', message: message || '', path: path || '', href: href || '' },
                label,
              ),
            );
          }

          output += createQuickActionGroup(buttons);
          i = actionsBlockEnd + OCTOTASK_QUICK_ACTIONS_CLOSE.length;
          continue;
        }
      }

      if (state.insideArtifact) {
        const currentArtifact = state.currentArtifact;

        if (!currentArtifact) {
          unreachable('Artifact not initialized');
        }

        if (state.insideAction) {
          const closeIndex = input.indexOf(ARTIFACT_ACTION_TAG_CLOSE, i);
          const currentAction = state.currentAction;

          if (closeIndex !== -1) {
            currentAction.content += input.slice(i, closeIndex).trim();

            if ('type' in currentAction && currentAction.type === 'file') {
              if (!currentAction.filePath.endsWith('.md')) {
                currentAction.content = cleanoutMarkdownSyntax(currentAction.content);
                currentAction.content = cleanEscapedTags(currentAction.content);
              }

              currentAction.content += '\n';
            }

            this._options.callbacks?.onActionClose?.({
              artifactId: currentArtifact.id,
              messageId,
              actionId: String(state.actionId - 1),
              action: currentAction as OctotaskAction,
            });

            state.insideAction = false;
            state.currentAction = { content: '' };
            i = closeIndex + ARTIFACT_ACTION_TAG_CLOSE.length;
          } else {
            if ('type' in currentAction && currentAction.type === 'file') {
              let content = input.slice(i);

              if (!currentAction.filePath.endsWith('.md')) {
                content = cleanoutMarkdownSyntax(content);
                content = cleanEscapedTags(content);
              }

              this._options.callbacks?.onActionStream?.({
                artifactId: currentArtifact.id,
                messageId,
                actionId: String(state.actionId - 1),
                action: { ...(currentAction as FileAction), content, filePath: currentAction.filePath },
              });
            }

            break;
          }
        } else {
          const actionOpenIndex = input.indexOf(ARTIFACT_ACTION_TAG_OPEN, i);
          const artifactCloseIndex = input.indexOf(ARTIFACT_TAG_CLOSE, i);

          if (actionOpenIndex !== -1 && (artifactCloseIndex === -1 || actionOpenIndex < artifactCloseIndex)) {
            const actionEndIndex = input.indexOf('>', actionOpenIndex);

            if (actionEndIndex !== -1) {
              state.insideAction = true;
              state.currentAction = this.#parseActionTag(input, actionOpenIndex, actionEndIndex);
              this._options.callbacks?.onActionOpen?.({
                artifactId: currentArtifact.id,
                messageId,
                actionId: String(state.actionId++),
                action: state.currentAction as OctotaskAction,
              });
              i = actionEndIndex + 1;
            } else {
              break;
            }
          } else if (artifactCloseIndex !== -1) {
            this._options.callbacks?.onArtifactClose?.({ messageId, ...currentArtifact });
            state.insideArtifact = false;
            state.currentArtifact = undefined;
            i = artifactCloseIndex + ARTIFACT_TAG_CLOSE.length;
          } else {
            break;
          }
        }
      } else if (input[i] === '<' && input[i + 1] !== '/') {
        let j = i;
        let processedTag = false;

        if (input.startsWith(ARTIFACT_TAG_OPEN, i)) {
          let k = i + ARTIFACT_TAG_OPEN.length;

          while (k < input.length) {
            if (input[k] === '>') {
              const artifactTag = input.slice(i, k + 1);
              const artifactTitle = this.#extractAttribute(artifactTag, 'title') || '';
              const type = this.#extractAttribute(artifactTag, 'type') || '';
              const artifactId = this.#extractAttribute(artifactTag, 'id') || '';

              if (!artifactTitle) {
                logger.warn('Artifact title missing');
              }

              if (!artifactId) {
                logger.warn('Artifact id missing');
              }

              state.insideArtifact = true;

              const currentArtifact = { id: artifactId, title: artifactTitle, type } satisfies OctotaskArtifactData;
              state.currentArtifact = currentArtifact;
              this._options.callbacks?.onArtifactOpen?.({ messageId, ...currentArtifact });

              const artifactFactory = this._options.artifactElement ?? createArtifactElement;
              output += artifactFactory({ messageId });
              i = k + 1;
              processedTag = true;
              break;
            }

            k++;
          }

          if (!processedTag) {
            i = input.length;
          }
        } else {
          while (j < input.length && input[j] !== '<') {
            j++;
          }
          output += input.slice(i, j);
          i = j;
          processedTag = true;
        }

        if (!processedTag) {
          output += input[i];
          i++;
        }
      } else {
        output += input[i];
        i++;
      }
    }

    state.position = i;

    return output;
  }

  reset() {
    this.#messages.clear();
  }

  #parseActionTag(input: string, actionOpenIndex: number, actionEndIndex: number) {
    const actionTag = input.slice(actionOpenIndex, actionEndIndex + 1);
    const actionType = this.#extractAttribute(actionTag, 'type') as ActionType;
    const actionAttributes = { type: actionType, content: '' };

    if (actionType === 'supabase') {
      const operation = this.#extractAttribute(actionTag, 'operation');

      if (!operation || !['migration', 'query'].includes(operation)) {
        logger.warn(`Invalid or missing operation for Supabase action: ${operation}`);
        throw new Error(`Invalid Supabase operation: ${operation}`);
      }

      (actionAttributes as SupabaseAction).operation = operation as 'migration' | 'query';

      if (operation === 'migration') {
        const filePath = this.#extractAttribute(actionTag, 'filePath');

        if (!filePath) {
          logger.warn('Migration requires a filePath');
          throw new Error('Migration requires a filePath');
        }

        (actionAttributes as SupabaseAction).filePath = filePath;
      }
    } else if (actionType === 'file') {
      const filePath = this.#extractAttribute(actionTag, 'filePath') as string;

      if (!filePath) {
        logger.debug('File path not specified');
      }

      (actionAttributes as FileAction).filePath = filePath;
    } else if (!['shell', 'start'].includes(actionType)) {
      logger.warn(`Unknown action type '${actionType}'`);
    }

    return actionAttributes as FileAction | ShellAction;
  }

  #extractAttribute(tag: string, attributeName: string): string | undefined {
    const match = tag.match(new RegExp(`${attributeName}="([^"]*)"`, 'i'));
    return match ? match[1] : undefined;
  }
}

const createArtifactElement: ElementFactory = (props) => {
  const elementProps = [
    'class="__octotaskArtifact__"',
    ...Object.entries(props).map(([key, value]) => `data-${camelToDashCase(key)}=${JSON.stringify(value)}`),
  ];
  return `<div ${elementProps.join(' ')}></div>`;
};

function camelToDashCase(input: string) {
  return input.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function createQuickActionElement(props: Record<string, string>, label: string) {
  const elementProps = [
    'class="__octotaskQuickAction__"',
    'data-octotask-quick-action="true"',
    ...Object.entries(props).map(([key, value]) => `data-${camelToDashCase(key)}=${JSON.stringify(value)}`),
  ];
  return `<button ${elementProps.join(' ')}>${label}</button>`;
}

function createQuickActionGroup(buttons: string[]) {
  return `<div class="__octotaskQuickAction__" data-octotask-quick-action="true">${buttons.join('')}</div>`;
}
