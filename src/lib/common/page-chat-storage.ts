// Keeps each page's chat in the browser's localStorage, so reloading or coming
// back to the page resumes the conversation. One key per notebook and entity;
// only the most recent chats are kept.

import type { ChatMessage } from '$shared/types/page-chat';

/** The part of `Storage` this uses, so tests can pass a fake. */
export interface ChatStorage {
  readonly length: number;
  readonly key: (index: number) => string | null;
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
}

export interface ChatPage {
  readonly notebookId: string;
  readonly entityType: string;
  readonly entityId: string;
}

interface StoredChat {
  readonly updatedAt: number;
  readonly messages: readonly ChatMessage[];
}

const PREFIX = 'page-chat:';
export const MAX_STORED_CHATS = 50;

export const chatStorageKey = (page: ChatPage): string =>
  `${PREFIX}${page.notebookId}:${page.entityType}:${page.entityId}`;

const isMessage = (m: unknown): m is ChatMessage =>
  typeof m === 'object' &&
  m !== null &&
  ((m as ChatMessage).role === 'user' || (m as ChatMessage).role === 'assistant') &&
  typeof (m as ChatMessage).content === 'string';

const parse = (raw: string | null): StoredChat | null => {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<StoredChat>;
    if (!Array.isArray(data.messages) || !data.messages.every(isMessage)) return null;
    return { updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0, messages: data.messages };
  } catch {
    return null;
  }
};

/** The saved conversation for the page, or none when nothing (valid) is stored or storage is unavailable. */
export const loadChat = (storage: ChatStorage | null, page: ChatPage): readonly ChatMessage[] => {
  try {
    return parse(storage?.getItem(chatStorageKey(page)) ?? null)?.messages ?? [];
  } catch {
    return [];
  }
};

const chatKeys = (storage: ChatStorage): readonly string[] =>
  Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(
    (k): k is string => k !== null && k.startsWith(PREFIX)
  );

/** Drops the oldest chats beyond `max`, keeping `keep`. */
const prune = (storage: ChatStorage, keep: string, max: number): void => {
  const others = chatKeys(storage)
    .filter((k) => k !== keep)
    .map((k) => ({ key: k, updatedAt: parse(storage.getItem(k))?.updatedAt ?? 0 }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  others.slice(Math.max(0, max - 1)).forEach(({ key }) => storage.removeItem(key));
};

/** Saves the conversation; an empty one removes the page's entry. Storage errors are ignored. */
export const saveChat = (
  storage: ChatStorage | null,
  page: ChatPage,
  messages: readonly ChatMessage[],
  now: number = Date.now(),
  max: number = MAX_STORED_CHATS
): void => {
  if (!storage) return;
  const key = chatStorageKey(page);
  try {
    if (messages.length === 0) {
      storage.removeItem(key);
      return;
    }
    const stored: StoredChat = { updatedAt: now, messages };
    storage.setItem(key, JSON.stringify(stored));
    prune(storage, key, max);
  } catch {
    /* quota exceeded or storage unavailable — the chat still works, it just isn't kept */
  }
};

/** `localStorage`, or null where it can't be reached (server rendering, blocked site data). */
export const browserChatStorage = (): ChatStorage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};
