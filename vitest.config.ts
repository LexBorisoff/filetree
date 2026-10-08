import tsconfigPaths from 'vite-tsconfig-paths';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/types',
        '**/*.types.ts',
        '**/index.ts',
      ],
    },
  },
});
