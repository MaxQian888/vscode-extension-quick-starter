import { window } from 'vscode';

import { logger } from '../logger';

import type { WebviewToExtensionMessage } from '@shared/messages';
import type { ExtensionContext } from 'vscode';

type Handler<T extends WebviewToExtensionMessage['type']> = (
  msg: Extract<WebviewToExtensionMessage, { type: T }>,
  ctx: ExtensionContext,
) => void | Promise<void>;

type HandlerMap = {
  [K in WebviewToExtensionMessage['type']]: Handler<K>;
};

const handlers: HandlerMap = {
  'hello': (msg) => {
    window.showInformationMessage(msg.data);
  },
  'log': (msg) => {
    logger[msg.level](`[webview] ${msg.message}`);
  },
  'webview/error': (msg) => {
    // Inline the stack into the message string. The logger's `error?` arg
    // only formats `instanceof Error` and would silently drop a plain
    // {name,message,stack} payload like the one webview/error carries.
    const stack = msg.error.stack ? `\n${msg.error.stack}` : '';
    logger.error(`[webview render] ${msg.error.name}: ${msg.error.message}${stack}`);
    window.showErrorMessage(`Webview error: ${msg.error.message}`);
  },
  'webview/ready': () => {
    logger.info('webview ready');
  },
};

export async function route(msg: WebviewToExtensionMessage, ctx: ExtensionContext): Promise<void> {
  const handler = handlers[msg.type] as Handler<typeof msg.type>;
  if (!handler) {
    logger.warn(`no handler registered for message type: ${msg.type}`);
    return;
  }
  try {
    await handler(msg as never, ctx);
  }
  catch (err) {
    logger.error(`handler for ${msg.type} threw`, err);
  }
}
