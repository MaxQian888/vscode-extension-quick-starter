export type WebviewToExtensionMessage
  = | { type: 'hello'; data: string }
    | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string }
    | { type: 'webview/error'; error: { name: string; message: string; stack?: string } }
    | { type: 'webview/ready' };

export type ExtensionToWebviewMessage
  = | { type: 'hello'; data: string }
    | { type: 'theme/changed'; kind: 'light' | 'dark' | 'high-contrast' }
    | { type: 'state/restore'; payload: unknown };

export type MessageOf<T extends string, M extends { type: string }> = Extract<M, { type: T }>;
