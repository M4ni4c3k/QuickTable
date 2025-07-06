/**
 * ESLint configuration for the QuickTable restaurant management system
 * 
 * This configuration provides:
 * - TypeScript support with recommended rules
 * - React Hooks linting for proper hook usage
 * - React Refresh support for development
 * - Browser globals for web application development
 */

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

/**
 * Main ESLint configuration
 * Extends recommended TypeScript and JavaScript rules
 * Adds React-specific plugins and rules
 */
export default tseslint.config(
  { ignores: ['dist'] }, // Ignore build output directory
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'], // Apply to TypeScript and TSX files
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser, // Browser environment globals
    },
    plugins: {
      'react-hooks': reactHooks, // React Hooks linting
      'react-refresh': reactRefresh, // React Refresh support
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true }, // Allow constant exports for components
      ],
    },
  },
)
