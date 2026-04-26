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
