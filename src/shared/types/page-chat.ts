// Chatting about the page the user is looking at, with the local Claude Code CLI.
// Only the web app's tRPC context carries a PageChat; the CLI and MCP don't.

import type { Result } from '$shared/utils/result';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  readonly role: ChatRole;
  readonly content: string;
}

export interface PageChatStatus {
  readonly state: 'idle' | 'running' | 'failed' | 'done';
  /** The error, when failed. */
  readonly message?: string;
  /** Claude's reply, when done. */
  readonly reply?: string;
}

export interface PageChatJob {
  /** `<notebookId>/<chatId>`: one reply at a time per chat. */
  readonly key: string;
  readonly claudePath: string;
  /** The whole prompt: page contents and the conversation so far. */
  readonly prompt: string;
}

export interface PageChat {
  /** Looks for the `claude` executable on every call; null when it isn't installed. */
  readonly locate: () => string | null;
  /** Starts the job, or returns an error if one is already running for `key`. */
  readonly start: (job: PageChatJob) => Result<void>;
  /** A failed or done status is reported once, then the chat reads as idle. */
  readonly status: (key: string) => PageChatStatus;
}

export type SendChatResult =
  | { readonly started: true }
  | { readonly started: false; readonly warning: string };
