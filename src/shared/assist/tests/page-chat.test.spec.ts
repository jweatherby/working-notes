import { afterAll, describe, it, expect } from 'vitest';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PageChat, PageChatStatus } from '$shared/types/page-chat';
import { createPageChat } from '../page-chat.server';

// A stand-in for `claude` that saves its stdin and prints a fixed reply.
const dir = mkdtempSync(join(tmpdir(), 'wn-page-chat-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const fakeClaude = (name: string, stdout: string): string => {
  const path = join(dir, name);
  writeFileSync(path, `#!/bin/sh\ncat > '${join(dir, `${name}.stdin`)}'\ncat <<'EOF'\n${stdout}\nEOF\n`);
  chmodSync(path, 0o755);
  return path;
};

const settle = async (chat: PageChat, key: string): Promise<PageChatStatus> => {
  for (let i = 0; i < 200; i++) {
    const status = chat.status(key);
    if (status.state !== 'running') return status;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('job did not finish');
};

describe('createPageChat', () => {
  it('sends the prompt on stdin and reports the reply once', async () => {
    const claudePath = fakeClaude('ok', JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'Hello **there**' }));
    const chat = createPageChat();

    expect(chat.start({ key: 'work/c1', claudePath, prompt: 'the prompt' }).ok).toBe(true);
    expect(chat.start({ key: 'work/c1', claudePath, prompt: 'again' }).ok).toBe(false);

    expect(await settle(chat, 'work/c1')).toEqual({ state: 'done', reply: 'Hello **there**' });
    expect(chat.status('work/c1')).toEqual({ state: 'idle' });
    expect(readFileSync(join(dir, 'ok.stdin'), 'utf8')).toBe('the prompt');
  });

  it("reports Claude's error once", async () => {
    const claudePath = fakeClaude('expired', JSON.stringify({ type: 'result', subtype: 'success', is_error: true, result: 'OAuth session expired' }));
    const chat = createPageChat();

    chat.start({ key: 'work/c2', claudePath, prompt: 'p' });
    const status = await settle(chat, 'work/c2');

    expect(status.state).toBe('failed');
    expect(status.message).toContain('OAuth session expired');
    expect(chat.status('work/c2')).toEqual({ state: 'idle' });
  });

  it('fails when claude prints nothing', async () => {
    const claudePath = join(dir, 'silent');
    writeFileSync(claudePath, "#!/bin/sh\ncat > /dev/null\necho 'not signed in' >&2\nexit 1\n");
    chmodSync(claudePath, 0o755);
    const chat = createPageChat();

    chat.start({ key: 'work/c3', claudePath, prompt: 'p' });
    expect(await settle(chat, 'work/c3')).toEqual({ state: 'failed', message: 'Claude exited without a reply: not signed in.' });
  });
});
