import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getVscodeApi } from './hooks/useVscodeApi';

const root = document.getElementById('app');
if (!root)
  throw new Error('Root element #app not found');

const api = getVscodeApi();

window.addEventListener('error', (event) => {
  api.postMessage({
    type: 'webview/error',
    error: {
      name: event.error?.name ?? 'Error',
      message: event.message,
      stack: event.error?.stack,
    },
  });
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason as { name?: string; message?: string; stack?: string } | string | undefined;
  const isErr = typeof reason === 'object' && reason !== null;
  api.postMessage({
    type: 'webview/error',
    error: {
      name: isErr ? (reason.name ?? 'UnhandledRejection') : 'UnhandledRejection',
      message: isErr ? (reason.message ?? String(reason)) : String(reason ?? ''),
      stack: isErr ? reason.stack : undefined,
    },
  });
});

ReactDOM.createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Note: the `webview/ready` handshake is dispatched from inside <App/>'s
// useEffect, AFTER `useVscodeMessage('hello', ...)` has registered its
// window listener — otherwise the extension's hello reply could arrive
// before the listener exists.
