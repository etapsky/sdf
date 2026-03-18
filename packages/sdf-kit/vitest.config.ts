// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // SDF_FORMAT.md Section 13.4: MUST maintain ≥80% line and branch coverage
      thresholds: {
        lines:    80,
        branches: 80,
        functions: 75,
        statements: 80,
      },
      exclude: [
        'dist/**',
        'tests/**',
        '**/*.d.ts',
        '**/index.ts',
        'src/core/types.ts',
        'vitest.config.ts',
      ],
    },
  },
});
