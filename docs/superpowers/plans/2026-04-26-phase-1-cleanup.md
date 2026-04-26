# Phase 1 — Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Slim the template to its true working set: 16 retained shadcn components, only the dependencies actually used, no tracked build artifacts, no stale emoji noise, a single source of truth for the `@/` alias.

**Architecture:** Pure subtractive refactor — no new abstractions yet. Validates the cut with `pnpm install && pnpm build && pnpm test && pnpm dev` after every dep removal so a broken transitive doesn't get masked. The 9 already-staged-but-untracked components needed by the retained set are committed; the other 34 untracked component files are deleted from the working tree.

**Tech Stack:** pnpm 10, vite 7, vitest 3, shadcn (`new-york`), `vite-tsconfig-paths` (new dev dep replacing the inline alias duplication).

---

## Spec reference

This plan implements §16.1 (Phase 1 DoD) of `docs/superpowers/specs/2026-04-26-vscode-extension-template-hardening-design.md`.

## File map

| Path | Action | Purpose |
|---|---|---|
| `package.json` | Modify | Trim dependencies; add `vite-tsconfig-paths` devDep |
| `pnpm-lock.yaml` | Modify (regenerated) | Reflect new dep set |
| `.editorconfig` | Modify | Remove `🎨` emoji from header comment |
| `.gitignore` | Modify | Add `*.tsbuildinfo` glob |
| `tsconfig.node.tsbuildinfo` | Untrack + delete | Build artifact, must not be in git |
| `vite.config.ts` | Modify | Replace inline alias with `tsconfigPaths()` |
| `vitest.config.ts` | Modify | Same |
| `webview/components/ui/alert.tsx` | Add (commit) | Retained component |
| `webview/components/ui/dialog.tsx` | Add (commit) | Retained component |
| `webview/components/ui/dropdown-menu.tsx` | Add (commit) | Retained component |
| `webview/components/ui/select.tsx` | Add (commit) | Retained component |
| `webview/components/ui/skeleton.tsx` | Add (commit) | Retained component |
| `webview/components/ui/sonner.tsx` | Add (commit) | Retained component |
| `webview/components/ui/switch.tsx` | Add (commit) | Retained component |
| `webview/components/ui/tabs.tsx` | Add (commit) | Retained component |
| `webview/components/ui/tooltip.tsx` | Add (commit) | Retained component |
| `webview/components/ui/{34 others}.tsx` | Delete from working tree | Untracked, never committed |

## Pre-flight

The current branch is `main` with uncommitted modifications to `package.json` and `pnpm-lock.yaml`, plus 44 untracked files (43 shadcn components + `.agents/`). The plan begins by validating that the *current* state still builds, so Phase 1's cuts have a clean baseline to compare against.

---

### Task 1: Baseline validation

**Files:** none (read-only verification).

- [ ] **Step 1: Confirm working tree state**

```bash
git status --short
```

Expected: `M package.json`, `M pnpm-lock.yaml`, `?? .agents/`, plus 43 `?? webview/components/ui/*.tsx` lines.

- [ ] **Step 2: Install with current package.json**

```bash
pnpm install
```

Expected: success, no peer-dep conflicts.

- [ ] **Step 3: Build**

```bash
pnpm build
```

Expected: success. `dist/` produced.

- [ ] **Step 4: Test**

```bash
pnpm test
```

Expected: 12 passed (existing `App.test.tsx` cases).

- [ ] **Step 5: Capture current node_modules size for the success-metrics check**

```bash
du -sh node_modules
```

Record the number — Phase 4 success metric requires `node_modules` < 70% of this baseline.

- [ ] **Step 6: No commit yet** — this task only validates.

---

### Task 2: Remove `.editorconfig` emoji

**Files:** Modify `.editorconfig`.

- [ ] **Step 1: Remove the emoji line**

Replace the current header line `# 🎨 editorconfig.org` with `# editorconfig.org`.

`.editorconfig` final header:

```ini
# editorconfig.org

root = true
```

- [ ] **Step 2: Commit**

```bash
git add .editorconfig
git commit -m "chore: drop emoji from .editorconfig header"
```

---

### Task 3: Untrack `tsconfig.node.tsbuildinfo`

**Files:** Modify `.gitignore`, delete `tsconfig.node.tsbuildinfo`.

- [ ] **Step 1: Verify the file is currently tracked**

```bash
git ls-files | grep tsbuildinfo
```

Expected: `tsconfig.node.tsbuildinfo` printed.

- [ ] **Step 2: Replace single-file ignore with glob in `.gitignore`**

Find the existing line `tsconfig.tsbuildinfo` in `.gitignore` (currently around line 32 in the `# cache` block) and replace it with `*.tsbuildinfo`.

- [ ] **Step 3: Untrack the file**

```bash
git rm --cached tsconfig.node.tsbuildinfo
```

Expected: `rm 'tsconfig.node.tsbuildinfo'`.

- [ ] **Step 4: Verify it's now ignored**

```bash
git status --short tsconfig.node.tsbuildinfo
```

Expected: empty output (ignored).

- [ ] **Step 5: Commit**

```bash
git add .gitignore tsconfig.node.tsbuildinfo
git commit -m "chore: untrack tsconfig.node.tsbuildinfo build artifact"
```

(`tsconfig.node.tsbuildinfo` will appear in the commit as a deletion since `git rm --cached` staged that. The `.gitignore` change covers all `*.tsbuildinfo` going forward.)

---

### Task 4: Delete the 34 unused shadcn components

**Files:** Delete from working tree (these files are *untracked*, so this is a plain `rm`, not a `git rm`):

```
webview/components/ui/accordion.tsx
webview/components/ui/alert-dialog.tsx
webview/components/ui/aspect-ratio.tsx
webview/components/ui/avatar.tsx
webview/components/ui/breadcrumb.tsx
webview/components/ui/calendar.tsx
webview/components/ui/carousel.tsx
webview/components/ui/chart.tsx
webview/components/ui/checkbox.tsx
webview/components/ui/collapsible.tsx
webview/components/ui/command.tsx
webview/components/ui/context-menu.tsx
webview/components/ui/direction.tsx
webview/components/ui/drawer.tsx
webview/components/ui/empty.tsx
webview/components/ui/hover-card.tsx
webview/components/ui/input-otp.tsx
webview/components/ui/item.tsx
webview/components/ui/kbd.tsx
webview/components/ui/menubar.tsx
webview/components/ui/native-select.tsx
webview/components/ui/navigation-menu.tsx
webview/components/ui/pagination.tsx
webview/components/ui/popover.tsx
webview/components/ui/progress.tsx
webview/components/ui/radio-group.tsx
webview/components/ui/resizable.tsx
webview/components/ui/scroll-area.tsx
webview/components/ui/sheet.tsx
webview/components/ui/slider.tsx
webview/components/ui/spinner.tsx
webview/components/ui/table.tsx
webview/components/ui/toggle-group.tsx
webview/components/ui/toggle.tsx
```

- [ ] **Step 1: Delete the files** (one command, list quoted to handle hyphens)

```bash
rm \
  webview/components/ui/accordion.tsx \
  webview/components/ui/alert-dialog.tsx \
  webview/components/ui/aspect-ratio.tsx \
  webview/components/ui/avatar.tsx \
  webview/components/ui/breadcrumb.tsx \
  webview/components/ui/calendar.tsx \
  webview/components/ui/carousel.tsx \
  webview/components/ui/chart.tsx \
  webview/components/ui/checkbox.tsx \
  webview/components/ui/collapsible.tsx \
  webview/components/ui/command.tsx \
  webview/components/ui/context-menu.tsx \
  webview/components/ui/direction.tsx \
  webview/components/ui/drawer.tsx \
  webview/components/ui/empty.tsx \
  webview/components/ui/hover-card.tsx \
  webview/components/ui/input-otp.tsx \
  webview/components/ui/item.tsx \
  webview/components/ui/kbd.tsx \
  webview/components/ui/menubar.tsx \
  webview/components/ui/native-select.tsx \
  webview/components/ui/navigation-menu.tsx \
  webview/components/ui/pagination.tsx \
  webview/components/ui/popover.tsx \
  webview/components/ui/progress.tsx \
  webview/components/ui/radio-group.tsx \
  webview/components/ui/resizable.tsx \
  webview/components/ui/scroll-area.tsx \
  webview/components/ui/sheet.tsx \
  webview/components/ui/slider.tsx \
  webview/components/ui/spinner.tsx \
  webview/components/ui/table.tsx \
  webview/components/ui/toggle-group.tsx \
  webview/components/ui/toggle.tsx
```

- [ ] **Step 2: Verify only the 16 retained UI files remain**

```bash
ls webview/components/ui/
```

Expected: exactly these 16 entries — `alert.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `separator.tsx`, `skeleton.tsx`, `sonner.tsx`, `switch.tsx`, `tabs.tsx`, `textarea.tsx`, `tooltip.tsx`.

- [ ] **Step 3: Run build to confirm nothing broke**

```bash
pnpm build
```

Expected: success (no retained file imports a deleted file).

- [ ] **Step 4: No commit** — these files were untracked, so there's nothing to remove from the index. The deletions are local-only at this point and visible in the working tree only.

---

### Task 5: Commit the 9 retained-but-untracked components

**Files:** Add to git (already in working tree, untracked):

```
webview/components/ui/alert.tsx
webview/components/ui/dialog.tsx
webview/components/ui/dropdown-menu.tsx
webview/components/ui/select.tsx
webview/components/ui/skeleton.tsx
webview/components/ui/sonner.tsx
webview/components/ui/switch.tsx
webview/components/ui/tabs.tsx
webview/components/ui/tooltip.tsx
```

- [ ] **Step 1: Stage them**

```bash
git add \
  webview/components/ui/alert.tsx \
  webview/components/ui/dialog.tsx \
  webview/components/ui/dropdown-menu.tsx \
  webview/components/ui/select.tsx \
  webview/components/ui/skeleton.tsx \
  webview/components/ui/sonner.tsx \
  webview/components/ui/switch.tsx \
  webview/components/ui/tabs.tsx \
  webview/components/ui/tooltip.tsx
```

- [ ] **Step 2: Verify only those 9 are staged**

```bash
git status --short
```

Expected: 9 `A` lines for the components, plus the still-modified `package.json` / `pnpm-lock.yaml`, plus `?? .agents/`.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(ui): commit 9 retained shadcn components"
```

---

### Task 6: Trim dependencies (one at a time, validate after each)

**Files:** Modify `package.json` (and `pnpm-lock.yaml` regenerated implicitly).

For each dependency below: **uninstall → install → build → test → manual webview check (if it's a runtime dep) → commit**. If any step fails, **stop**: that dep is needed by something we kept, so revert and skip it.

The list, in safe-to-remove order (heaviest and most isolated first):

1. `recharts`
2. `embla-carousel-react`
3. `react-day-picker`
4. `vaul`
5. `cmdk`
6. `input-otp`
7. `react-hook-form`
8. `@hookform/resolvers`
9. `zod`
10. `next-themes`
11. `@base-ui/react`
12. `radix-ui`  *(meta package — verify all retained components import individual `@radix-ui/react-*` packages instead; if any retained component references `'radix-ui'`, leave this dep in place)*
13. `date-fns`  *(only used by `calendar.tsx`, which is deleted; safe to remove)*

The 9 retained components added in Task 5 each require one individual radix dep. Add the missing ones in Step N+1 below. The probable additions (verified by reading each retained component's `import` lines):

- `@radix-ui/react-dialog` (for `dialog.tsx`)
- `@radix-ui/react-dropdown-menu` (for `dropdown-menu.tsx`)
- `@radix-ui/react-select` (for `select.tsx`)
- `@radix-ui/react-switch` (for `switch.tsx`)
- `@radix-ui/react-tabs` (for `tabs.tsx`)
- `@radix-ui/react-tooltip` (for `tooltip.tsx`)
- `@radix-ui/react-icons` (sometimes used by select/dropdown — only if actually imported)

`alert.tsx`, `skeleton.tsx`, `sonner.tsx` typically don't need radix; verify by reading them.

- [ ] **Step 1: Read each retained component to enumerate its actual imports**

```bash
grep -r "^import" webview/components/ui/*.tsx | grep -E "(@radix-ui|@base-ui|cmdk|input-otp|next-themes|recharts|embla|vaul|react-day-picker|react-hook-form|@hookform|zod|date-fns|sonner|lucide-react|class-variance-authority|clsx|tailwind-merge|radix-ui)" | sort -u
```

Record the unique set. This is the **authoritative kept-deps list**.

- [ ] **Step 2: For each candidate dep `X` in the removal list, in order, run:**

```bash
pnpm remove X
pnpm install
pnpm build
pnpm test
pnpm dev   # in another terminal — load the webview at localhost:5173, verify no console errors, then Ctrl-C
```

If all green: commit with message `chore(deps): drop unused X`.
If any step fails: `git checkout package.json pnpm-lock.yaml && pnpm install` to restore, leave the dep, document why in the commit log of the next successful removal.

- [ ] **Step 3: Add any missing individual radix deps identified in Step 1**

Example (concrete set depends on Step 1 grep output):

```bash
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-tooltip
pnpm install
pnpm build
pnpm test
```

Expected: all green. If a retained component still references `radix-ui` (the meta), and the meta was removed, replace its import with the individual package and rebuild.

- [ ] **Step 4: Final state check**

```bash
pnpm list --prod --depth=0
```

The runtime deps should be a small set (≈10–14 entries) covering only the 16 retained components and `App.tsx`'s lucide icons.

- [ ] **Step 5: Commit (if anything's left unstaged from the loop)**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): final dep set after Phase 1 trim"
```

---

### Task 7: Consolidate `@/` alias via `vite-tsconfig-paths`

**Files:** `package.json` (add devDep), `vite.config.ts`, `vitest.config.ts`.

- [ ] **Step 1: Install the plugin**

```bash
pnpm add -D vite-tsconfig-paths
```

- [ ] **Step 2: Update `vite.config.ts`**

Final content:

```ts
import tailwindcss from '@tailwindcss/vite';
import vscode from '@tomjs/vite-plugin-vscode';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    vscode({
      extension: {
        sourcemap: 'inline',
      },
    }),
  ],
});
```

(The `import path from 'node:path'` and the `resolve.alias` block are removed. `tsconfig.json`'s `paths.@/*` is now the single source of truth.)

- [ ] **Step 3: Update `vitest.config.ts`**

Final content:

```ts
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./webview/__tests__/setup.ts'],
    include: ['webview/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['webview/**/*.{ts,tsx}'],
      exclude: [
        'webview/**/*.d.ts',
        'webview/__tests__/**',
        'webview/main.tsx',
      ],
    },
  },
});
```

- [ ] **Step 4: Build + test to confirm aliases still resolve**

```bash
pnpm build
pnpm test
```

Expected: both green. `App.tsx`'s `import { Button } from '@/components/ui/button'` must still resolve.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts vitest.config.ts
git commit -m "refactor: single-source @/ alias via vite-tsconfig-paths"
```

---

### Task 8: Final Phase-1 validation

**Files:** none (read-only).

- [ ] **Step 1: Full validation pipeline**

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Expected: all green.

- [ ] **Step 2: Manual webview smoke**

```bash
pnpm dev
```

Open http://localhost:5173 in a browser. Verify:
- Page loads
- "VSCode Extension Starter" heading visible
- No console errors / warnings
- Message + State cards render

Stop with Ctrl-C.

- [ ] **Step 3: Net-line-count check (Phase-1 success metric)**

```bash
git diff --shortstat origin/main..HEAD
```

Expected: total deleted lines > total inserted lines. Record both.

- [ ] **Step 4: node_modules size check**

```bash
du -sh node_modules
```

Expected: noticeably smaller than the Task 1 baseline. Record both numbers; the 70%-of-baseline goal is checked at the end of Phase 4.

- [ ] **Step 5: Tag the milestone (optional, but recommended for rollback safety)**

```bash
git tag phase-1-complete
```

---

## Phase 1 done

Outputs at this point:
- 16 shadcn components in `webview/components/ui/`
- A trimmed runtime dep set tied to actual usage
- `*.tsbuildinfo` ignored project-wide
- `.editorconfig` clean
- A single `@/` alias source (tsconfig.json paths, consumed by vite + vitest via `vite-tsconfig-paths`)
- Build, lint, typecheck, unit tests all green
- `node_modules` materially smaller than baseline

Next: **Phase 2 — Types + Security** (`docs/superpowers/plans/2026-04-26-phase-2-types-and-security.md`).
