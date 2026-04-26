# Security Policy

## Reporting a Vulnerability

If you find a security vulnerability in this template or in code derived from it, please **do not open a public GitHub issue**. Instead, use one of the following private channels:

- GitHub Security Advisory: <https://github.com/AstroAir/vscode-extension-quick-starter/security/advisories/new>
- Email the maintainers (replace with your address before publishing): `security@example.com`

We aim to respond within 5 business days. Please include:

- A clear description of the issue and its impact
- Steps to reproduce
- Affected versions
- Any mitigation you're already aware of

## Supported Versions

Only the latest minor release on `main` receives security fixes. Older versions may be patched on a best-effort basis.

## What this template enforces

- A strict Content Security Policy in production webview HTML, limited to `nonce-`-tagged scripts only.
- `localResourceRoots` confined to the extension's `dist/` directory.
- A typed message contract (`shared/messages.ts`) preventing untyped payloads from crossing the extension/webview boundary.

When you derive an extension from this template, please:

- Audit any `<script>`, `<iframe>`, or external network call you add against the existing CSP profile.
- Run `pnpm audit` periodically; Dependabot will open weekly grouped PRs for updates.
- Never disable `enableScripts` and re-enable it loosely — the typed hooks rely on `acquireVsCodeApi`.
