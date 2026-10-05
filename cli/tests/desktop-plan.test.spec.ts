import { describe, it, expect } from 'vitest';
import { claudeDesktopConfigPath, installedBinary, withMcpServer } from '../desktop-plan';

const mac = { platform: 'darwin' as const, home: '/Users/me', env: {} };
const windows = { platform: 'win32' as const, home: 'C:\\Users\\me', env: { LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local', APPDATA: 'C:\\Users\\me\\AppData\\Roaming' } };
const linux = { platform: 'linux' as const, home: '/home/me', env: {} };

describe('installedBinary', () => {
  it('points at App/current in the data folder', () => {
    expect(installedBinary(mac)).toBe('/Users/me/Library/Application Support/Wonos/App/current/wono');
    expect(installedBinary(windows)).toBe('C:\\Users\\me\\AppData\\Local\\Wonos\\App\\current\\wono.exe');
    expect(installedBinary(linux)).toBe('/home/me/.local/share/wonos/App/current/wono');
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
  const entry = { command: '/data/App/current/wono', args: ['mcp'] };

  it('adds the server to a missing or empty config', () => {
    for (const existing of [null, '', '  \n']) {
      const result = withMcpServer(existing, 'wonos', entry);
      expect(result.ok && result.value.change).toBe('added');
      expect(result.ok && JSON.parse(result.value.text)).toEqual({ mcpServers: { 'wonos': entry } });
    }
  });

  it('keeps other settings and servers', () => {
    const existing = JSON.stringify({ theme: 'dark', mcpServers: { other: { command: 'x', args: [] } } });
    const result = withMcpServer(existing, 'wonos', entry);
    expect(result.ok && JSON.parse(result.value.text)).toEqual({
      theme: 'dark',
      mcpServers: { other: { command: 'x', args: [] }, 'wonos': entry }
    });
  });

  it('reports whether anything changed', () => {
    const same = JSON.stringify({ mcpServers: { 'wonos': entry } });
    const result = withMcpServer(same, 'wonos', entry);
    expect(result.ok && result.value.change).toBe('unchanged');
    const moved = withMcpServer(same, 'wonos', { command: '/elsewhere/wono', args: ['mcp'] });
    expect(moved.ok && moved.value.change).toBe('updated');
  });

  it('replaces our server from before the rename to Wonos, and only ours', () => {
    const ours = JSON.stringify({ mcpServers: { 'working-notes': { command: '/old/App/current/wnotes', args: ['mcp'] }, wonos: entry } });
    const replaced = withMcpServer(ours, 'wonos', entry, 'working-notes');
    expect(replaced.ok && replaced.value.change).toBe('updated');
    expect(replaced.ok && JSON.parse(replaced.value.text)).toEqual({ mcpServers: { wonos: entry } });

    const theirs = JSON.stringify({ mcpServers: { 'working-notes': { command: '/usr/bin/something-else', args: [] } } });
    const kept = withMcpServer(theirs, 'wonos', entry, 'working-notes');
    expect(kept.ok && Object.keys(JSON.parse(kept.value.text).mcpServers)).toEqual(['working-notes', 'wonos']);
  });

  it("refuses a config it can't read, rather than overwriting it", () => {
    expect(withMcpServer('{ nope', 'wonos', entry).ok).toBe(false);
    expect(withMcpServer('[]', 'wonos', entry).ok).toBe(false);
    expect(withMcpServer('{"mcpServers": 3}', 'wonos', entry).ok).toBe(false);
  });
});
