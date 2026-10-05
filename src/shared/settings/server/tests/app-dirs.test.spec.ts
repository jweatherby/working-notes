import { describe, it, expect } from 'vitest';
import { dataDirFor, logsDirFor } from '../app-dirs';

describe('dataDirFor', () => {
  it('uses Application Support on macOS', () => {
    expect(dataDirFor({ platform: 'darwin', home: '/Users/me', env: {} })).toBe('/Users/me/Library/Application Support/Wonos');
  });

  it('uses local AppData on Windows, falling back to the profile folder', () => {
    expect(dataDirFor({ platform: 'win32', home: 'C:\\Users\\me', env: { LOCALAPPDATA: 'D:\\Local' } })).toBe('D:\\Local\\Wonos');
    expect(dataDirFor({ platform: 'win32', home: 'C:\\Users\\me', env: {} })).toBe('C:\\Users\\me\\AppData\\Local\\Wonos');
  });

  it('follows XDG_DATA_HOME on Linux', () => {
    expect(dataDirFor({ platform: 'linux', home: '/home/me', env: {} })).toBe('/home/me/.local/share/wonos');
    expect(dataDirFor({ platform: 'linux', home: '/home/me', env: { XDG_DATA_HOME: '/data' } })).toBe('/data/wonos');
  });
});

describe('logsDirFor', () => {
  it('uses Library/Logs on macOS and the data folder elsewhere', () => {
    expect(logsDirFor({ platform: 'darwin', home: '/Users/me', env: {} })).toBe('/Users/me/Library/Logs/Wonos');
    expect(logsDirFor({ platform: 'win32', home: 'C:\\Users\\me', env: { LOCALAPPDATA: 'C:\\L' } })).toBe('C:\\L\\Wonos\\Logs');
    expect(logsDirFor({ platform: 'linux', home: '/home/me', env: {} })).toBe('/home/me/.local/share/wonos/logs');
  });
});
