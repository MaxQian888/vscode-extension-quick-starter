# Publishing to the VSCode Marketplace

## One-time setup

### 1. Create a Publisher

Visit <https://marketplace.visualstudio.com/manage>, sign in with the Microsoft account you want to publish under, and create a Publisher. Note its ID (it's the `publisher` field in `package.json`).

### 2. Create a Personal Access Token (PAT)

In Azure DevOps (<https://dev.azure.com>), generate a PAT with **Marketplace → Manage** scope, valid for the lifetime you want. Save it somewhere safe.

### 3. Wire the secret

In your GitHub repository settings, add a secret named `VSCE_PAT` containing the PAT. The release workflow in `.github/workflows/release.yml` will pick it up automatically; without it, the workflow gracefully skips Marketplace publishing and only produces a GitHub Release with a `.vsix` attached.

### 4. Flip `private`

`package.json` ships with `"private": true` as a safety brake. Set it to `false` before your first publish.

## First release with changesets

This template uses [changesets](https://github.com/changesets/changesets) for versioning.

```bash
# In a feature branch with a user-facing change:
pnpm changeset
# Pick the bump type (patch/minor/major) and write a one-line summary.
git add .changeset/*.md
git commit -m "chore: add changeset for <feature>"
git push
```

When the PR is merged to `main`, the changesets bot opens a `Version Packages` PR that bumps `package.json` and updates `CHANGELOG.md`. Merging that PR creates a tag and triggers `release.yml`, which:

1. Runs `pnpm test && pnpm build && pnpm package`.
2. Creates a GitHub Release with the generated `.vsix` attached.
3. If `VSCE_PAT` is set, runs `pnpm vsce publish`.

## Manual escape hatch

If you need to publish a one-off without going through changesets:

```bash
pnpm version <patch|minor|major>
pnpm package
pnpm vsce publish --pat $VSCE_PAT
```

## Pre-release tags

Marketplace pre-releases are emitted with a separate flag:

```bash
pnpm package:pre
pnpm vsce publish --pre-release --pat $VSCE_PAT
```

## Verification checklist before publishing

- [ ] `pnpm typecheck && pnpm lint && pnpm test:all` green
- [ ] `CHANGELOG.md` updated (or changeset committed)
- [ ] `assets/icon.png` replaced with the real product icon
- [ ] `private: false` in `package.json`
- [ ] README screenshots / GIFs current
- [ ] Manually installed the `.vsix` in a clean VSCode profile and verified the command + webview behavior
