# VSCode Extension Quick Starter

[![CI](https://github.com/AstroAir/vscode-extension-quick-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/AstroAir/vscode-extension-quick-starter/actions/workflows/ci.yml)

A minimal, opinionated VSCode extension starter built around **React 19 + shadcn/ui + Tailwind CSS v4**, with a typed extension/webview message contract, CSP-secured webviews, and a real testing pyramid out of the box.

## Highlights

- **Vite 7** unified build for both extension and webview (`@tomjs/vite-plugin-vscode`)
- **Typed message contract** in `shared/messages.ts` — both sides speak the same union
- **CSP + nonce** in production webviews; permissive dev profile for HMR
- **OutputChannel logger**; no stray `console.log` in extension code
- **Three test layers**: Vitest (unit) + `@vscode/test-electron` (extension host) + Playwright (dev + prod-preview)
- **Strict CI**: minimum permissions, Node 20+22 matrix, 3-OS build matrix, weekly Dependabot
- **changesets** drives release; `vsce publish` is a no-op until `VSCE_PAT` is wired

## Getting started

### Prerequisites

- Node.js >= 20
- pnpm

### Clone via degit

```bash
npx degit AstroAir/vscode-extension-quick-starter my-ext
cd my-ext
pnpm install
pnpm init:template
```

`init:template` interactively replaces every hard-coded `your-publisher` / `AstroAir` / `vscode-extension-quick-starter` value across `package.json`, README, CHANGELOG, GitHub templates, and the extension test. Run with `--dry-run` first to see exactly what will change.

### Run

```bash
pnpm dev      # Vite dev server with HMR
```

Press **F5** in VSCode to launch the Extension Development Host. Run **Hello World: Show** from the Command Palette.

### Build

```bash
pnpm build    # production build
pnpm package  # produce a .vsix
```

## Project structure

```
extension/        Node-side code: commands, views, logger
  commands/       One file per command
  views/          Panel + helper (CSP) + message router
  logger.ts       OutputChannel singleton
  index.ts        activate/deactivate
shared/           Single source of truth for the message contract
webview/          React app rendered inside the webview panel
  components/     shadcn UI + ErrorBoundary
  hooks/          useVscodeApi, useVscodeMessage
  utils/          Legacy vscode util (delegates to hook)
__tests__/        Extension-host integration tests (Mocha)
e2e/              Playwright (dev + prod-preview)
docs/             Architecture, publishing, adding-commands
scripts/          init-template.mjs
.github/          Workflows, Dependabot, CODEOWNERS, issue/PR templates
assets/           Marketplace icon (replace before publishing)
```

## Available shadcn components

`alert`, `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `select`, `separator`, `skeleton`, `sonner`, `switch`, `tabs`, `textarea`, `tooltip`. Add more on demand:

```bash
pnpm dlx shadcn@latest add <component>
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for module diagrams, message timing, and CSP enforcement details.

## Adding a new command

See [docs/adding-commands.md](docs/adding-commands.md).

## Publishing to the Marketplace

See [docs/publishing.md](docs/publishing.md). Note: `package.json` ships with `private: true` as a safety brake — flip it before your first `vsce publish`.

## Scripts

| Command               | Description                                         |
| --------------------- | --------------------------------------------------- |
| `pnpm dev`            | Vite dev server with HMR                            |
| `pnpm build`          | Production build                                    |
| `pnpm typecheck`      | `tsc --noEmit` for both projects                    |
| `pnpm lint`           | ESLint (`@antfu` + `@tomjs` presets)                |
| `pnpm test`           | Vitest unit suite                                   |
| `pnpm test:coverage`  | Vitest with v8 coverage                             |
| `pnpm test:extension` | Extension-host integration tests                    |
| `pnpm test:e2e`       | Playwright (dev + prod-preview projects)            |
| `pnpm test:all`       | All three test layers                               |
| `pnpm package`        | Produce `.vsix`                                     |
| `pnpm changeset`      | Add a changeset entry for the next release          |
| `pnpm init:template`  | One-shot template adoption (run once after cloning) |

## Testing

Unit tests live next to source under `webview/__tests__/`. Extension-host tests are in `__tests__/extension/suite/` and run inside an instance of VSCode launched by `@vscode/test-electron`. End-to-end tests in `e2e/` use Playwright with two projects: `dev` (against `pnpm dev`) and `prod-preview` (against `vite preview` of the built dist), so the production bundle's CSP and asset paths are exercised on every PR.

## License

MIT
