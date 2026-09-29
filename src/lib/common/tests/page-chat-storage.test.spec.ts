import { describe, it, expect } from 'vitest';
import { chatStorageKey, loadChat, saveChat, type ChatStorage } from '../page-chat-storage';

const memoryStorage = (): ChatStorage & { readonly items: Map<string, string> } => {
  const items = new Map<string, string>();
  return {
    items,
    get length() { return items.size; },
    key: (i) => [...items.keys()][i] ?? null,
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => { items.set(k, v); },
    removeItem: (k) => { items.delete(k); }
  };
};

const alice = { notebookId: 'work', entityType: 'PERSON', entityId: 'p1' };
const chat = [
  { role: 'user' as const, content: 'Role?' },
  { role: 'assistant' as const, content: 'Staff Engineer.' }
];

describe('page chat storage', () => {
  it('saves and resumes a conversation per notebook and entity', () => {
    const storage = memoryStorage();
    saveChat(storage, alice, chat);
    expect(loadChat(storage, alice)).toEqual(chat);
    expect(loadChat(storage, { ...alice, notebookId: 'side' })).toEqual([]);
    expect(loadChat(storage, { ...alice, entityId: 'p2' })).toEqual([]);
  });

  it('removes the entry when the conversation is cleared', () => {
    const storage = memoryStorage();
    saveChat(storage, alice, chat);
    saveChat(storage, alice, []);
    expect(storage.items.has(chatStorageKey(alice))).toBe(false);
  });

  it('ignores missing storage and bad data', () => {
    expect(loadChat(null, alice)).toEqual([]);
    saveChat(null, alice, chat);
    const storage = memoryStorage();
    storage.setItem(chatStorageKey(alice), '{not json');
    expect(loadChat(storage, alice)).toEqual([]);
    storage.setItem(chatStorageKey(alice), JSON.stringify({ messages: [{ role: 'system', content: 'x' }] }));
    expect(loadChat(storage, alice)).toEqual([]);
  });

  it('ignores a failing write', () => {
    const storage = { ...memoryStorage(), setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(() => saveChat(storage, alice, chat)).not.toThrow();
  });

  it('keeps only the most recent chats, and leaves other keys alone', () => {
    const storage = memoryStorage();
    storage.setItem('quick-finder-cache:work', '{}');
    ['a', 'b', 'c'].forEach((id, i) => saveChat(storage, { ...alice, entityId: id }, chat, i, 2));
    expect(loadChat(storage, { ...alice, entityId: 'a' })).toEqual([]);
    expect(loadChat(storage, { ...alice, entityId: 'b' })).toEqual(chat);
    expect(loadChat(storage, { ...alice, entityId: 'c' })).toEqual(chat);
    expect(storage.items.has('quick-finder-cache:work')).toBe(true);
  });
});
