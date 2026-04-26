import type { WebviewToExtensionMessage } from '@shared/messages';

interface VscodeApi<S = unknown> {
  postMessage: (msg: WebviewToExtensionMessage) => void;
  getState: () => S | undefined;
  setState: (state: S) => S;
}

let cached: VscodeApi | undefined;

/**
 * Returns the typed singleton VSCode webview API. Safe to call from anywhere
 * (module top-level, class components, plain functions). The hook variant
 * `useVscodeApi` exists only for ergonomic uniformity inside React components.
 */
export function getVscodeApi<S = unknown>(): VscodeApi<S> {
  if (cached)
    return cached as VscodeApi<S>;
  if (typeof acquireVsCodeApi === 'function') {
    cached = acquireVsCodeApi() as VscodeApi;
  }
  else {
    cached = {
      postMessage: msg => console.log('[mock vscode] postMessage', msg),
      getState: () => undefined,
      setState: (state) => {
        console.log('[mock vscode] setState', state);
        return state;
      },
    };
  }
  return cached as VscodeApi<S>;
}

/**
 * Hook variant for use inside function components. Returns the same singleton
 * as `getVscodeApi`; identical referential identity across renders.
 */
export function useVscodeApi<S = unknown>(): VscodeApi<S> {
  return getVscodeApi<S>();
}
