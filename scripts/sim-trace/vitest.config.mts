import { defineConfig } from 'vitest/config';

// Not part of `npm test`: run with `npx vitest run --config scripts/sim-trace/vitest.config.mts`.
export default defineConfig({
  root: new URL('../..', import.meta.url).pathname,
  test: {
    include: ['scripts/sim-trace/trace.test.ts'],
    environment: 'node',
    testTimeout: 900000,
  },
});
