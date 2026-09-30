import { describe, it, expect } from 'vitest';
import { claudeDesktopConfigPath, installedBinary, withMcpServer } from '../desktop-plan';

const mac = { platform: 'darwin' as const, home: '/Users/me', env: {} };
const windows = { platform: 'win32' as const, home: 'C:\\Users\\me', env: { LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local', APPDATA: 'C:\\Users\\me\\AppData\\Roaming' } };
const linux = { platform: 'linux' as const, home: '/home/me', env: {} };

describe('installedBinary', () => {
  it('points at App/current in the data folder', () => {
    expect(installedBinary(mac)).toBe('/Users/me/Library/Application Support/Working Notes/App/current/wnotes');
    expect(installedBinary(windows)).toBe('C:\\Users\\me\\AppData\\Local\\Working Notes\\App\\current\\wnotes.exe');
    expect(installedBinary(linux)).toBe('/home/me/.local/share/working-notes/App/current/wnotes');
  });
});

describe('claudeDesktopConfigPath', () => {
  it("uses Claude desktop's folder on each system", () => {
    expect(claudeDesktopConfigPath(mac)).toBe('/Users/me/Library/Application Support/Claude/claude_desktop_config.json');
    expect(claudeDesktopConfigPath(windows)).toBe('C:\\Users\\me\\AppData\\Roaming\\Claude\\claude_desktop_config.json');
    expect(claudeDesktopConfigPath(linux)).toBe('/home/me/.config/Claude/claude_desktop_config.json');
  });
});

describe('withMcpServer', () => {
  const entry = { command: '/data/App/current/wnotes', args: ['mcp'] };

  it('adds the server to a missing or empty config', () => {
    for (const existing of [null, '', '  \n']) {
      const result = withMcpServer(existing, 'working-notes', entry);
      expect(result.ok && result.value.change).toBe('added');
      expect(result.ok && JSON.parse(result.value.text)).toEqual({ mcpServers: { 'working-notes': entry } });
    }
  });

  it('keeps other settings and servers', () => {
    const existing = JSON.stringify({ theme: 'dark', mcpServers: { other: { command: 'x', args: [] } } });
    const result = withMcpServer(existing, 'working-notes', entry);
    expect(result.ok && JSON.parse(result.value.text)).toEqual({
      theme: 'dark',
      mcpServers: { other: { command: 'x', args: [] }, 'working-notes': entry }
    });
  });

  it('reports whether anything changed', () => {
    const same = JSON.stringify({ mcpServers: { 'working-notes': entry } });
    const result = withMcpServer(same, 'working-notes', entry);
    expect(result.ok && result.value.change).toBe('unchanged');
    const moved = withMcpServer(same, 'working-notes', { command: '/elsewhere/wnotes', args: ['mcp'] });
    expect(moved.ok && moved.value.change).toBe('updated');
  });

  it("refuses a config it can't read, rather than overwriting it", () => {
    expect(withMcpServer('{ nope', 'working-notes', entry).ok).toBe(false);
    expect(withMcpServer('[]', 'working-notes', entry).ok).toBe(false);
    expect(withMcpServer('{"mcpServers": 3}', 'working-notes', entry).ok).toBe(false);
  });
});
