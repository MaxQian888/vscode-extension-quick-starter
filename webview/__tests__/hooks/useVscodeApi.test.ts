import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
});
