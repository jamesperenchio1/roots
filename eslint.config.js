import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.claude', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // shadcn/ui components legitimately export helpers alongside components.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Common sync-from-URL / localStorage patterns are acceptable in this codebase.
      'react-hooks/set-state-in-effect': 'off',
      // Seeded demo data and skeleton placeholders use deterministic pseudo-randomness.
      'react-hooks/purity': 'off',
      // Existing data layer uses any for Supabase row typing; tighten incrementally.
      '@typescript-eslint/no-explicit-any': 'warn',
      // React Compiler is experimental and flags safe manual memoization; disable false positives.
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
])
