import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from '@/components/ErrorBoundary';

import { mockVsCodeApi } from '../setup';

function Boom(): never {
  throw new Error('boom');
}

describe('errorBoundary', () => {
  it('renders fallback UI on render error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('reports the error to the extension via postMessage', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(mockVsCodeApi.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'webview/error',
        error: expect.objectContaining({ name: 'Error', message: 'boom' }),
      }),
    );
    spy.mockRestore();
  });
});
