import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useVscodeMessage } from '@/hooks/useVscodeMessage';

function dispatchMessage(data: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data }));
}

describe('useVscodeMessage', () => {
  it('invokes handler when matching type arrives', () => {
    const handler = vi.fn();
    renderHook(() => useVscodeMessage('hello', handler));

    act(() => dispatchMessage({ type: 'hello', data: 'world' }));
    expect(handler).toHaveBeenCalledWith({ type: 'hello', data: 'world' });
  });

  it('ignores non-matching types', () => {
    const handler = vi.fn();
    renderHook(() => useVscodeMessage('hello', handler));

    act(() => dispatchMessage({ type: 'theme/changed', kind: 'dark' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('removes listener on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useVscodeMessage('hello', handler));
    unmount();

    act(() => dispatchMessage({ type: 'hello', data: 'after-unmount' }));
    expect(handler).not.toHaveBeenCalled();
  });
});
