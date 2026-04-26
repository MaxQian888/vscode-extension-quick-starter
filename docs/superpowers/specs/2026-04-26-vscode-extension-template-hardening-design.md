# VSCode Extension Quick Starter — Template Hardening Spec

- **Date**: 2026-04-26
- **Author**: Max Qian
- **Status**: Draft → Awaiting plan
- **Scope**: One spec, four phases, executed sequentially with phase-internal parallelism allowed.

---

## 1. Goal

Bring the existing template up to a single, coherent standard that simultaneously:

- **A. Public starter**: anyone can `degit` it, run a one-shot init script, and have a clean, minimal foundation.
- **B. Marketplace-ready**: every metadata field, security control, and release path expected of a publishable extension is present.
- **C. Reference implementation**: the architecture itself demonstrates type-safe extension↔webview messaging, CSP, error handling, and a real testing pyramid.

A+B+C share most of the work; the few divergent decisions (e.g., keeping `private: true` as a publish-safety brake) are called out explicitly.

## 2. Non-goals

- No monorepo / pnpm workspace.
- No Prettier (ESLint stylistic stays the single formatter).
- No runtime message validation library (Zod, valibot). Compile-time discriminated unions are sufficient at this stage.
- No multi-panel orchestration framework. `MainPanel` stays a single-panel teaching example.
- No internationalization (the README stays English).
- No telemetry SDK.
- No change to the CommonJS extension loader (VSCode constraint).

## 3. Current state (audited 2026-04-26)

Strengths already in place: Vite 7 / React 19 / TS 5.9 / Tailwind v4 / shadcn `new-york`; clear `extension/` + `webview/` split via `@tomjs/vite-plugin-vscode`; `@antfu/eslint-config` + `@tomjs/*` presets; commitlint + simple-git-hooks + lint-staged; Vitest + `@vscode/test-electron` + Playwright; CI with five jobs (lint/test/build/extension-test/e2e-test); release on tag; three `.vscode/launch.json` configurations.

Audited issues, grouped:

1. **Marketplace readiness** — `publisher: "your-publisher"` placeholder; missing `categories`, `keywords`, `icon`, `galleryBanner`, `extensionKind`, `capabilities`, `files`; `private: true` ambiguous.
2. **Template usability** — hard-coded `AstroAir/...` URLs in README/package.json/CHANGELOG/issue templates; CHANGELOG dated 2024-01-01; CONTRIBUTING says Node ≥18 while reality is ≥20; no init script.
3. **Extension-side security** — webview without CSP, without nonce, without `localResourceRoots`, without `retainContextWhenHidden`.
4. **Type safety** — `helper.ts` uses `(message: any)`; `vscode.ts` uses `acquireVsCodeApi<any>()`; no shared message contract.
5. **Test quality** — `extension.test.ts` contains tautology cases (`assert.ok(true, ...)`); E2E only exercises the dev server, never the packaged dist; no coverage thresholds.
6. **CI/CD gaps** — single OS, no Node matrix, no `concurrency` cancel-in-progress, no minimum `permissions:` block, no `.vsix` artifact upload, no Playwright cache, no Dependabot.
7. **Engineering governance** — no `SECURITY.md`, no `CODEOWNERS`, manual versioning.
8. **Documentation drift** — README "Available Components" lists 7 while 50 files were added uncommitted; no "Publishing to Marketplace" guide; no "Adding new commands" walkthrough; no architecture doc; no demo screenshot.
9. **Working tree pollution** — `tsconfig.node.tsbuildinfo` (56 KB) tracked; 44 unused shadcn components untracked; `.editorconfig` header still has the 🎨 emoji that the project just spent a commit removing elsewhere.
10. **Webview ergonomics** — no `ErrorBoundary`; `document.getElementById('app')!` non-null assertion; `index.html` `<title>` is still `Vite + React + TS`; no `useVscodeMessage` hook example.
11. **Config duplication** — `vite.config.ts` and `vitest.config.ts` repeat the `@/` alias.
12. **Single sample command** — only one trivial `Hello World: Show`; no demonstration of how to organize multiple commands or share state via `globalState`/`workspaceState`.
13. **Logging** — bare `console.log` in extension code; no `OutputChannel`.
14. **Dependency bloat** — recently added `recharts`, `embla-carousel-react`, `vaul`, `react-day-picker`, `react-hook-form`, `next-themes`, `cmdk`, `input-otp`, `@base-ui/react`, `radix-ui`, `zod`, `@hookform/resolvers` with zero usage in the webview.

## 4. Decisions taken during brainstorming

1. **shadcn / dependency strategy = "B subset"**: keep 16 commonly-used components (`alert`, `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `select`, `separator`, `skeleton`, `sonner`, `switch`, `tabs`, `textarea`, `tooltip`); delete the other ~34 plus their heavy deps. *Expected* removals (final list determined empirically by Phase 1 build success): `recharts`, `embla-carousel-react`, `vaul`, `react-day-picker`, `cmdk`, `input-otp`, `next-themes`, `react-hook-form`, `@hookform/resolvers`, `@base-ui/react`, `zod`. The fate of the `radix-ui` 1.x meta package depends on whether retained components import via it; if they import individual `@radix-ui/react-*` packages, the meta is removed and the necessary individual packages are added. A refreshed `App.tsx` demonstrates real usage of a representative subset (button, card, input, label, badge, separator, plus at least one of {dialog, dropdown-menu, sonner} to exercise the typed message contract end-to-end).
2. **Roll-out shape = phased, dependency-driven** (4 phases below). One spec, one set of plans split per phase.
3. **Shared layer = TS project references, not workspace** (`shared/messages.ts` referenced by both sides).
4. **CSP = nonce, not hash**, with two profiles: dev (permissive — `unsafe-eval`, dev-server origin) and prod (strict, nonce-only).
5. **Logger = `OutputChannel` singleton, no Logger interface abstraction** (YAGNI).
6. **Discriminated-union message contract**, not request/response RPC. `webview/ready` handshake to avoid early-message races.
7. **CI matrix**: Node 20+22 on Ubuntu for tests; Ubuntu+Windows+macOS for build only; extension-test/e2e-test stay Ubuntu.
8. **Versioning** = changesets-driven release.yml; manual `pnpm package` retained as escape hatch.
9. **Hooks**: `pre-commit` = `lint-staged` only; `pre-push` = `typecheck && test`.
10. **Init script**: zero extra deps (`node:readline/promises`); supports interactive, non-interactive, dry-run; self-deletes after first successful run; idempotency check via `.template-init.json` breadcrumb.
11. **`private: true` retained as publish-safety brake**, with README "Publishing" section calling it out explicitly.

## 5. Target architecture

### 5.1 Directory layout (post-refactor)

```text
vscode-extension-quick-starter/
├── extension/
│   ├── index.ts                     # activate/deactivate, command registration, panel serializer
│   ├── env.d.ts
│   ├── logger.ts                    # OutputChannel singleton (info/warn/error/debug)
│   ├── views/
│   │   ├── panel.ts                 # MainPanel: typed handler, retainContext, restore
│   │   ├── helper.ts                # CSP + nonce + localResourceRoots, typed onDidReceiveMessage
│   │   └── messages.ts              # MessageType → handler routing table (pure, testable)
│   └── commands/
│       └── showHelloWorld.ts        # split out so adding commands is a clear pattern
│
├── webview/
│   ├── App.tsx                      # demo: bidirectional messaging + setState/getState round-trip
│   ├── main.tsx                     # ErrorBoundary-wrapped root, no `!` assertions
│   ├── index.css
│   ├── components/
│   │   ├── ui/                      # ~15 shadcn components only
│   │   └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── useVscodeApi.ts          # typed wrapper around acquireVsCodeApi
│   │   └── useVscodeMessage.ts      # subscribe to typed extension→webview messages
│   ├── lib/utils.ts
│   └── utils/vscode.ts              # generic over the contract
│
├── shared/
│   ├── messages.ts                  # WebviewToExtensionMessage, ExtensionToWebviewMessage
│   └── tsconfig.json                # composite=true; referenced by both sides
│
├── __tests__/extension/
│   └── suite/extension.test.ts      # real assertions (no `assert.ok(true)`)
│
├── e2e/
│   └── webview.spec.ts              # exercised under both dev and prod-preview projects
│
├── docs/
│   ├── architecture.md              # mermaid diagrams: modules, message timing, CSP
│   ├── publishing.md                # publisher → VSCE_PAT → first publish → changesets
│   ├── adding-commands.md           # step-by-step walkthrough
│   └── superpowers/specs/           # this file lives here
│
├── scripts/
│   └── init-template.mjs            # interactive replace + self-delete + dry-run
│
├── assets/
│   └── icon.png                     # 128×128 placeholder
│
├── .github/
│   ├── workflows/ci.yml             # permissions / concurrency / matrix / artifact
│   ├── workflows/release.yml        # changesets-driven; gracefully no-op without VSCE_PAT
│   ├── dependabot.yml
│   ├── CODEOWNERS
│   ├── ISSUE_TEMPLATE/*.yml
│   └── PULL_REQUEST_TEMPLATE.md
│
├── SECURITY.md
├── .changeset/                      # changesets state
├── tsconfig.json                    # references shared/
├── tsconfig.node.json               # references shared/
├── tsconfig.shared.json
├── vite.config.ts                   # alias source single-sourced via tsconfig paths
├── vitest.config.ts                 # coverage thresholds; alias from same source
├── playwright.config.ts             # two projects: dev + prod-preview
├── package.json                     # marketplace metadata, slimmed deps, init:template script
├── README.md                        # rewritten Features, real component list, Publishing/Adding sections
├── CHANGELOG.md                     # current Unreleased lists the hardening; old 2024-01-01 line dropped
├── CONTRIBUTING.md                  # Node ≥20, plus messaging contract notes
└── LICENSE
```

### 5.2 Module boundaries

| Unit | Responsibility | Public surface | Depends on |
|---|---|---|---|
| `shared/messages.ts` | Source of truth for both message directions | `WebviewToExtensionMessage`, `ExtensionToWebviewMessage`, `MessageOf<T,M>` helper | nothing |
| `extension/logger.ts` | Console replacement bound to a VSCode `OutputChannel` | `logger.info / warn / error / debug` | `vscode` |
| `extension/views/messages.ts` | Pure router from `MessageType` to handler | `route(msg, ctx)` | `shared/messages`, `logger` |
| `extension/views/helper.ts` | HTML generation with CSP + nonce; subscribe `onDidReceiveMessage` | `setupHtml`, `setupHooks` | `vscode`, `messages.ts`, `virtual:vscode` |
| `extension/views/panel.ts` | Panel lifecycle (singleton), serializer for restore | `MainPanel.render(ctx)` | `helper.ts` |
| `extension/commands/*.ts` | One command per file | `register(ctx)` | `panel.ts`, `logger.ts` |
| `webview/hooks/useVscodeApi.ts` | Typed singleton wrapper for `acquireVsCodeApi` | `useVscodeApi()` returns `{ postMessage, getState, setState }` | `shared/messages`, `acquireVsCodeApi` (or mock) |
| `webview/hooks/useVscodeMessage.ts` | Subscribe to extension→webview messages by `type` | `useVscodeMessage('hello', handler)` | `shared/messages`, `window.addEventListener('message')` |
| `webview/components/ErrorBoundary.tsx` | Catch render errors, surface fallback UI, post `webview/error` | `<ErrorBoundary>` | `useVscodeApi` |
| `scripts/init-template.mjs` | One-shot template adoption | CLI `pnpm init:template [flags]` | `node:readline/promises`, `node:fs/promises` (no extras) |

## 6. Message contract

```ts
// shared/messages.ts
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

Adding a new message variant is the only place a developer touches; both sides become red in TS until handlers/usages are updated.

## 7. Data flow

```
extension/commands/showHelloWorld.ts
  └─ MainPanel.render(ctx)
       └─ panel.ts: createWebviewPanel({ enableScripts, localResourceRoots, retainContextWhenHidden })
            ├─ webview.html = helper.setupHtml(webview, ctx, nonce)   # CSP <meta> + nonce on <script>
            └─ helper.setupHooks(webview, router)
                  └─ webview.onDidReceiveMessage(msg)
                       └─ messages.route(msg)  # typed switch over msg.type

webview/main.tsx
  └─ <ErrorBoundary onError={postWebviewError}>
       └─ <App/>
            ├─ useVscodeApi() → postMessage<WebviewToExtensionMessage>
            └─ useVscodeMessage('hello', payload => ...)
```

`webview/ready` handshake: webview posts `{ type: 'webview/ready' }` immediately on mount; extension defers any first-payload `postMessage` until that signal arrives. Eliminates the existing race where `MainPanel.render` posts `{ type: 'hello' }` before the webview has installed listeners.

## 8. Security model

`helper.ts` builds two CSP profiles, picked at runtime by presence of `process.env.VITE_DEV_SERVER_URL`:

```ts
const cspSource = webview.cspSource;
const dev = !!process.env.VITE_DEV_SERVER_URL;
const devUrl = process.env.VITE_DEV_SERVER_URL ?? '';

const csp = [
  `default-src 'none'`,
  `img-src ${cspSource} https: data:`,
  `style-src ${cspSource} 'unsafe-inline'`,                       // Tailwind v4 inline styles
  dev
    ? `script-src 'nonce-${nonce}' ${devUrl} 'unsafe-eval'`       // Vite HMR
    : `script-src 'nonce-${nonce}'`,
  dev
    ? `connect-src ${cspSource} ${devUrl} ws: wss:`
    : `connect-src ${cspSource}`,
  `font-src ${cspSource} data:`,
].join('; ');
```

`<meta http-equiv="Content-Security-Policy" content="...">` is injected into `<head>`; every `<script>` carries the same `nonce`. If `@tomjs/vite-plugin-vscode`'s virtual `getWebviewHtml` does not expose a nonce hook, fall back to a deterministic `html.replace(/<script /g, `<script nonce="${nonce}" `)` patch in `helper.ts`.

`createWebviewPanel` is configured with:

```ts
{
  enableScripts: true,
  retainContextWhenHidden: true,
  localResourceRoots: dev
    ? [Uri.parse(process.env.VITE_DEV_SERVER_URL!)]
    : [Uri.joinPath(ctx.extensionUri, 'dist')],
}
```

`enableScripts: true` is mandatory for a React webview but is now scoped by CSP nonce.

## 9. Error handling

Three layers, all routed back through the same OutputChannel logger:

1. **Webview render errors** — `ErrorBoundary` catches → posts `{ type: 'webview/error', error: { name, message, stack } }` → extension `OutputChannel.appendLine` + `window.showErrorMessage`.
2. **Webview runtime errors** — `main.tsx` registers `window.addEventListener('error')` and `'unhandledrejection'`, posting the same shape.
3. **Extension command errors** — every `registerCommand` callback wraps its body in `try/catch`, logging via `logger.error` and surfacing `window.showErrorMessage`. Never silently swallow.

## 10. State persistence demo

`App.tsx` will demonstrate two persistence layers:

- **Per-session (webview-only)** — `useVscodeApi().setState/getState`, saved/loaded by buttons (kept from current example).
- **Cross-session (extension-owned)** — extension stores in `context.workspaceState` on `webview/ready`-time message; pushes back via `state/restore` for hydration. Round-trip visible: type → close panel → reopen → value reappears.

## 11. Testing strategy

| Layer | Tool | Coverage focus | Key assertions added |
|---|---|---|---|
| Unit (webview) | Vitest + RTL | Components, hooks | `useVscodeApi.test.ts`, `useVscodeMessage.test.ts`, `ErrorBoundary.test.tsx`; type-level tests via `expectTypeOf` for the message contract |
| Integration (extension host) | Mocha + `@vscode/test-electron` | Commands, activation, message routing | (a) extension found by ID; (b) `getCommands()` includes `hello-world.showHelloWorld`; (c) executing the command produces a non-undefined `MainPanel.currentPanel`; (d) mock-emitted `hello` message yields a logger entry / info message |
| E2E (browser) | Playwright with two projects | Webview UI under both dev server and built dist | `dev` project keeps the current behavior; `prod-preview` project runs `vite preview --port 4173` against `dist/` and re-runs the same suite, verifying CSP/nonce/asset paths in the production bundle |

Coverage thresholds (warning, not failure) for `webview/lib`, `webview/utils`, `webview/hooks`: statements 80 / branches 75 / functions 80 / lines 80. `App.tsx` and `main.tsx` are excluded — UI integration is covered by E2E.

## 12. CI / CD

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint: { runs-on: ubuntu-latest, ... }
  typecheck: { runs-on: ubuntu-latest, ... }     # split out so vite-build doesn't hide TS errors
  test:
    strategy: { matrix: { node: [20, 22] } }
    steps: [..., upload codecov (fail_ci_if_error: false)]
  build:
    strategy: { matrix: { os: [ubuntu-latest, windows-latest, macos-latest] } }
    continue-on-error: ${{ matrix.os != 'ubuntu-latest' }}
    steps: [..., pnpm package, upload .vsix artifact (retention 7d)]
  extension-test: { runs-on: ubuntu-latest, xvfb-run, ... }
  e2e-test:
    steps:
      - cache: ~/.cache/ms-playwright (key: lockfile hash)
      - run: pnpm test:e2e
      - if: always(): upload trace + screenshots
```

Release: `release.yml` is now changesets-driven. On push to `main`, it opens a `Version Packages` PR. Merging that PR triggers tag + publish. The `vsce publish` step is gated on the `VSCE_PAT` secret — when absent, the workflow still produces a GitHub Release and `.vsix` artifact, so cloned templates work out of the box.

`.github/dependabot.yml` schedules weekly Monday updates (Asia/Shanghai 09:00) for `npm` and `github-actions`. PRs are grouped: dev tooling (eslint/typescript/vite/vitest/playwright/vitest); React (react/react-dom); shadcn-related (@radix-ui/*).

`simple-git-hooks.mjs`:

```js
{
  'pre-commit': 'pnpm lint-staged',
  'pre-push': 'pnpm typecheck && pnpm test',
  'commit-msg': 'pnpm commitlint --edit "$1"',
}
```

## 13. Marketplace metadata (`package.json` additions)

```jsonc
{
  "publisher": "your-publisher",          // replaced by init script
  "displayName": "VSCode Extension Quick Starter",
  "icon": "assets/icon.png",
  "categories": ["Other"],
  "keywords": ["react", "shadcn", "tailwind", "webview", "starter", "template"],
  "galleryBanner": { "color": "#1e1e1e", "theme": "dark" },
  "qna": "marketplace",
  "extensionKind": ["ui", "workspace"],
  "capabilities": {
    "untrustedWorkspaces": { "supported": "limited", "description": "Webview reads no workspace files." },
    "virtualWorkspaces": true
  },
  "files": ["dist", "assets/icon.png", "LICENSE", "README.md", "CHANGELOG.md"],
  "private": true                          // retained as publish-safety brake; README documents
}
```

## 14. Documentation set

| File | Purpose | Approx length |
|---|---|---|
| `README.md` | Rewritten Features, accurate component list, inline mini-sections for Publishing and Adding-commands plus links to `docs/` | ~250 lines |
| `docs/architecture.md` | Mermaid diagrams: module dependencies, message-timing handshake, CSP enforcement points | ~150 lines |
| `docs/publishing.md` | Apply for publisher → configure `VSCE_PAT` → first publish → changesets cycle | ~120 lines |
| `docs/adding-commands.md` | Walkthrough: new file in `extension/commands/`, register in `package.json contributes.commands`, push in `index.ts`, optional webview handler | ~80 lines |
| `CONTRIBUTING.md` | Node ≥20, message-contract notes, testing tips | minor edits |
| `CHANGELOG.md` | Reset Unreleased section to enumerate this hardening; remove stale `0.0.1 — 2024-01-01` block (misleading to clones) | rewritten |
| `SECURITY.md` | Vulnerability reporting (GitHub Security Advisory), CSP/audit policy | ~50 lines |
| `.github/CODEOWNERS` | `* @<owner>` (replaced by init script) | 1 line |

## 15. Init script (`scripts/init-template.mjs`)

CLI flow:

```
? Publisher ID (Marketplace publisher name): _______
? Extension name (kebab-case, used in command IDs): _______
? Display name (shown in Marketplace): _______
? Description: _______
? Repository URL: _______
? Author name: _______
? Replace command 'hello-world.showHelloWorld' with: _______ (default: <name>.show)

✔ package.json (publisher / name / displayName / description / repository / homepage / bugs / author)
✔ extension/index.ts + extension/commands/showHelloWorld.ts (command IDs)
✔ package.json contributes.commands
✔ README.md (title, badges, all repo URLs)
✔ CHANGELOG.md (header)
✔ .github/ISSUE_TEMPLATE/*.yml (extension-version field default)
✔ __tests__/extension/suite/extension.test.ts (extension ID + command ID)
✔ Removed scripts/init-template.mjs and "init:template" script
✔ Removed self-references to AstroAir/vscode-extension-quick-starter
```

Implementation notes:

- Pure Node, no extra deps: `node:readline/promises`, `node:fs/promises`, `node:crypto`.
- Modes: interactive (default) / non-interactive (`--publisher=…` etc., requires `--yes`) / `--dry-run` (prints the diff list without writing).
- Atomic writes (`.tmp` then rename).
- Idempotency: writes `.template-init.json` breadcrumb. Re-running prompts before overwriting.
- Self-delete: removes itself plus its package.json script entry as the final step of a successful run.

## 16. Phase plan

```
Phase 1 ─────────► Phase 2 ─────────► Phase 3 ─────► Phase 4
(cleanup)          (types + security) (tests + CI)   (template + docs)
```

Phase 4's documentation skeleton may begin in parallel with Phase 2, but final detail-writing depends on Phase 2's API shapes being settled.

### 16.1 Phase 1 — Cleanup. Definition of done

- [ ] `webview/components/ui/` retains exactly the 16 files: `alert.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `separator.tsx`, `skeleton.tsx`, `sonner.tsx`, `switch.tsx`, `tabs.tsx`, `textarea.tsx`, `tooltip.tsx`.
- [ ] Process: each candidate dep is removed only after `pnpm install && pnpm build && pnpm test && pnpm dev` (manual webview load) all pass. Do not batch dep removals visually.
- [ ] `package.json` dependencies trimmed to only what the 16 retained components plus the refreshed `App.tsx` transitively need (see §4 decision 1).
- [ ] `tsconfig.node.tsbuildinfo` removed from the working tree and added to `.gitignore`.
- [ ] `.editorconfig` header emoji removed.
- [ ] `vite.config.ts` and `vitest.config.ts` consume the same alias source (via `vite-tsconfig-paths` or a single shared helper module).
- [ ] `pnpm install && pnpm build && pnpm test` green.
- [ ] `git diff --stat` shows net negative line count.

### 16.2 Phase 2 — Types + Security. Definition of done

- [ ] `shared/messages.ts` and `shared/tsconfig.json` exist; both side tsconfigs use `references` to point at `shared`.
- [ ] `extension/views/helper.ts` contains zero `any`; webview `vscode.ts` typed by `WebviewToExtensionMessage`.
- [ ] `extension/logger.ts` provides the OutputChannel singleton; all `console.log`/`console.error` in extension code are replaced.
- [ ] CSP `<meta>` is emitted; `<script nonce="...">` is in effect; production build has no `unsafe-eval`.
- [ ] `localResourceRoots` is set to `dist/` (prod) / dev URL (dev).
- [ ] `webview/components/ErrorBoundary.tsx` wraps `<App/>` in `main.tsx`; non-null assertion gone.
- [ ] `webview/ready` handshake gates first server→client message; demo round-trip works in `App.tsx`.
- [ ] `pnpm typecheck` green; `pnpm test` green.
- [ ] Manual check: F5 dev mode loads, message round-trip works, devtools shows no CSP violations; `pnpm package` produces a `.vsix` that installs cleanly and works in a fresh VSCode profile.

### 16.3 Phase 3 — Tests + CI. Definition of done

- [ ] `__tests__/extension/suite/extension.test.ts` no longer contains any `assert.ok(true, '...')`; every `it(...)` has a meaningful assertion.
- [ ] `webview/__tests__/hooks/useVscodeApi.test.ts`, `useVscodeMessage.test.ts`, `ErrorBoundary.test.tsx` added.
- [ ] `vitest.config.ts` has coverage thresholds wired (warn, not fail).
- [ ] `playwright.config.ts` has two projects (`dev`, `prod-preview`) sharing the same `webview.spec.ts`.
- [ ] `.github/workflows/ci.yml` includes `permissions`, `concurrency`, the dedicated `typecheck` job, the Node 20+22 matrix, the OS-matrix `build` (Ubuntu hard, others soft), Playwright cache, `.vsix` artifact upload.
- [ ] `.github/dependabot.yml` committed.
- [ ] `simple-git-hooks.mjs` split into `pre-commit` / `pre-push`.
- [ ] A full CI run on a fork is green.

### 16.4 Phase 4 — Template + Marketplace + Docs + Release. Definition of done

- [ ] `scripts/init-template.mjs` implemented; `pnpm init:template --dry-run` prints a plausible diff; an interactive run on a fresh clone replaces every hard-coded value.
- [ ] `package.json` contains all metadata listed in §13.
- [ ] `assets/icon.png` (128×128) committed as a placeholder, with a README note to replace.
- [ ] `SECURITY.md`, `.github/CODEOWNERS`, `docs/architecture.md`, `docs/publishing.md`, `docs/adding-commands.md` all written.
- [ ] `README.md` rewritten per §14; `CHANGELOG.md` reset; `CONTRIBUTING.md` Node version aligned.
- [ ] `.changeset/` initialized; `release.yml` switched to changesets and gracefully no-ops without `VSCE_PAT`.
- [ ] End-to-end smoke: in a clean directory, `npx degit <repo> tmp && cd tmp && pnpm install && pnpm init:template <flags> && pnpm build && pnpm package` produces a `.vsix`; F5 in a fresh VSCode profile loads the extension and shows the renamed command.

## 17. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| `@tomjs/vite-plugin-vscode` `getWebviewHtml` does not expose a nonce hook | Medium | Read plugin source first; fallback is a deterministic `html.replace(/<script /g, `<script nonce="${nonce}" `)` patch in `helper.ts`. |
| Tailwind v4 inline styles incompatible with strict `style-src` | Medium | Accept `'unsafe-inline'` for `style-src`; document the constraint in `architecture.md`. |
| `pnpm package` (`vsce`) fails on Windows / macOS in the matrix | Low | `continue-on-error: ${{ matrix.os != 'ubuntu-latest' }}`; PR pass condition still hinges on Ubuntu. |
| Changesets disrupts current manual release flow | Low | `docs/publishing.md` includes a changesets quickstart; `pnpm package` script kept as escape hatch. |
| Removing dependencies breaks a transitive consumer in retained code | Medium | Drive removal off observed test/build success, not visual inspection: full `install + build + test + manual webview` round-trip per removal. |
| Init script clobbers a user's already-customized clone on second run | Low | Idempotency check via `.template-init.json` (§15). |

## 18. Success metrics

- Net `git diff --stat` is negative across the full hardening (deletes outweigh additions).
- `node_modules` post-install is < 70 % of current size.
- Total test runtime (unit + extension + e2e) < 90 s locally.
- Default CI run (incl. e2e) < 8 min.
- A new contributor can go from `degit` to F5 in under 5 minutes (init script in the path).
- `README.md` ≤ 300 lines (overflow goes to `docs/`).

## 19. Out-of-scope (explicit)

See §2 non-goals. In particular: no Zod runtime validation of messages, no monorepo, no Prettier, no telemetry, no i18n, no multi-panel framework, no change to CommonJS extension loader.
