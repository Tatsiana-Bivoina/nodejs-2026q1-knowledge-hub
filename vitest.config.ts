import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    passWithNoTests: true,
    include: ['src/**/*.unit.spec.ts', 'src/**/*.unit.test.ts'],
    exclude: ['test/**', 'dist/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/**/*.service.ts',
        'src/auth/guards/*.guard.ts',
        'src/common/pipes/*.pipe.ts',
        'src/common/interceptors/*.interceptor.ts',
        'src/common/filters/*.filter.ts',
        'src/common/pagination/*.ts',
        'src/database/prisma-enums.ts',
      ],
      exclude: [
        'src/**/*.module.ts',
        'src/**/*.controller.ts',
        'src/**/*.dto.ts',
        'src/prisma/prisma.service.ts',
        'src/database/storage.service.ts',
      ],
      thresholds: {
        lines: 90,
        branches: 85,
        functions: 90,
        statements: 90,
      },
    },
  },
});
