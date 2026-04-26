# Phase 2 — Types + Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every `any` in the extension/webview boundary with a typed discriminated-union contract; add a CSP+nonce security boundary around the webview; introduce an `OutputChannel` logger; wrap the React tree in an `ErrorBoundary`; restructure the extension code so adding new commands is mechanical.

**Architecture:** A `shared/` directory becomes the single source of truth for `WebviewToExtensionMessage` and `ExtensionToWebviewMessage`. Both sides import via the `@shared/*` path alias. Extension-side dispatch goes through a pure router so it's trivially unit-testable. The webview consumes the API through two hooks (`useVscodeApi`, `useVscodeMessage`) that hide `acquireVsCodeApi` and the `window` `'message'` listener.

**Tech Stack:** TypeScript 5.9 (`paths` only — no project references), `@tomjs/vite-plugin-vscode` virtual `getWebviewHtml`, VSCode `OutputChannel` API, React 19 ErrorBoundary, vitest `expectTypeOf` for type-level assertions.

---

## Spec reference

Implements §16.2 (Phase 2 DoD), §5.2, §6, §7, §8, §9, §10 of `docs/superpowers/specs/2026-04-26-vscode-extension-template-hardening-design.md`.

## Deviation from spec

§4 decision 3 of the spec describes the shared layer as "TS project references". This plan downgrades to **path aliases only** (`paths.@shared/*` in `tsconfig.json`, consumed by `vite-tsconfig-paths` at runtime). Reason: a single-file `shared/` does not benefit from composite/declarationMap overhead; `tsc --noEmit` resolves the alias and type-checks across the boundary correctly without references; path aliases keep the build graph identical to current.

## File map

| Path | Action | Responsibility |
|---|---|---|
| `shared/messages.ts` | Create | Two discriminated unions + `MessageOf<T,M>` helper |
| `tsconfig.json` | Modify | Add `paths.@shared/*` |
| `extension/logger.ts` | Create | `logger.{debug,info,warn,error}` over `OutputChannel` |
| `extension/views/messages.ts` | Create | Pure routing table + `route(msg, ctx, logger)` |
| `extension/views/helper.ts` | Modify | CSP+nonce HTML; typed `onDidReceiveMessage` |
| `extension/views/panel.ts` | Modify | `retainContextWhenHidden`, `localResourceRoots`, register serializer |
| `extension/commands/showHelloWorld.ts` | Create | One command per file pattern |
| `extension/index.ts` | Modify | Activate calls `commands.register(ctx)` |
| `webview/hooks/useVscodeApi.ts` | Create | Typed `postMessage / getState / setState` |
| `webview/hooks/useVscodeMessage.ts` | Create | Typed subscription to extension messages |
| `webview/utils/vscode.ts` | Modify | Internal singleton; consumers use the hooks |
| `webview/components/ErrorBoundary.tsx` | Create | Render-error catch; reports via typed message |
| `webview/main.tsx` | Modify | Wrap root in ErrorBoundary; install `error`/`unhandledrejection` listeners; remove `!` |
| `webview/App.tsx` | Modify | Demonstrate full round-trip with `webview/ready` handshake + `state/restore` |
| `webview/__tests__/setup.ts` | Modify | Mock now needs to satisfy the typed contract |
| `webview/__tests__/App.test.tsx` | Modify | Update assertions to match the new App |
| `webview/__tests__/hooks/useVscodeApi.test.ts` | Create | Hook unit tests |
| `webview/__tests__/hooks/useVscodeMessage.test.ts` | Create | Hook unit tests |
| `webview/__tests__/components/ErrorBoundary.test.tsx` | Create | Boundary unit tests |
| `webview/__tests__/messages.types.test.ts` | Create | `expectTypeOf` type-level assertions |
| `index.html` | Modify | Title + nonce placeholder |

---

### Task 1: Define the shared message contract

**Files:** Create `shared/messages.ts`. Modify `tsconfig.json`.

- [ ] **Step 1: Create the contract module**

`shared/messages.ts` (full content):

```ts
export type WebviewToExtensionMessage =
  | { type: 'hello'; data: string }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string }
  | { type: 'webview/error'; error: { name: string; message: string; stack?: string } }
  | { type: 'webview/ready' };

export type ExtensionToWebviewMessage =
  | { type: 'hello'; data: string }
  | { type: 'theme/changed'; kind: 'light' | 'dark' | 'high-contrast' }
  | { type: 'state/restore'; payload: unknown };

export type MessageOf<T extends string, M extends { type: string }> = Extract<M, { type: T }>;
```

- [ ] **Step 2: Add `@shared/*` path alias to `tsconfig.json`**

Modify `tsconfig.json` `compilerOptions.paths`:

```jsonc
{
  "extends": "@tomjs/tsconfig/react.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./webview/*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "references": [{ "path": "./tsconfig.node.json" }],
  "include": ["webview", "shared"]
}
```

- [ ] **Step 3: Mirror in `tsconfig.node.json`**

`tsconfig.node.json` final content:

```jsonc
{
  "extends": "@tomjs/tsconfig/node.json",
  "compilerOptions": {
    "composite": true,
    "baseUrl": "..",
    "paths": {
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["extension", "vite.config.ts", "shared"]
}
```

- [ ] **Step 4: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: success. The new file has no consumers yet, so it should compile clean.

- [ ] **Step 5: Commit**

```bash
git add shared/messages.ts tsconfig.json tsconfig.node.json
git commit -m "feat(shared): introduce typed message contract"
```

---

### Task 2: Type-level tests for the contract

**Files:** Create `webview/__tests__/messages.types.test.ts`.

- [ ] **Step 1: Write failing type-level test**

`webview/__tests__/messages.types.test.ts`:

```ts
import { describe, expectTypeOf, it } from 'vitest';

import type {
  ExtensionToWebviewMessage,
  MessageOf,
  WebviewToExtensionMessage,
} from '@shared/messages';

describe('message contract', () => {
  it('extracts payload by literal type', () => {
    type Hello = MessageOf<'hello', WebviewToExtensionMessage>;
    expectTypeOf<Hello>().toEqualTypeOf<{ type: 'hello'; data: string }>();
  });

  it('webview/error has a typed error payload', () => {
    type WebviewError = MessageOf<'webview/error', WebviewToExtensionMessage>;
    expectTypeOf<WebviewError['error']>().toEqualTypeOf<{
      name: string;
      message: string;
      stack?: string;
    }>();
  });

  it('extension theme/changed enumerates kinds', () => {
    type Theme = MessageOf<'theme/changed', ExtensionToWebviewMessage>;
    expectTypeOf<Theme['kind']>().toEqualTypeOf<'light' | 'dark' | 'high-contrast'>();
  });

  it('rejects unknown message types at compile time', () => {
    // @ts-expect-error 'unknown' is not a valid type
    type _Bogus = MessageOf<'unknown', WebviewToExtensionMessage>;
  });
});
```

- [ ] **Step 2: Run**

```bash
pnpm test webview/__tests__/messages.types.test.ts
```

Expected: PASS (type-level tests run trivially; failure would manifest as compile error).

- [ ] **Step 3: Commit**

```bash
git add webview/__tests__/messages.types.test.ts
git commit -m "test(shared): type-level assertions for message contract"
```

---

### Task 3: Logger over OutputChannel

**Files:** Create `extension/logger.ts`.

- [ ] **Step 1: Create the logger**

`extension/logger.ts`:

```ts
import { window } from 'vscode';

import type { OutputChannel } from 'vscode';

let channel: OutputChannel | undefined;

function ensureChannel(): OutputChannel {
  if (!channel) {
    channel = window.createOutputChannel('VSCode Extension Quick Starter');
  }
  return channel;
}

function format(level: string, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level}] ${message}`;
}

export const logger = {
  debug(message: string): void {
    ensureChannel().appendLine(format('DEBUG', message));
  },
  info(message: string): void {
    ensureChannel().appendLine(format('INFO', message));
  },
  warn(message: string): void {
    ensureChannel().appendLine(format('WARN', message));
  },
  error(message: string, error?: unknown): void {
    const detail = error instanceof Error ? `\n${error.stack ?? error.message}` : '';
    ensureChannel().appendLine(format('ERROR', message + detail));
  },
  show(): void {
    ensureChannel().show();
  },
  dispose(): void {
    channel?.dispose();
    channel = undefined;
  },
};
```

- [ ] **Step 2: Build to confirm it compiles**

```bash
pnpm build
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add extension/logger.ts
git commit -m "feat(extension): OutputChannel logger singleton"
```

---

### Task 4: Pure message router

**Files:** Create `extension/views/messages.ts`.

- [ ] **Step 1: Write router**

`extension/views/messages.ts`:

```ts
import { window } from 'vscode';

import { logger } from '../logger';

import type { ExtensionContext } from 'vscode';
import type { WebviewToExtensionMessage } from '@shared/messages';

type Handler<T extends WebviewToExtensionMessage['type']> = (
  msg: Extract<WebviewToExtensionMessage, { type: T }>,
  ctx: ExtensionContext,
) => void | Promise<void>;

type HandlerMap = {
  [K in WebviewToExtensionMessage['type']]: Handler<K>;
};

const handlers: HandlerMap = {
  hello: (msg) => {
    window.showInformationMessage(msg.data);
  },
  log: (msg) => {
    logger[msg.level](`[webview] ${msg.message}`);
  },
  'webview/error': (msg) => {
    logger.error(`[webview render] ${msg.error.name}: ${msg.error.message}`, msg.error);
    window.showErrorMessage(`Webview error: ${msg.error.message}`);
  },
  'webview/ready': () => {
    logger.info('webview ready');
  },
};

export async function route(msg: WebviewToExtensionMessage, ctx: ExtensionContext): Promise<void> {
  const handler = handlers[msg.type] as Handler<typeof msg.type>;
  if (!handler) {
    logger.warn(`no handler registered for message type: ${msg.type}`);
    return;
  }
  try {
    await handler(msg as never, ctx);
  }
  catch (err) {
    logger.error(`handler for ${msg.type} threw`, err);
  }
}
```

- [ ] **Step 2: Build**

```bash
pnpm build
```

Expected: success. The router has no consumers yet but compiles cleanly.

- [ ] **Step 3: Commit**

```bash
git add extension/views/messages.ts
git commit -m "feat(extension): typed message router"
```

---

### Task 5: Refactor `helper.ts` for typed messages + nonce-based HTML

**Files:** Modify `extension/views/helper.ts`.

- [ ] **Step 1: Replace contents**

`extension/views/helper.ts` (full content):

```ts
import { randomBytes } from 'node:crypto';

import getWebviewHtml from 'virtual:vscode';

import { route } from './messages';

import type { Disposable, ExtensionContext, Webview } from 'vscode';
import type { WebviewToExtensionMessage } from '@shared/messages';

function generateNonce(): string {
  return randomBytes(16).toString('base64');
}

function buildCspMeta(webview: Webview, nonce: string, devServerUrl: string | undefined): string {
  const cspSource = webview.cspSource;
  const dev = !!devServerUrl;
  const csp = [
    `default-src 'none'`,
    `img-src ${cspSource} https: data:`,
    `style-src ${cspSource} 'unsafe-inline'`,
    dev
      ? `script-src 'nonce-${nonce}' ${devServerUrl} 'unsafe-eval'`
      : `script-src 'nonce-${nonce}'`,
    dev
      ? `connect-src ${cspSource} ${devServerUrl} ws: wss:`
      : `connect-src ${cspSource}`,
    `font-src ${cspSource} data:`,
  ].join('; ');
  return `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
}

function injectCspAndNonce(html: string, cspMeta: string, nonce: string): string {
  // 1. Insert CSP meta as the first child of <head>.
  let out = html.replace(/<head>/i, `<head>${cspMeta}`);
  // 2. Add nonce to every inline / external <script> tag that lacks one.
  out = out.replace(/<script(?![^>]*\snonce=)([^>]*)>/gi, `<script nonce="${nonce}"$1>`);
  return out;
}

export class WebviewHelper {
  static setupHtml(webview: Webview, context: ExtensionContext): string {
    const nonce = generateNonce();
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    const baseHtml = getWebviewHtml({ serverUrl: devServerUrl, webview, context });
    const cspMeta = buildCspMeta(webview, nonce, devServerUrl);
    return injectCspAndNonce(baseHtml, cspMeta, nonce);
  }

  static setupHooks(webview: Webview, context: ExtensionContext, disposables: Disposable[]): void {
    webview.onDidReceiveMessage(
      (msg: WebviewToExtensionMessage) => {
        void route(msg, context);
      },
      undefined,
      disposables,
    );
  }
}
```

- [ ] **Step 2: Build to confirm `getWebviewHtml` virtual still resolves**

```bash
pnpm build
```

Expected: success. If `virtual:vscode` complains about the new typed message import, it's unrelated — re-run.

- [ ] **Step 3: Commit**

```bash
git add extension/views/helper.ts
git commit -m "feat(extension): CSP+nonce HTML and typed message hook in helper"
```

---

### Task 6: Update `panel.ts` for retainContextWhenHidden + localResourceRoots

**Files:** Modify `extension/views/panel.ts`.

- [ ] **Step 1: Replace contents**

`extension/views/panel.ts` (full content):

```ts
import { Uri, ViewColumn, window } from 'vscode';

import { logger } from '../logger';

import { WebviewHelper } from './helper';

import type { Disposable, ExtensionContext, WebviewPanel } from 'vscode';
import type { ExtensionToWebviewMessage } from '@shared/messages';

const VIEW_TYPE = 'showHelloWorld';
const TITLE = 'Hello World';

export class MainPanel {
  static currentPanel: MainPanel | undefined;
  private readonly _panel: WebviewPanel;
  private readonly _context: ExtensionContext;
  private _disposables: Disposable[] = [];

  private constructor(panel: WebviewPanel, context: ExtensionContext) {
    this._panel = panel;
    this._context = context;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = WebviewHelper.setupHtml(this._panel.webview, context);
    WebviewHelper.setupHooks(this._panel.webview, context, this._disposables);
    // Lifecycle handshake — kept in panel.ts to avoid messages.ts ↔ panel.ts circular import.
    // The router (messages.ts) handles domain messages; the panel handles its own ready signal.
    this._panel.webview.onDidReceiveMessage(
      (msg) => {
        if ((msg as { type?: string }).type === 'webview/ready') {
          void this.post({ type: 'hello', data: 'Hello World!' });
        }
      },
      null,
      this._disposables,
    );
  }

  static render(context: ExtensionContext): MainPanel {
    if (MainPanel.currentPanel) {
      MainPanel.currentPanel._panel.reveal(ViewColumn.One);
      return MainPanel.currentPanel;
    }
    const dev = !!process.env.VITE_DEV_SERVER_URL;
    const distRoot = Uri.joinPath(context.extensionUri, 'dist');
    const panel = window.createWebviewPanel(VIEW_TYPE, TITLE, ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: dev ? undefined : [distRoot],
    });
    MainPanel.currentPanel = new MainPanel(panel, context);
    return MainPanel.currentPanel;
  }

  post(msg: ExtensionToWebviewMessage): Thenable<boolean> {
    return this._panel.webview.postMessage(msg);
  }

  dispose(): void {
    logger.info('disposing MainPanel');
    MainPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      this._disposables.pop()?.dispose();
    }
  }
}
```

Note: the previous `panel.ts` posted an initial `{ type: 'hello', data: 'Hello World!' }` synchronously from `render()`, which races against webview-side listener registration. The new flow is: webview signals `{ type: 'webview/ready' }` after React mounts (Task 13); panel.ts's dedicated handshake listener responds with the hello payload. The router in `messages.ts` does not handle `webview/ready`'s response — keeping the lifecycle messages here avoids a `messages.ts → panel.ts → helper.ts → messages.ts` import cycle.

- [ ] **Step 2: Build**

```bash
pnpm build
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add extension/views/panel.ts
git commit -m "feat(extension): retainContextWhenHidden + localResourceRoots; typed post"
```

---

### Task 7: Split commands into `extension/commands/`

**Files:** Create `extension/commands/showHelloWorld.ts`. Modify `extension/index.ts`.

- [ ] **Step 1: Create the command module**

`extension/commands/showHelloWorld.ts`:

```ts
import { commands } from 'vscode';

import { logger } from '../logger';
import { MainPanel } from '../views/panel';

import type { ExtensionContext } from 'vscode';

const COMMAND_ID = 'hello-world.showHelloWorld';

export function register(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand(COMMAND_ID, async () => {
      try {
        const panel = MainPanel.render(context);
        // Initial server→client message will be sent in response to webview/ready (see router/handler wiring later).
        void panel;
      }
      catch (err) {
        logger.error('failed to show hello-world panel', err);
        throw err;
      }
    }),
  );
}
```

- [ ] **Step 2: Replace `extension/index.ts`**

`extension/index.ts` (full content):

```ts
import { register as registerShowHelloWorld } from './commands/showHelloWorld';
import { logger } from './logger';

import type { ExtensionContext } from 'vscode';

export function activate(context: ExtensionContext): void {
  logger.info('activating extension');
  registerShowHelloWorld(context);
  context.subscriptions.push({ dispose: () => logger.dispose() });
}

export function deactivate(): void {
  logger.info('deactivating extension');
}
```

- [ ] **Step 3: Build**

```bash
pnpm build
```

Expected: success.

- [ ] **Step 4: Commit**

```bash
git add extension/commands/showHelloWorld.ts extension/index.ts
git commit -m "refactor(extension): split commands into per-file modules"
```

---

### Task 8: Verify handshake by re-reading `messages.ts`

**Files:** none (verification only). Task 4's `messages.ts` already logs `webview ready`; Task 6's `panel.ts` now owns the actual response. There is no router-side modification.

- [ ] **Step 1: Confirm no circular import**

```bash
pnpm build
```

Expected: success. If you see `MainPanel is undefined` warnings or `Cannot read properties of undefined`, the cycle has crept back in — verify `messages.ts` does not import `panel.ts`.

- [ ] **Step 2: Confirm `messages.ts` only logs the ready event**

```bash
grep -A2 "'webview/ready'" extension/views/messages.ts
```

Expected: only a `logger.info('webview ready')` body — no `MainPanel` import or `post` call.

- [ ] **Step 3: No commit** — verification only.

---

### Task 9: Webview hook — `useVscodeApi`

**Files:** Create `webview/hooks/useVscodeApi.ts` and `webview/__tests__/hooks/useVscodeApi.test.ts`.

- [ ] **Step 1: Write failing test**

`webview/__tests__/hooks/useVscodeApi.test.ts`:

```ts
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
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test webview/__tests__/hooks/useVscodeApi.test.ts
```

Expected: FAIL — module `@/hooks/useVscodeApi` not found.

- [ ] **Step 3: Implement**

`webview/hooks/useVscodeApi.ts`:

```ts
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
  if (cached) return cached as VscodeApi<S>;
  if (typeof acquireVsCodeApi === 'function') {
    cached = acquireVsCodeApi() as VscodeApi;
  }
  else {
    cached = {
      postMessage: (msg) => console.log('[mock vscode] postMessage', msg),
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
```

- [ ] **Step 4: Run, expect pass**

```bash
pnpm test webview/__tests__/hooks/useVscodeApi.test.ts
```

Expected: PASS, both cases.

- [ ] **Step 5: Commit**

```bash
git add webview/hooks/useVscodeApi.ts webview/__tests__/hooks/useVscodeApi.test.ts
git commit -m "feat(webview): typed useVscodeApi hook"
```

---

### Task 10: Webview hook — `useVscodeMessage`

**Files:** Create `webview/hooks/useVscodeMessage.ts` and `webview/__tests__/hooks/useVscodeMessage.test.ts`.

- [ ] **Step 1: Write failing test**

`webview/__tests__/hooks/useVscodeMessage.test.ts`:

```ts
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
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test webview/__tests__/hooks/useVscodeMessage.test.ts
```

Expected: FAIL — module `@/hooks/useVscodeMessage` not found.

- [ ] **Step 3: Implement**

`webview/hooks/useVscodeMessage.ts`:

```ts
import { useEffect } from 'react';

import type { ExtensionToWebviewMessage, MessageOf } from '@shared/messages';

export function useVscodeMessage<T extends ExtensionToWebviewMessage['type']>(
  type: T,
  handler: (msg: MessageOf<T, ExtensionToWebviewMessage>) => void,
): void {
  useEffect(() => {
    function listener(event: MessageEvent): void {
      const msg = event.data as ExtensionToWebviewMessage | undefined;
      if (msg && msg.type === type) {
        handler(msg as MessageOf<T, ExtensionToWebviewMessage>);
      }
    }
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [type, handler]);
}
```

- [ ] **Step 4: Run, expect pass**

```bash
pnpm test webview/__tests__/hooks/useVscodeMessage.test.ts
```

Expected: PASS, all three cases.

- [ ] **Step 5: Commit**

```bash
git add webview/hooks/useVscodeMessage.ts webview/__tests__/hooks/useVscodeMessage.test.ts
git commit -m "feat(webview): typed useVscodeMessage hook"
```

---

### Task 11: Update `webview/utils/vscode.ts` to delegate to the hook

**Files:** Modify `webview/utils/vscode.ts`. Modify `webview/__tests__/setup.ts`.

The legacy `vscode` export is now a thin wrapper kept for back-compat with components that haven't migrated to the hook yet. It uses the same singleton internally.

- [ ] **Step 1: Replace `webview/utils/vscode.ts`**

```ts
import { getVscodeApi } from '@/hooks/useVscodeApi';

import type { WebviewToExtensionMessage } from '@shared/messages';

const api = getVscodeApi();

export const vscode = {
  postMessage: (msg: WebviewToExtensionMessage) => api.postMessage(msg),
  getState: <S = unknown>() => api.getState() as S | undefined,
  setState: <S = unknown>(state: S) => api.setState(state as never) as S,
};
```

(Note: this file uses `getVscodeApi` — the plain function — not the `useVscodeApi` hook, because `react-hooks/rules-of-hooks` forbids hook calls outside React components. The hook variant is reserved for component bodies.)

- [ ] **Step 2: Update mock setup so the typed contract is honored**

`webview/__tests__/setup.ts` (full content):

```ts
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
```

- [ ] **Step 3: Build + test**

```bash
pnpm build
pnpm test
```

Expected: build green; existing `App.test.tsx` may begin to fail because we'll restructure App in Task 14 — that's fine as long as the *new* hook tests stay green. Confirm only that `webview/__tests__/hooks/*` and `webview/__tests__/messages.types.test.ts` still pass.

- [ ] **Step 4: Commit**

```bash
git add webview/utils/vscode.ts webview/__tests__/setup.ts
git commit -m "refactor(webview): vscode util delegates to useVscodeApi singleton"
```

---

### Task 12: ErrorBoundary component

**Files:** Create `webview/components/ErrorBoundary.tsx` and `webview/__tests__/components/ErrorBoundary.test.tsx`.

- [ ] **Step 1: Write failing test**

`webview/__tests__/components/ErrorBoundary.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { mockVsCodeApi } from '../setup';

function Boom(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('renders fallback UI on render error', () => {
    // Suppress React's expected error log
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
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test webview/__tests__/components/ErrorBoundary.test.tsx
```

Expected: FAIL — module `@/components/ErrorBoundary` not found.

- [ ] **Step 3: Implement**

`webview/components/ErrorBoundary.tsx`:

```tsx
import { Component } from 'react';

import { getVscodeApi } from '@/hooks/useVscodeApi';

import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    getVscodeApi().postMessage({
      type: 'webview/error',
      error: { name: error.name, message: error.message, stack: error.stack },
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            {this.state.error?.message ?? 'Unknown error'}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 4: Run, expect pass**

```bash
pnpm test webview/__tests__/components/ErrorBoundary.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add webview/components/ErrorBoundary.tsx webview/__tests__/components/ErrorBoundary.test.tsx
git commit -m "feat(webview): ErrorBoundary reports render errors to extension"
```

---

### Task 13: Wire `main.tsx` — boundary + global error listeners + non-null fix

**Files:** Modify `webview/main.tsx`. Modify `index.html`.

- [ ] **Step 1: Update `index.html`**

`index.html` (full content):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VSCode Extension Quick Starter</title>
  </head>

  <body>
    <div id="app"></div>
    <script type="module" src="/webview/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Replace `webview/main.tsx`**

```tsx
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import { ErrorBoundary } from './components/ErrorBoundary';
import { getVscodeApi } from './hooks/useVscodeApi';

import App from './App';

const root = document.getElementById('app');
if (!root) throw new Error('Root element #app not found');

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

// Signal readiness after the React tree mounts.
queueMicrotask(() => {
  api.postMessage({ type: 'webview/ready' });
});
```

- [ ] **Step 3: Build**

```bash
pnpm build
```

Expected: success.

- [ ] **Step 4: Commit**

```bash
git add webview/main.tsx index.html
git commit -m "feat(webview): ErrorBoundary + global error capture + ready handshake"
```

---

### Task 14: Refresh `App.tsx` to demonstrate the typed contract

**Files:** Modify `webview/App.tsx`.

The new App keeps the existing two-card layout but routes everything through the typed contract: send button uses `postMessage({type:'hello'})`; receives `{type:'hello'}` from extension on first ready and renders the latest payload; persistent state through `setState/getState`. No fancy new components — keep it minimal so the demo is readable.

- [ ] **Step 1: Replace `webview/App.tsx`**

```tsx
import { MessageSquare, Settings, Zap } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useVscodeApi } from '@/hooks/useVscodeApi';
import { useVscodeMessage } from '@/hooks/useVscodeMessage';

import './index.css';

interface PersistedState {
  state: string;
}

function App() {
  const api = useVscodeApi<PersistedState>();
  const [message, setMessage] = useState('');
  const [state, setState] = useState('');
  const [lastFromExtension, setLastFromExtension] = useState('(awaiting ready handshake)');

  useVscodeMessage('hello', (msg) => {
    setLastFromExtension(msg.data);
  });

  const onSetState = () => {
    api.setState({ state });
  };
  const onGetState = () => {
    setState(api.getState()?.state ?? '');
  };
  const onPostMessage = () => {
    api.postMessage({
      type: 'hello',
      data: message || 'Empty',
    });
  };

  return (
    <main className="flex min-h-screen flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Zap className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">VSCode Extension Starter</h1>
          <p className="text-sm text-muted-foreground">React + shadcn/ui + Tailwind CSS</p>
        </div>
        <Badge className="ml-auto">v0.0.1</Badge>
      </div>

      <Separator />

      <p className="text-sm text-muted-foreground">
        Last from extension:
        {' '}
        <span data-testid="extension-payload" className="font-mono">{lastFromExtension}</span>
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              Message
            </CardTitle>
            <CardDescription>Send a typed message to the VSCode extension</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message content</Label>
              <Input
                id="message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Enter message..."
              />
            </div>
            {message && (
              <p className="text-sm text-muted-foreground">
                Preview:
                {' '}
                {message}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={onPostMessage} className="w-full">
              <MessageSquare className="mr-2 size-4" />
              Send Message
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-5" />
              State Management
            </CardTitle>
            <CardDescription>Persist state across webview sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="state">State value</Label>
              <Input
                id="state"
                value={state}
                onChange={e => setState(e.target.value)}
                placeholder="Enter state..."
              />
            </div>
            {state && (
              <p className="text-sm text-muted-foreground">
                Current:
                {' '}
                {state}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button onClick={onSetState} className="flex-1">
              Save State
            </Button>
            <Button variant="secondary" onClick={onGetState} className="flex-1">
              Load State
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

export default App;
```

- [ ] **Step 2: Build**

```bash
pnpm build
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add webview/App.tsx
git commit -m "feat(webview): App uses typed hooks + displays handshake payload"
```

---

### Task 15: Update `App.test.tsx` for the refreshed contract

**Files:** Modify `webview/__tests__/App.test.tsx`.

- [ ] **Step 1: Replace contents**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

import { mockVsCodeApi } from './setup';

function dispatchMessage(data: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data }));
}

describe('App', () => {
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
```

- [ ] **Step 2: Run tests**

```bash
pnpm test
```

Expected: all green (12 → ~14 cases including the new ones from Task 9/10/12).

- [ ] **Step 3: Commit**

```bash
git add webview/__tests__/App.test.tsx
git commit -m "test(webview): cover handshake, typed messages, structured state"
```

---

### Task 16: Replace `console.log` in extension — final sweep

**Files:** Search and replace any remaining `console.log` / `console.error` in `extension/`.

- [ ] **Step 1: Search**

```bash
grep -rn "console\." extension/
```

Expected: empty output (Tasks 3–8 already wrote logger calls). If any hits remain, replace `console.log` with `logger.info`, `console.error` with `logger.error`.

- [ ] **Step 2: Build + commit if anything changed**

```bash
pnpm build
git status --short
# if dirty:
git add extension/
git commit -m "chore(extension): final console→logger sweep"
```

---

### Task 17: Manual security/integration smoke

**Files:** none.

- [ ] **Step 1: Dev mode**

```bash
pnpm dev
```

Press F5 in VSCode to launch the Extension Development Host with the dev profile. Run `Hello World: Show` from the command palette. Verify:
- Webview opens
- "Last from extension: Hello World!" appears (handshake worked)
- Sending a message shows a VSCode information notification
- Devtools console (Webview Developer Tools) shows **no** CSP violations
- The webview HTML's `<head>` contains a `<meta http-equiv="Content-Security-Policy">` tag

Stop dev with Ctrl-C.

- [ ] **Step 2: Production mode**

```bash
pnpm build:prod
```

Then in VSCode launch config, choose "Run Extension (Production)" and re-run the command. Verify the same behavior — most importantly **no `unsafe-eval` in the CSP** (inspect the meta tag in webview devtools). Verify the webview only loads scripts with the matching `nonce`.

- [ ] **Step 3: Package + install in clean profile**

```bash
pnpm package
```

Expected: a `.vsix` file produced.

```bash
code --user-data-dir /tmp/vsix-test --install-extension *.vsix
code --user-data-dir /tmp/vsix-test
```

In the fresh profile, run `Hello World: Show`. Verify the same behavior. Close the test profile when done.

- [ ] **Step 4: No commit** — verification only.

---

### Task 18: Phase 2 wrap-up

- [ ] **Step 1: Full validation pipeline**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

All green.

- [ ] **Step 2: Tag**

```bash
git tag phase-2-complete
```

---

## Phase 2 done

Outputs:
- Single source of truth for messages in `shared/messages.ts`
- Zero `any` across the boundary
- CSP+nonce (dev-mode permissive, prod-mode strict)
- `localResourceRoots` constrained to `dist/`
- `retainContextWhenHidden` on
- `OutputChannel` logger; no `console.*` in extension code
- Webview wrapped in `ErrorBoundary` + global error capture
- `webview/ready` handshake gates first server→client message
- Typed hooks (`useVscodeApi`, `useVscodeMessage`)
- Typed unit tests (hooks + boundary + type-level + App)

Next: **Phase 3 — Tests + CI** (`docs/superpowers/plans/2026-04-26-phase-3-tests-and-ci.md`).
