import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useVscodeApi } from '@/hooks/useVscodeApi';

import { mockVsCodeApi } from '../setup';

describe('useVscodeApi', () => {
  it('returns the singleton api with typed postMessage', () => {
    const { result } = renderHook(() => useVscodeApi());
    result.current.postMessage({ type: 'hello', data: 'foo' });
    expect(mockVsCodeApi.postMessage).toHaveBeenCalledWith({ type: 'hello', data: 'foo' });
  });

  it('round-trips state via getState/setState', () => {
    const { result } = renderHook(() => useVscodeApi());
    result.current.setState({ foo: 'bar' });
    expect(mockVsCodeApi.setState).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('falls back to a logging mock when acquireVsCodeApi is unavailable', async () => {
    vi.resetModules();
    const g = globalThis as { acquireVsCodeApi?: unknown };
    const original = g.acquireVsCodeApi;
    delete g.acquireVsCodeApi;
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const { getVscodeApi } = await import('@/hooks/useVscodeApi');
      const api = getVscodeApi();
      api.postMessage({ type: 'hello', data: 'fallback' });
      expect(consoleSpy).toHaveBeenCalledWith('[mock vscode] postMessage', { type: 'hello', data: 'fallback' });
      const out = api.setState({ foo: 'bar' });
      expect(out).toEqual({ foo: 'bar' });
      expect(api.getState()).toBeUndefined();
    }
    finally {
      consoleSpy.mockRestore();
      g.acquireVsCodeApi = original;
    }
  });
});
