# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Typed extension/webview message contract (`shared/messages.ts`)
- `OutputChannel` logger
- CSP + nonce in webview HTML; `localResourceRoots` constrained to `dist/`
- `ErrorBoundary` + global error capture in webview
- `useVscodeApi` and `useVscodeMessage` hooks
- `webview/ready` handshake gating first server→client message
- Coverage thresholds for hooks/lib/ErrorBoundary
- Playwright `dev` + `prod-preview` projects
- Node 20+22 test matrix; 3-OS build matrix in CI
- Weekly grouped Dependabot
- Marketplace metadata (categories, keywords, icon, galleryBanner, extensionKind, capabilities)
- `scripts/init-template.mjs` for one-shot template adoption
- `SECURITY.md`, `.github/CODEOWNERS`, `docs/{architecture,publishing,adding-commands}.md`
- changesets-driven release workflow

### Changed
- shadcn component set trimmed to 16 commonly-used components
- pre-commit hook is fast (`lint-staged`); pre-push runs `typecheck && test`
- `release.yml` skips Marketplace step gracefully when `VSCE_PAT` is unset

### Removed
- 34 unused shadcn components and their heavy deps (`recharts`, `embla-carousel-react`, `vaul`, `react-day-picker`, `cmdk`, `input-otp`, `next-themes`, `react-hook-form`, `@hookform/resolvers`, `@base-ui/react`, `zod`, `react-resizable-panels`, `date-fns`)
- `tsconfig.node.tsbuildinfo` from version control
- Tautology asserts in extension-host tests
