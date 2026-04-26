import { useEffect } from 'react';

import type { ExtensionToWebviewMessage, MessageOf } from '@shared/messages';

export function useVscodeMessage<T extends ExtensionToWebviewMessage['type']>(
  type: T,
  handler: (msg: MessageOf<T, ExtensionToWebviewMessage>) => void,
): void {
  useEffect(() => {
    function listener(event: MessageEvent): void {
      const msg = event.data as ExtensionToWebviewMessage | undefined;
      if (msg && msg.type === type) {
        handler(msg as MessageOf<T, ExtensionToWebviewMessage>);
      }
    }
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [type, handler]);
}
