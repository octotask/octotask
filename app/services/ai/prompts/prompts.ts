import type { DesignScheme } from '~/types/design-scheme';
import { WORK_DIR } from '~/utils/constants';
import { stripIndents } from '~/utils/stripIndent';
import { getArtifactInstructions } from './artifactInstructions';
import { artifactExamples } from './artifactExamples';
import { chainOfThoughtInstructions } from './chainOfThoughtInstructions';
import { getDatabaseInstructions } from './databaseInstructions';
import { getDesignInstructions } from './designInstructions';
import { codeFormattingInstructions, messageFormattingInstructions } from './formattingInstructions';
import { mobileAppInstructions } from './mobileAppInstructions';
import type { SupabasePromptState } from './prompt-context';
import { responseInstructions } from './responseInstructions';
import { systemConstraints } from './systemConstraints';

const identityPrompt = `You are Octotask, an expert AI assistant and exceptional senior software developer with vast knowledge across multiple programming languages, frameworks, and best practices.`;

/**
 * Builds the original Octotask system prompt from independently maintained sections.
 *
 * @param cwd - Current working directory to expose to the model.
 * @param supabase - Current Supabase connection and project state.
 * @param designScheme - Optional user-provided design preferences.
 * @returns Complete system prompt text.
 */
export const getSystemPrompt = (
  cwd: string = WORK_DIR,
  supabase?: SupabasePromptState,
  designScheme?: DesignScheme,
): string =>
  `\n${[
    identityPrompt,
    systemConstraints,
    getDatabaseInstructions(supabase),
    codeFormattingInstructions,
    messageFormattingInstructions,
    chainOfThoughtInstructions,
    getArtifactInstructions(cwd),
    getDesignInstructions(designScheme),
    responseInstructions,
    mobileAppInstructions,
    artifactExamples,
  ].join('\n\n')}\n`;

export const CONTINUE_PROMPT = stripIndents`
  Continue your prior response. IMPORTANT: Immediately begin from where you left off without any interruptions.
  Do not repeat any content, including artifact and action tags.
`;
