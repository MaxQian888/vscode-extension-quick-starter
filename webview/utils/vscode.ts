import { getVscodeApi } from '@/hooks/useVscodeApi';

import type { WebviewToExtensionMessage } from '@shared/messages';

const api = getVscodeApi();

export const vscode = {
  postMessage: (msg: WebviewToExtensionMessage) => api.postMessage(msg),
  getState: <S = unknown>() => api.getState() as S | undefined,
  setState: <S = unknown>(state: S) => api.setState(state as never) as S,
};
