# Contributing Guide

Thank you for your interest in contributing to VSCode Extension Quick Starter!

## Development Setup

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Getting Started

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start development:
   ```bash
   pnpm dev
   ```

## Development Workflow

### Running the Extension

1. Press `F5` in VSCode to launch Extension Development Host
2. Run the command `Hello World: Show` from Command Palette (`Ctrl+Shift+P`)

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run extension integration tests
pnpm test:extension
```

### Linting

```bash
# Run ESLint
pnpm lint
```

### Building

```bash
# Build for production
pnpm build

# Package extension
pnpm package
```

## Project Structure

```
├── extension/          # VSCode extension code
│   ├── index.ts        # Extension entry point
│   └── views/          # Webview panel logic
├── webview/            # React frontend
│   ├── App.tsx         # Main React component
│   ├── components/ui/  # shadcn/ui components
│   └── __tests__/      # Component tests
├── __tests__/          # Extension tests
└── .github/            # GitHub workflows
```

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Example:

```
feat: add new button component
fix: resolve webview state persistence issue
docs: update README with testing instructions
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass
4. Update documentation if needed
5. Submit a pull request

## Code Style

- Use TypeScript for all code
- Follow the existing code style (enforced by ESLint)
- Write meaningful commit messages
- Add tests for new features
- When adding a new extension↔webview message, edit `shared/messages.ts` first; both sides will surface red until you wire the handlers
- Pre-commit runs `lint-staged` only. Pre-push runs `typecheck && test` — if it fails, fix the underlying issue rather than bypassing with `--no-verify`

## Adding shadcn/ui Components

```bash
pnpm dlx shadcn@latest add [component-name]
```

## Questions?

Feel free to open an issue for any questions or concerns.
