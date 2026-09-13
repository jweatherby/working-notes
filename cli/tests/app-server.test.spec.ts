import { describe, it, expect } from 'vitest';
import { staticFilePath } from '../app-server';
import { appLaunchCommand, appUrl } from '../app-launch';

describe('staticFilePath', () => {
  it('maps a request path to a file inside the client folder', () => {
    expect(staticFilePath('/opt/wn/client', '/_app/immutable/entry/start.js')).toBe('/opt/wn/client/_app/immutable/entry/start.js');
    expect(staticFilePath('/opt/wn/client', '/favicon%20copy.png')).toBe('/opt/wn/client/favicon copy.png');
  });

  it('refuses the folder itself, paths that escape it, and malformed paths', () => {
    for (const path of ['/', '/../secret', '/%2e%2e/secret', '/_app/../../secret', '/%E0%A4%A', '/a%00b']) {
      expect(staticFilePath('/opt/wn/client', path)).toBeNull();
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
