import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Include all test files in the workspace
    include: [
      'server/src/**/*.test.ts',
      'packages/**/src/**/*.test.ts',
      'modules/**/src/**/*.test.ts',
    ],
    // Explicitly exclude E2E tests and other non-unit test files
    exclude: [
      'node_modules',
      'dist',
      '**/e2e/**',
      '**/*.e2e.ts',
      '**/*.e2e-spec.ts',
      '**/*.spec.e2e.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'dist',
        '**/e2e/**',
        '**/*.test.ts',
        '**/*.d.ts',
        '**/index.ts',
      ],
    },
  },
});
