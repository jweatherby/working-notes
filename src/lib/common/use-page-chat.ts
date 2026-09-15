// Sends a page chat message and waits for Claude's reply, which the server
// produces in the background with the local Claude Code CLI (see
// src/api/assist/chat.ts). The conversation lives only in the component.

import { submitOrThrow } from '$lib/ui/submit';
import type { ChatMessage, PageChatStatus, SendChatResult } from '$shared/types/page-chat';
import type { Result } from '$shared/utils/result';

export interface ChatRequest {
  readonly chatId: string;
  readonly entityType: string;
  readonly entityName: string;
  readonly pageText: string;
  readonly messages: readonly ChatMessage[];
}

export interface ChatTrpc {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly send: { readonly mutate: (input: any) => Promise<Result<SendChatResult>> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly status: { readonly query: (input: any) => Promise<Result<PageChatStatus>> };
}

export type ChatReply =
  | { readonly kind: 'reply'; readonly content: string }
  | { readonly kind: 'warning'; readonly message: string };

const defaultWait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Resolves with Claude's reply, or a warning when `claude` isn't installed; throws with a message on failure. */
export const askAboutPage = async (
  chat: ChatTrpc,
  request: ChatRequest,
  wait: (ms: number) => Promise<void> = defaultWait,
  pollMs = 1000
): Promise<ChatReply> => {
  const started = await submitOrThrow(() => chat.send.mutate(request));
  if (!started.started) return { kind: 'warning', message: started.warning };
  for (;;) {
    await wait(pollMs);
    const status = await submitOrThrow(() => chat.status.query({ chatId: request.chatId }));
    if (status.state === 'running') continue;
    if (status.state === 'done' && status.reply) return { kind: 'reply', content: status.reply };
    throw new Error(status.message ?? "Claude didn't reply. Try again.");
  }
};
