// Chatting about the current page in the web app, with the local Claude Code
// CLI. The PageChat comes from the HTTP tRPC context, never the Registry; the
// CLI and MCP have none. Nothing is stored: the UI holds the conversation.

import { ok, err, type Result } from '$shared/utils/result';
import { chatPrompt, type ChatPromptInput } from '$shared/assist/claude-cli';
import type { PageChat, PageChatStatus, SendChatResult } from '$shared/types/page-chat';

export const CHAT_NOT_FOUND_WARNING =
  "Couldn't find the Claude Code CLI (`claude`). Install it and sign in, then send your message again.";

export const chatJobKey = (notebookId: string, chatId: string): string => `${notebookId}/${chatId}`;

export interface SendChatInput extends ChatPromptInput {
  readonly chatId: string;
}

/**
 * Starts Claude's reply to the last message in the background and returns at
 * once. Poll `getChatStatus` for the reply. Without `claude`, a warning.
 */
export const sendChat = (
  pageChat: PageChat | undefined,
  notebookId: string,
  input: SendChatInput
): Result<SendChatResult> => {
  const claudePath = pageChat?.locate() ?? null;
  if (!pageChat || !claudePath) return ok({ started: false, warning: CHAT_NOT_FOUND_WARNING });
  if (input.messages.at(-1)?.role !== 'user') return err(new Error('The last message must be from you.'));

  const started = pageChat.start({ key: chatJobKey(notebookId, input.chatId), claudePath, prompt: chatPrompt(input) });
  return started.ok ? ok({ started: true }) : err(started.error);
};

export const getChatStatus = (
  pageChat: PageChat | undefined,
  notebookId: string,
  chatId: string
): Result<PageChatStatus> =>
  ok(pageChat ? pageChat.status(chatJobKey(notebookId, chatId)) : { state: 'idle' });
