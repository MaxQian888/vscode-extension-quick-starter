import { describe, expectTypeOf, it } from 'vitest';

import type {
  ExtensionToWebviewMessage,
  MessageOf,
  WebviewToExtensionMessage,
} from '@shared/messages';

describe('message contract', () => {
  it('extracts payload by literal type', () => {
    type Hello = MessageOf<'hello', WebviewToExtensionMessage>;
    expectTypeOf<Hello>().toEqualTypeOf<{ type: 'hello'; data: string }>();
  });

  it('webview/error has a typed error payload', () => {
    type WebviewError = MessageOf<'webview/error', WebviewToExtensionMessage>;
    expectTypeOf<WebviewError['error']>().toEqualTypeOf<{
      name: string;
      message: string;
      stack?: string;
    }>();
  });

  it('extension theme/changed enumerates kinds', () => {
    type Theme = MessageOf<'theme/changed', ExtensionToWebviewMessage>;
    expectTypeOf<Theme['kind']>().toEqualTypeOf<'light' | 'dark' | 'high-contrast'>();
  });

  it('rejects unknown message types at compile time', () => {
    // @ts-expect-error 'unknown' is not a valid type
    type _Bogus = MessageOf<'unknown', WebviewToExtensionMessage>;
  });
});
