import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        // Chrome extension globals
        chrome: 'readonly',

        // Browser globals
        console: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',

        // DOM globals (for content scripts and popup)
        document: 'readonly',
        window: 'readonly',
        MutationObserver: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLButtonElement: 'readonly',
        Event: 'readonly',

        // Node.js globals (for build scripts)
        require: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        Buffer: 'readonly',

        // Additional DOM types
        Element: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLTextAreaElement: 'readonly',

        // Browser APIs
        confirm: 'readonly',
        prompt: 'readonly',

        // Test globals
        global: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      // Allow console in Chrome extension development
      'no-console': 'off',
      // Allow any type in tests
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow unused vars starting with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Node.js scripts
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    // Ignore built files and build scripts
    ignores: ['dist/**', 'node_modules/**', 'create-*.js'],
  },
]
