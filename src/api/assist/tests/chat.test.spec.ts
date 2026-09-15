import { describe, it, expect, vi } from 'vitest';
import { ok, err } from '$shared/utils/result';
import type { PageChat, PageChatJob } from '$shared/types/page-chat';
import { CHAT_NOT_FOUND_WARNING, getChatStatus, sendChat } from '../chat';

const fakeChat = (claudePath: string | null = '/opt/homebrew/bin/claude', busy = false) => {
  const jobs: PageChatJob[] = [];
  const pageChat: PageChat = {
    locate: () => claudePath,
    start: (job) => {
      if (busy) return err(new Error('Claude is still replying in this chat.'));
      jobs.push(job);
      return ok(undefined);
    },
    status: vi.fn(() => ({ state: 'done' as const, reply: 'Hi' }))
  };
  return { pageChat, jobs };
};

const input = {
  chatId: 'chat-1',
  entityType: 'TEAM',
  entityName: 'Platform',
  pageText: 'Owns the build',
  messages: [{ role: 'user' as const, content: 'What does it own?' }]
};

describe('sendChat', () => {
  it('warns when claude is not installed, or there is no chat (the CLI and MCP context)', () => {
    const expected = { ok: true, value: { started: false, warning: CHAT_NOT_FOUND_WARNING } };
    expect(sendChat(fakeChat(null).pageChat, 'work', input)).toEqual(expected);
    expect(sendChat(undefined, 'work', input)).toEqual(expected);
  });

  it('starts a job keyed by notebook and chat, with the page in the prompt', () => {
    const { pageChat, jobs } = fakeChat();
    expect(sendChat(pageChat, 'work', input)).toEqual({ ok: true, value: { started: true } });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.key).toBe('work/chat-1');
    expect(jobs[0]?.prompt).toContain('Owns the build');
    expect(jobs[0]?.prompt).toContain('What does it own?');
  });

  it('refuses when the last message is not the user’s, or a reply is already running', () => {
    const last = { ...input, messages: [...input.messages, { role: 'assistant' as const, content: 'The build' }] };
    expect(sendChat(fakeChat().pageChat, 'work', last).ok).toBe(false);
    expect(sendChat(fakeChat('/bin/claude', true).pageChat, 'work', input).ok).toBe(false);
  });
});

describe('getChatStatus', () => {
  it('reads the job, or idle without a chat', () => {
    const { pageChat } = fakeChat();
    expect(getChatStatus(pageChat, 'work', 'chat-1')).toEqual({ ok: true, value: { state: 'done', reply: 'Hi' } });
    expect(pageChat.status).toHaveBeenCalledWith('work/chat-1');
    expect(getChatStatus(undefined, 'work', 'chat-1')).toEqual({ ok: true, value: { state: 'idle' } });
  });
});
