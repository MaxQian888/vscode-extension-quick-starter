import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./webview/__tests__/setup.ts'],
    include: ['webview/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'webview/hooks/**/*.{ts,tsx}',
        'webview/lib/**/*.{ts,tsx}',
        'webview/components/ErrorBoundary.tsx',
      ],
      exclude: [
        'webview/**/*.d.ts',
        'webview/__tests__/**',
        'webview/main.tsx',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
