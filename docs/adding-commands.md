# Adding a New Command

The template demonstrates the pattern with `extension/commands/showHelloWorld.ts`. To add another:

## 1. Create the command file

`extension/commands/myFeature.ts`:

```ts
import { commands, window } from 'vscode';

import { logger } from '../logger';

import type { ExtensionContext } from 'vscode';

const COMMAND_ID = 'my-extension.myFeature';

export function register(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand(COMMAND_ID, async () => {
      try {
        const choice = await window.showQuickPick(['Option A', 'Option B']);
        if (choice)
          window.showInformationMessage(`You picked ${choice}`);
      }
      catch (err) {
        logger.error('myFeature command failed', err);
        throw err;
      }
    }),
  );
}
```

## 2. Register the command in `package.json`

Add an entry under `contributes.commands`:

    {
      "command": "my-extension.myFeature",
      "title": "My Extension: Do Thing"
    }

## 3. Wire it from `extension/index.ts`

```ts
import { register as registerMyFeature } from './commands/myFeature';

export function activate(context: ExtensionContext): void {
  registerShowHelloWorld(context);
  registerMyFeature(context);
}
```

## 4. (If the command communicates with the webview) Add a message variant

In `shared/messages.ts`, add a case to either union as appropriate. Append a new variant to the existing union:

    | { type: 'feature/run'; payload: { input: string } };

TypeScript will now require:

- A handler in `extension/views/messages.ts`.
- A `useVscodeMessage('feature/run', handler)` call (or a `postMessage` typed call) in the webview.

## 5. Test it

Add an integration assertion to `__tests__/extension/suite/extension.test.ts`:

```ts
it('registers the myFeature command', async () => {
  const ext = vscode.extensions.getExtension(EXTENSION_ID);
  if (ext && !ext.isActive)
    await ext.activate();
  const ids = await vscode.commands.getCommands(true);
  assert.ok(ids.includes('my-extension.myFeature'));
});
```

Run:

```bash
pnpm test:extension
```
