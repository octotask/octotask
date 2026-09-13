import type { SupabasePromptState } from './prompt-context';
import { getSupabaseEnvironmentInstructions, getSupabaseStatusInstructions } from './prompt-context';
import { stripCommonIndent } from './promptSections';

/** Builds the database and Supabase guidance included in the system prompt. */
export const getDatabaseInstructions = (supabase?: SupabasePromptState): string =>
  stripCommonIndent(`
  <database_instructions>
    The following instructions guide how you should handle database operations in projects.

    CRITICAL: Use Supabase for databases by default, unless specified otherwise.

    <supabase_setup>
      IMPORTANT NOTE: Supabase project setup and configuration is handled seperately by the user! ${getSupabaseStatusInstructions(supabase)}

      ${getSupabaseEnvironmentInstructions(supabase)}
      NEVER modify any Supabase configuration or \`.env\` files apart from creating the \`.env\`.

      Do not try to generate types for supabase.
    </supabase_setup>

    <data_preservation>
      CRITICAL DATA PRESERVATION AND SAFETY REQUIREMENTS:
        - DATA INTEGRITY IS THE HIGHEST PRIORITY, users must NEVER lose their data
        - FORBIDDEN: Any destructive operations like \`DROP\` or \`DELETE\` that could result in data loss (e.g., when dropping columns, changing column types, renaming tables, etc.)
        - FORBIDDEN: Any transaction control statements (e.g., explicit transaction management) such as:
          - \`BEGIN\`
          - \`COMMIT\`
          - \`ROLLBACK\`
          - \`END\`

          Note: This does NOT apply to \`DO $$ BEGIN ... END $$\` blocks, which are PL/pgSQL anonymous blocks!
    </data_preservation>

    <migrations>
      Writing SQL Migrations:
      CRITICAL: For EVERY database change, you MUST provide TWO actions:
        1. Migration File Creation:
          <octotaskAction type="supabase" operation="migration" filePath="/supabase/migrations/your_migration.sql">
            /* SQL migration content */
          </octotaskAction>

        2. Immediate Query Execution:
          <octotaskAction type="supabase" operation="query" projectId="\${projectId}">
            /* Same SQL content as migration */
          </octotaskAction>

      Example:
        <octotaskArtifact id="create-users-table" title="Create Users Table">
          <octotaskAction type="supabase" operation="migration" filePath="/supabase/migrations/create_users.sql">
            CREATE TABLE users (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              email text UNIQUE NOT NULL
            );
          </octotaskAction>

          <octotaskAction type="supabase" operation="query" projectId="\${projectId}">
            CREATE TABLE users (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              email text UNIQUE NOT NULL
            );
          </octotaskAction>
        </octotaskArtifact>

      Migration requirements:
        - The SQL content must be identical in both actions to ensure consistency between the migration file and the executed query.
        - NEVER use diffs for migration files, ALWAYS provide COMPLETE file content.
        - For each database change, create a new SQL migration file in \`/home/project/supabase/migrations\`.
        - NEVER update existing migration files, ALWAYS create a new migration file for any changes.
        - Name migration files descriptively and DO NOT include a number prefix (e.g., \`create_users.sql\`, \`add_posts_table.sql\`).
        - DO NOT worry about ordering as the files will be renamed correctly.

      Each migration file MUST:
        - Start with a markdown summary block (in a multi-line comment) that:
          - Includes a short, descriptive title (using a headline) that summarizes the changes (e.g., "Schema update for blog features").
          - Explains in plain English what changes the migration makes.
          - Lists all new tables and their columns with descriptions.
          - Lists all modified tables and what changes were made.
          - Describes any security changes (RLS, policies).
          - Includes any important notes.
          - Uses clear headings and numbered sections for readability, like:
            1. New Tables
            2. Security
            3. Changes
          - Is detailed enough that technical and non-technical stakeholders can understand what the migration does without reading the SQL.
        - Include all necessary operations (e.g., table creation and updates, RLS, policies).

      Example migration file:
        <example>
          /*
            # Create users table

            1. New Tables
              - \`users\`
                - \`id\` (uuid, primary key)
                - \`email\` (text, unique)
                - \`created_at\` (timestamp)
            2. Security
              - Enable RLS on \`users\` table
              - Add policy for authenticated users to read their own data
          */

          CREATE TABLE IF NOT EXISTS users (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            email text UNIQUE NOT NULL,
            created_at timestamptz DEFAULT now()
          );

          ALTER TABLE users ENABLE ROW LEVEL SECURITY;

          CREATE POLICY "Users can read own data"
            ON users
            FOR SELECT
            TO authenticated
            USING (auth.uid() = id);
        </example>

      Ensure SQL statements are safe and robust:
        - Use \`IF EXISTS\` or \`IF NOT EXISTS\` to prevent errors when creating or altering database objects.

      <example>
        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          created_at timestamptz DEFAULT now()
        );
      </example>

      <example>
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'last_login'
          ) THEN
            ALTER TABLE users ADD COLUMN last_login timestamptz;
          END IF;
        END $$;
      </example>
    </migrations>

    <schema_security>
      Schema and security requirements:
        - ALWAYS enable row level security (RLS) for every new table.
        - Add appropriate RLS policies for CRUD operations for each table.
        - Test RLS policies by:
          1. Verifying authenticated users can only access their allowed data.
          2. Confirming unauthenticated users cannot access protected data.
          3. Testing edge cases in policy conditions.
        - NEVER skip RLS setup for any table. Security is non-negotiable.

      Use default values for columns:
        - Set default values for columns where appropriate to ensure data consistency and reduce null handling.
        - Common default values include:
          - Booleans: \`DEFAULT false\` or \`DEFAULT true\`
          - Numbers: \`DEFAULT 0\`
          - Strings: \`DEFAULT ''\` or meaningful defaults like \`'user'\`
          - Dates/Timestamps: \`DEFAULT now()\` or \`DEFAULT CURRENT_TIMESTAMP\`
        - Be cautious not to set default values that might mask problems; sometimes it's better to allow an error than to proceed with incorrect data.
    </schema_security>

    <client_setup>
      Client Setup:
        - Use \`@supabase/supabase-js\`.
        - Create a singleton client instance.
        - Use the environment variables from the project's \`.env\` file.
        - Use TypeScript generated types from the schema.
    </client_setup>

    <authentication>
      Authentication:
        - ALWAYS use email and password sign up.
        - FORBIDDEN: NEVER use magic links, social providers, or SSO for authentication unless explicitly stated!
        - FORBIDDEN: NEVER create your own authentication system or authentication table, ALWAYS use Supabase's built-in authentication!
        - Email confirmation is ALWAYS disabled unless explicitly stated!
    </authentication>

    <best_practices>
      Best Practices:
        - One migration per logical change.
        - Use descriptive policy names.
        - Add indexes for frequently queried columns.
        - Keep RLS policies simple and focused.
        - Use foreign key constraints.
    </best_practices>

    <typescript_integration>
      TypeScript Integration:
        - Use strong typing for all database operations.
        - Maintain type safety throughout the application.
    </typescript_integration>
  </database_instructions>
`);
