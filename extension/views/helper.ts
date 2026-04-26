import { randomBytes } from 'node:crypto';

import getWebviewHtml from 'virtual:vscode';

import { route } from './messages';

import type { WebviewToExtensionMessage } from '@shared/messages';
import type { Disposable, ExtensionContext, Webview } from 'vscode';

function generateNonce(): string {
  return randomBytes(16).toString('base64');
}

function buildCspMeta(webview: Webview, nonce: string, devServerUrl: string | undefined): string {
  const cspSource = webview.cspSource;
  const dev = !!devServerUrl;
  const csp = [
    'default-src \'none\'',
    `img-src ${cspSource} https: data:`,
    `style-src ${cspSource} 'unsafe-inline'`,
    dev
      ? `script-src 'nonce-${nonce}' ${devServerUrl} 'unsafe-eval'`
      : `script-src 'nonce-${nonce}'`,
    dev
      ? `connect-src ${cspSource} ${devServerUrl} ws: wss:`
      : `connect-src ${cspSource}`,
    `font-src ${cspSource} data:`,
  ].join('; ');
  return `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
}

function injectCspAndNonce(html: string, cspMeta: string, nonce: string): string {
  // 1. Insert CSP meta as the first child of <head>.
  let out = html.replace(/<head>/i, `<head>${cspMeta}`);
  // 2. Add nonce to every inline / external <script> tag that lacks one.
  out = out.replace(/<script(?![^>]*\snonce=)([^>]*)>/gi, `<script nonce="${nonce}"$1>`);
  return out;
}

export class WebviewHelper {
  static setupHtml(webview: Webview, context: ExtensionContext): string {
    const nonce = generateNonce();
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    const baseHtml = getWebviewHtml({ serverUrl: devServerUrl, webview, context });
    const cspMeta = buildCspMeta(webview, nonce, devServerUrl);
    return injectCspAndNonce(baseHtml, cspMeta, nonce);
  }

  static setupHooks(webview: Webview, context: ExtensionContext, disposables: Disposable[]): void {
    webview.onDidReceiveMessage(
      (msg: WebviewToExtensionMessage) => {
        void route(msg, context);
      },
      undefined,
      disposables,
    );
  }
}
