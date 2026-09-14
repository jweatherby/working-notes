import { describe, it, expect } from 'vitest';
import { buildClaudeArgs, findClaude, parseClaudeOutput } from '../claude-cli';

const only = (...paths: string[]) => (path: string): boolean => paths.includes(path);

describe('findClaude', () => {
  it('prefers claude on PATH over the install locations', () => {
    const found = findClaude(
      { PATH: '/usr/bin:/custom/bin/', HOME: '/Users/me' },
      only('/custom/bin/claude', '/opt/homebrew/bin/claude')
    );
    expect(found).toBe('/custom/bin/claude');
  });

  it('falls back to where installers put it when PATH is minimal', () => {
    expect(findClaude({ PATH: '/usr/bin:/bin', HOME: '/Users/me' }, only('/Users/me/.local/bin/claude'))).toBe(
      '/Users/me/.local/bin/claude'
    );
    expect(findClaude({}, only('/opt/homebrew/bin/claude'))).toBe('/opt/homebrew/bin/claude');
  });

  it('returns null when claude is nowhere', () => {
    expect(findClaude({ PATH: '/usr/bin', HOME: '/Users/me' }, () => false)).toBeNull();
  });
});

describe('buildClaudeArgs', () => {
  it('runs headless with only the Read tool and no user settings or MCP servers', () => {
    const args = buildClaudeArgs('source-1.pdf');
    expect(args[0]).toBe('-p');
    expect(args[1]).toContain('./source-1.pdf');
    expect(args.slice(2)).toEqual([
      '--output-format', 'json',
      '--tools', 'Read',
      '--allowedTools', 'Read',
      '--permission-mode', 'dontAsk',
      '--no-session-persistence',
      '--strict-mcp-config',
      '--setting-sources', ''
    ]);
  });
});

describe('parseClaudeOutput', () => {
  const reply = (fields: Record<string, unknown>): string =>
    JSON.stringify({ type: 'result', subtype: 'success', is_error: false, ...fields });

  it('returns the markdown, without a wrapping code fence', () => {
    expect(parseClaudeOutput(reply({ result: '# Title\n\nBody' }))).toEqual({ ok: true, value: '# Title\n\nBody' });
    expect(parseClaudeOutput(reply({ result: '```markdown\n# Title\n```' }))).toEqual({ ok: true, value: '# Title' });
  });

  it("passes on Claude's own error, such as an expired sign-in", () => {
    const result = parseClaudeOutput(reply({ is_error: true, result: 'Failed to authenticate: OAuth session expired' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe("Claude couldn't convert the PDF: Failed to authenticate: OAuth session expired");
  });

  it('rejects output that is not JSON, or has no markdown', () => {
    expect(parseClaudeOutput('Error: boom').ok).toBe(false);
    expect(parseClaudeOutput(reply({ result: '   ' })).ok).toBe(false);
  });
});
