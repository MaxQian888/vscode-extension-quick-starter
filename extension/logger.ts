import { window } from 'vscode';

import type { OutputChannel } from 'vscode';

let channel: OutputChannel | undefined;

function ensureChannel(): OutputChannel {
  if (!channel) {
    channel = window.createOutputChannel('VSCode Extension Quick Starter');
  }
  return channel;
}

function format(level: string, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level}] ${message}`;
}

export const logger = {
  debug(message: string): void {
    ensureChannel().appendLine(format('DEBUG', message));
  },
  info(message: string): void {
    ensureChannel().appendLine(format('INFO', message));
  },
  warn(message: string): void {
    ensureChannel().appendLine(format('WARN', message));
  },
  error(message: string, error?: unknown): void {
    const detail = error instanceof Error ? `\n${error.stack ?? error.message}` : '';
    ensureChannel().appendLine(format('ERROR', message + detail));
  },
  show(): void {
    ensureChannel().show();
  },
  dispose(): void {
    channel?.dispose();
    channel = undefined;
  },
};
