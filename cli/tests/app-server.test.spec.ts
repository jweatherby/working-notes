import { describe, it, expect } from 'vitest';
import { appControl, staticFile } from '../app-server';
import { appLaunchCommand, appUrl, isWorkingNotesCommand, planAppLaunch } from '../app-launch';

describe('isWorkingNotesCommand', () => {
  it('recognises a release binary and a clone’s dev server', () => {
    expect(isWorkingNotesCommand('/Users/me/Library/Application Support/Working Notes/App/0.6.7/wnotes app')).toBe(true);
    expect(isWorkingNotesCommand('node /Users/me/code/working-notes/node_modules/.bin/vite dev')).toBe(true);
  });

  it('refuses anything else on the port', () => {
    expect(isWorkingNotesCommand('node /Users/me/code/other-app/node_modules/.bin/vite dev')).toBe(false);
    expect(isWorkingNotesCommand('')).toBe(false);
  });
});

describe('appControl', () => {
  const stop = (host: string, headers: Record<string, string> = { 'x-working-notes': '1' }, method = 'POST') =>
    appControl(new Request(`http://${host}/__wnotes/app/stop`, { method, headers }), '1.2.3');

  it('reports the version', () => {
    expect(appControl(new Request('http://127.0.0.1:5173/__wnotes/app'), '1.2.3')).toEqual({ kind: 'version', body: { version: '1.2.3' } });
  });

  it('stops only for a loopback POST with the local header', () => {
    expect(stop('127.0.0.1:5173')).toEqual({ kind: 'stop' });
    expect(stop('localhost:5173')).toEqual({ kind: 'stop' });
    expect(stop('evil.example:5173')).toEqual({ kind: 'forbidden' });
    expect(stop('127.0.0.1:5173', {})).toEqual({ kind: 'forbidden' });
    expect(stop('127.0.0.1:5173', { 'x-working-notes': '1' }, 'GET')).toEqual({ kind: 'forbidden' });
  });

  it('leaves every other request to the app', () => {
    expect(appControl(new Request('http://127.0.0.1:5173/app'), '1.2.3')).toBeNull();
  });
});

describe('planAppLaunch', () => {
  const release = { standalone: true, version: '0.7.0' };

  it('starts when nothing is running', () => {
    expect(planAppLaunch(null, release)).toBe('start');
  });

  it('reuses the same version and restarts a different one', () => {
    expect(planAppLaunch({ version: '0.7.0' }, release)).toBe('reuse');
    expect(planAppLaunch({ version: '0.6.5' }, release)).toBe('restart');
  });

  it('leaves alone what it cannot identify, and a clone never restarts', () => {
    expect(planAppLaunch('other', release)).toBe('reuse');
    expect(planAppLaunch({ version: '0.6.5' }, { standalone: false, version: '0.7.0' })).toBe('reuse');
  });
});

describe('staticFile', () => {
  const files = new Map([
    ['/_app/immutable/entry/start.js', '/$bunfs/root/start-a1.js'],
    ['/favicon copy.png', '/$bunfs/root/favicon copy-b2.png']
  ]);

  it('finds the embedded file a request path names', () => {
    expect(staticFile(files, '/_app/immutable/entry/start.js')).toBe('/$bunfs/root/start-a1.js');
    expect(staticFile(files, '/favicon%20copy.png')).toBe('/$bunfs/root/favicon copy-b2.png');
  });

  it('refuses anything that isn’t an embedded file, and malformed paths', () => {
    for (const path of ['/', '/../secret', '/%2e%2e/secret', '/_app/../_app/immutable/entry/start.js', '/%E0%A4%A', '/a%00b']) {
      expect(staticFile(files, path)).toBeNull();
    }
  });
});

describe('app launch', () => {
  it('runs the release binary, or the clone’s bin/wnotes', () => {
    expect(appLaunchCommand({ standalone: true, execPath: '/data/App/0.5.0/wnotes', repoDir: '/repo' })).toEqual({ command: '/data/App/0.5.0/wnotes', args: ['app'] });
    expect(appLaunchCommand({ standalone: false, execPath: '/opt/homebrew/bin/bun', repoDir: '/repo' })).toEqual({ command: '/repo/bin/wnotes', args: ['app'] });
  });

  it('links to a notebook', () => {
    expect(appUrl(null)).toBe('http://127.0.0.1:5173/app');
    expect(appUrl('work-work')).toBe('http://127.0.0.1:5173/app?notebook=work-work');
  });
});
