import { describe, it, expect, vi } from 'vitest';
import { askAboutPage, type ChatTrpc } from '../use-page-chat';

const request = {
  chatId: 'c1',
  entityType: 'PERSON',
  entityName: 'Alice',
  pageText: 'Staff Engineer',
  messages: [{ role: 'user' as const, content: 'Role?' }]
};
const noWait = (): Promise<void> => Promise.resolve();

const chatTrpc = (started: unknown, statuses: readonly unknown[]): ChatTrpc => {
  const query = vi.fn();
  statuses.forEach((s) => query.mockResolvedValueOnce({ ok: true, value: s }));
  return { send: { mutate: vi.fn().mockResolvedValue({ ok: true, value: started }) }, status: { query } };
};

describe('askAboutPage', () => {
  it('polls until the reply is done', async () => {
    const chat = chatTrpc({ started: true }, [{ state: 'running' }, { state: 'done', reply: 'Staff Engineer.' }]);
    expect(await askAboutPage(chat, request, noWait)).toEqual({ kind: 'reply', content: 'Staff Engineer.' });
    expect(chat.send.mutate).toHaveBeenCalledWith(request);
    expect(chat.status.query).toHaveBeenCalledTimes(2);
  });

  it('returns the warning when claude is missing, without polling', async () => {
    const chat = chatTrpc({ started: false, warning: 'Install claude' }, []);
    expect(await askAboutPage(chat, request, noWait)).toEqual({ kind: 'warning', message: 'Install claude' });
    expect(chat.status.query).not.toHaveBeenCalled();
  });

  it('throws the failure message', async () => {
    const chat = chatTrpc({ started: true }, [{ state: 'failed', message: 'OAuth session expired' }]);
    await expect(askAboutPage(chat, request, noWait)).rejects.toThrow('OAuth session expired');
  });

  it('throws when the send itself fails', async () => {
    const chat: ChatTrpc = {
      send: { mutate: vi.fn().mockResolvedValue({ ok: false, error: new Error('Claude is still replying in this chat.') }) },
      status: { query: vi.fn() }
    };
    await expect(askAboutPage(chat, request, noWait)).rejects.toThrow('still replying');
  });
});
