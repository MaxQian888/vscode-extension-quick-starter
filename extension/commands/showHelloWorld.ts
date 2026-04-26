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
        // Initial server→client message will be sent in response to webview/ready (see panel.ts handshake).
        void panel;
      }
      catch (err) {
        logger.error('failed to show hello-world panel', err);
        throw err;
      }
    }),
  );
}
