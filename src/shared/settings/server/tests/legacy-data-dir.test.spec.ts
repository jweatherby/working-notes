import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { legacyDataDirFor } from '../app-dirs';
import { MOVED_NOTE, moveLegacyDataDir, planLegacyMove } from '../legacy-data-dir';

describe('legacyDataDirFor', () => {
  it('names the folders from before the rename', () => {
    expect(legacyDataDirFor({ platform: 'darwin', home: '/Users/me', env: {} })).toBe('/Users/me/Library/Application Support/Working Notes');
    expect(legacyDataDirFor({ platform: 'win32', home: 'C:\\Users\\me', env: { LOCALAPPDATA: 'D:\\Local' } })).toBe('D:\\Local\\Working Notes');
    expect(legacyDataDirFor({ platform: 'linux', home: '/home/me', env: {} })).toBe('/home/me/.local/share/working-notes');
  });
});

describe('planLegacyMove', () => {
  it('moves notebooks first, then everything else but old app versions', () => {
    expect(planLegacyMove(['settings.json', 'App', 'Backups', 'Notebooks', 'app-path'], [])).toEqual(['Notebooks', 'Backups', 'app-path', 'settings.json']);
  });

  it('leaves alone what the new folder already has, such as the App/ the plugin just installed', () => {
    expect(planLegacyMove(['Notebooks', 'App', 'settings.json'], ['App'])).toEqual(['Notebooks', 'settings.json']);
  });

  it('does nothing once the new folder has notebooks, or when the old one has none', () => {
    expect(planLegacyMove(['Notebooks', 'settings.json'], ['Notebooks'])).toEqual([]);
    expect(planLegacyMove(['App', MOVED_NOTE], [])).toEqual([]);
    expect(planLegacyMove([], [])).toEqual([]);
  });
});

describe('moveLegacyDataDir', () => {
  const setup = (): { legacy: string; current: string } => {
    const root = mkdtempSync(join(tmpdir(), 'wono-move-'));
    const legacy = join(root, 'Working Notes');
    mkdirSync(join(legacy, 'Notebooks', 'work'), { recursive: true });
    mkdirSync(join(legacy, 'App', '0.10.2'), { recursive: true });
    writeFileSync(join(legacy, 'Notebooks', 'work', 'notebook.json'), '{}');
    writeFileSync(join(legacy, 'settings.json'), '{"defaultNotebook":"work"}');
    return { legacy, current: join(root, 'Wonos') };
  };

  it('moves the data, keeps old app versions behind, and leaves a note', () => {
    const { legacy, current } = setup();
    expect(moveLegacyDataDir(legacy, current)).toBe(current);
    expect(existsSync(join(current, 'Notebooks', 'work', 'notebook.json'))).toBe(true);
    expect(readFileSync(join(current, 'settings.json'), 'utf8')).toContain('work');
    expect(existsSync(join(legacy, 'App', '0.10.2'))).toBe(true);
    expect(existsSync(join(legacy, 'Notebooks'))).toBe(false);
    expect(readFileSync(join(legacy, MOVED_NOTE), 'utf8')).toContain(current);
  });

  it('is a no-op the second time', () => {
    const { legacy, current } = setup();
    moveLegacyDataDir(legacy, current);
    expect(moveLegacyDataDir(legacy, current)).toBe(current);
  });

  it('uses the new folder when there is nothing to move', () => {
    const root = mkdtempSync(join(tmpdir(), 'wono-move-'));
    expect(moveLegacyDataDir(join(root, 'missing'), join(root, 'Wonos'))).toBe(join(root, 'Wonos'));
  });
});
