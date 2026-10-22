import { defineConfig } from 'vitest/config';

// Not part of `npm test`: run with `npx vitest run --config scripts/render-trace/vitest.config.mts`.
export default defineConfig({
  root: new URL('../..', import.meta.url).pathname,
  test: {
    include: ['scripts/render-trace/trace.test.ts'],
    environment: 'node',
    setupFiles: ['scripts/render-trace/setup.ts'],
    testTimeout: 120000,
  },
});
