import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

import { mockVsCodeApi } from './setup';

function dispatchMessage(data: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data }));
}

describe('app', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main title', () => {
    render(<App />);
    expect(screen.getByText('VSCode Extension Starter')).toBeInTheDocument();
  });

  it('shows placeholder until extension hello arrives', () => {
    render(<App />);
    expect(screen.getByTestId('extension-payload').textContent).toMatch(/awaiting ready handshake/i);
  });

  it('updates extension-payload when hello is dispatched', () => {
    render(<App />);
    act(() => dispatchMessage({ type: 'hello', data: 'Hello World!' }));
    expect(screen.getByTestId('extension-payload').textContent).toBe('Hello World!');
  });

  it('ignores irrelevant messages', () => {
    render(<App />);
    act(() => dispatchMessage({ type: 'theme/changed', kind: 'dark' }));
    expect(screen.getByTestId('extension-payload').textContent).toMatch(/awaiting ready handshake/i);
  });

  it('sends typed hello on Send button', () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter message...'), { target: { value: 'Hi' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    expect(mockVsCodeApi.postMessage).toHaveBeenCalledWith({ type: 'hello', data: 'Hi' });
  });

  it('falls back to "Empty" when sending without input', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    expect(mockVsCodeApi.postMessage).toHaveBeenCalledWith({ type: 'hello', data: 'Empty' });
  });

  it('persists structured state via setState', () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter state...'), { target: { value: 'saved' } });
    fireEvent.click(screen.getByRole('button', { name: /save state/i }));
    expect(mockVsCodeApi.setState).toHaveBeenCalledWith({ state: 'saved' });
  });

  it('loads structured state via getState', () => {
    mockVsCodeApi.getState.mockReturnValue({ state: 'loaded' } as never);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /load state/i }));
    expect(screen.getByPlaceholderText('Enter state...')).toHaveValue('loaded');
  });
});
