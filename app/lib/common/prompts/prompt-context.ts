import type { SupabaseCredentials } from '~/types/supabase';

export interface SupabasePromptState {
  isConnected: boolean;
  hasSelectedProject: boolean;
  credentials?: SupabaseCredentials;
}

/** Returns the Supabase connection reminder required before database work. */
export const getSupabaseStatusInstructions = (supabase?: SupabasePromptState): string => {
  if (!supabase) {
    return '';
  }

  if (!supabase.isConnected) {
    return 'You are not connected to Supabase. Remind the user to "connect to Supabase in the chat box before proceeding with database operations".';
  }

  if (!supabase.hasSelectedProject) {
    return 'Remind the user "You are connected to Supabase but no project is selected. Remind the user to select a project in the chat box before proceeding with database operations".';
  }

  return '';
};

/** Returns the `.env` setup guidance when complete Supabase credentials are available. */
export const getSupabaseEnvironmentInstructions = (supabase?: SupabasePromptState): string => {
  const { supabaseUrl, anonKey } = supabase?.credentials ?? {};
  const hasCredentials = Boolean(supabase?.isConnected && supabase.hasSelectedProject && supabaseUrl && anonKey);

  if (!hasCredentials) {
    return 'IMPORTANT: Create a .env file if it doesnt exist.';
  }

  return `IMPORTANT: Create a .env file if it doesnt exist and include the following variables:
    VITE_SUPABASE_URL=${supabaseUrl}
    VITE_SUPABASE_ANON_KEY=${anonKey}`;
};
