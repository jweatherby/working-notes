// The plugin's `wnotes` shim: finds the user's clone, or explains how to set it up.

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { platform, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SHIM = resolve('plugin/bin/wnotes');

const fakeApp = (withDeps = true): string => {
  const app = mkdtempSync(join(tmpdir(), 'wnotes-app-'));
  mkdirSync(join(app, 'bin'));
  writeFileSync(join(app, 'bin', 'wnotes'), '#!/bin/sh\nfor a in "$@"; do printf "%s\\n" "$a"; done\n');
  chmodSync(join(app, 'bin', 'wnotes'), 0o755);
  if (withDeps) mkdirSync(join(app, 'node_modules'));
  return app;
};

const run = (env: Record<string, string>, ...args: string[]) => {
  const home = env['HOME'] ?? mkdtempSync(join(tmpdir(), 'wnotes-home-'));
  return spawnSync('sh', [SHIM, ...args], { env: { PATH: process.env.PATH ?? '', HOME: home, ...env }, encoding: 'utf8' });
};

describe('plugin wnotes shim', () => {
  it('explains how to set up when no clone is configured', () => {
    const r = run({}, 'help');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("Working Notes isn't set up on this computer");
    expect(r.stderr).toContain('bun run setup');
  });

  it('passes arguments through unchanged to WORKING_NOTES_HOME', () => {
    const r = run({ WORKING_NOTES_HOME: fakeApp() }, 'note.add', '--content', 'two words', '--title', "it's");
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("note.add\n--content\ntwo words\n--title\nit's\n");
  });

  it('reads the clone from the app-path file that setup writes', () => {
    const home = mkdtempSync(join(tmpdir(), 'wnotes-home-'));
    const dataDir = platform() === 'darwin' ? join(home, 'Library', 'Application Support', 'Working Notes') : join(home, '.local', 'share', 'working-notes');
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, 'app-path'), fakeApp());
    const r = run({ HOME: home }, 'person.list');
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('person.list\n');
  });

  it('says so when the clone is gone or has no dependencies', () => {
    const gone = run({ WORKING_NOTES_HOME: '/nonexistent/working-notes' });
    expect(gone.status).toBe(1);
    expect(gone.stderr).toContain("isn't at /nonexistent/working-notes");

    const app = fakeApp(false);
    const noDeps = run({ WORKING_NOTES_HOME: app });
    expect(noDeps.status).toBe(1);
    expect(noDeps.stderr).toContain(`Run \`bun install\` in ${app}`);
  });
});
