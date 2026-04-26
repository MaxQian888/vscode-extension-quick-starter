import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

const mockVsCodeApi = {
  postMessage: vi.fn(),
  getState: vi.fn(() => undefined),
  setState: vi.fn((state: unknown) => state),
};

(globalThis as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi = vi.fn(
  () => mockVsCodeApi,
);

export { mockVsCodeApi };
