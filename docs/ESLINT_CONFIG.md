# ESLint Configuration

## Overview

This project uses ESLint 8 with flat config format (`eslint.config.js`) for code linting in both server and dashboard applications.

## Configuration Files

- `server/eslint.config.js` - ESLint configuration for Node.js + TypeScript server
- `apps/dashboard/eslint.config.js` - ESLint configuration for React + TypeScript dashboard

## Installed Plugins

The following ESLint plugins are installed at workspace level:

- `@typescript-eslint/parser` - TypeScript parser for ESLint
- `@typescript-eslint/eslint-plugin` - TypeScript-specific linting rules
- `eslint-plugin-react` - React-specific linting rules
- `eslint-plugin-react-hooks` - React Hooks linting rules

## Running Lints

```bash
# Lint all workspaces
pnpm run lint

# Lint server only
cd server && npm run lint

# Lint dashboard only
cd apps/dashboard && npm run lint
```

## Configuration Philosophy

1. **Non-blocking**: Configured to warn (not error) on most issues to prevent CI from failing on non-critical issues
2. **TypeScript Support**: Full TypeScript syntax support without type-aware linting (for performance)
3. **Minimal Rules**: Focus on critical errors and best practices, not style enforcement
4. **React Best Practices**: Hooks rules and JSX validation for the dashboard

## Known Warnings

The codebase currently has some warnings that should be addressed in future updates:

- Unused variables (prefer underscore prefix for intentionally unused vars)
- React Hook dependency warnings
- Console statements in production code

## Flat Config Format

ESLint 9+ uses the new flat config format. Key differences from legacy `.eslintrc`:

- Uses `eslint.config.js` instead of `.eslintrc.*`
- No more `--ext` flag needed (file patterns defined in config)
- Import plugins as ES modules
- Different ignore pattern syntax

## Example Configuration Structure

```javascript
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['node_modules/**', 'dist/**']
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      // Your rules here
    }
  }
];
```

## Future Improvements

- [ ] Enable type-aware linting for stricter TypeScript checks
- [ ] Fix React Hooks violations (conditional hook calls)
- [ ] Remove console.log statements from production code
- [ ] Consider migrating to ESLint 9+ for better performance
