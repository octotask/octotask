import blitzPlugin from '@blitz/eslint-plugin';
import { jsFileExtensions } from '@blitz/eslint-plugin/dist/configs/javascript.js';
import { getNamingConventionRule, tsFileExtensions } from '@blitz/eslint-plugin/dist/configs/typescript.js';

export default [
  {
    ignores: ['**/dist', '**/node_modules', '**/.wrangler', '**/build', '**/.history'],
  },
  ...blitzPlugin.configs.recommended(),
  {
    rules: {
      '@blitz/catch-error-name': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@blitz/comment-syntax': 'off',
      '@blitz/block-scope-case': 'off',
      'array-bracket-spacing': ['error', 'never'],
      'object-curly-newline': ['error', { consistent: true }],
      'keyword-spacing': ['error', { before: true, after: true }],
      'consistent-return': 'error',
      semi: ['error', 'always'],
      curly: ['error'],
      'no-eval': ['error'],
      'linebreak-style': ['error', 'unix'],
      'arrow-spacing': ['error', { before: true, after: true }],
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    files: [...tsFileExtensions, ...jsFileExtensions, '**/*.tsx'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'forbid',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          format: ['UPPER_CASE'],
          filter: {
            regex: '^__',
            match: true,
          },
          leadingUnderscore: 'allow',
        },
        {
          selector: 'parameter',
          format: null,
          filter: {
            regex: '^_$',
            match: true,
          },
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'forbid', // For other parameters, forbid leading underscore
        },
        {
          selector: 'parameter',
          modifiers: ['unused'],
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'property',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow', // Allow leading underscores for private properties
        },
        {
          selector: ['classProperty', 'objectLiteralProperty'],
          format: null, // Allow any format for __html
          leadingUnderscore: 'allow', // Allow leading underscores
          filter: {
            regex: '^__html$',
            match: true,
          },
        },
        {
          selector: 'objectLiteralProperty',
          format: null, // Allow any format for object literal properties that are quoted or special cases
          modifiers: ['requiresQuotes'],
        },
        {
          selector: 'objectLiteralProperty', // Fallback for other unquoted properties
          format: ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'], // Allow snake_case
          leadingUnderscore: 'allow',
        },
        {
          selector: 'parameterProperty', // Rule for parameter properties (constructor args that become properties)
          format: ['camelCase'],
          leadingUnderscore: 'allow', // Allow leading underscore for private parameter properties
        },
        {
          selector: 'method',
          format: ['camelCase'],
          leadingUnderscore: 'allow', // Allow leading underscores for private methods
        },
        {
          selector: 'accessor',
          format: ['camelCase'],
          leadingUnderscore: 'allow', // Allow leading underscores for private accessors
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'class',
          format: ['PascalCase'],
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['PascalCase', 'UPPER_CASE'],
        },
        {
          selector: 'typeParameter',
          format: ['PascalCase'], // Allow PascalCase for type parameters
        },
        {
          selector: 'typeProperty',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'], // Allow snake_case
          leadingUnderscore: 'allow',
        },
        {
          selector: 'import', // Rule for import statements
          format: ['camelCase', 'PascalCase'], // Allow both camelCase (for values) and PascalCase (for components/types)
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../'],
              message: "Relative imports are not allowed. Please use '~/' instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    files: [...tsFileExtensions, ...jsFileExtensions, '**/*.tsx'],
    ignores: ['functions/*', 'electron/**/*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../'],
              message: "Relative imports are not allowed. Please use '~/' instead.",
            },
          ],
        },
      ],
    },
  },
];
