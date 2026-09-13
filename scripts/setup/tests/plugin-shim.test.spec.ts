// The plugin's `wnotes` shim: runs a clone, or installs and runs a release's standalone
// binary, or explains how to set up.

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readlinkSync, statSync, writeFileSync } from 'node:fs';
import { platform, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SHIM = resolve('plugin/scripts/wnotes');
const TARGET = `${process.platform}-${process.arch === 'arm64' ? 'arm64' : 'x64'}`;

const fakeApp = (withDeps = true): string => {
  const app = mkdtempSync(join(tmpdir(), 'wnotes-app-'));
  mkdirSync(join(app, 'bin'));
  writeFileSync(join(app, 'bin', 'wnotes'), '#!/bin/sh\nfor a in "$@"; do printf "%s\\n" "$a"; done\n');
  chmodSync(join(app, 'bin', 'wnotes'), 0o755);
  if (withDeps) mkdirSync(join(app, 'node_modules'));
  return app;
};

/** A built plugin: the shim plus server/ with a binary for this computer. The binary has no execute bit, like one from a zip. */
const fakeRelease = (version: string): string => {
  const plugin = mkdtempSync(join(tmpdir(), 'wnotes-plugin-'));
  mkdirSync(join(plugin, 'scripts'));
  copyFileSync(SHIM, join(plugin, 'scripts', 'wnotes'));
  const server = join(plugin, 'server');
  mkdirSync(join(server, 'client', '_app'), { recursive: true });
  mkdirSync(join(server, 'migrations'));
  writeFileSync(join(server, `wnotes-${TARGET}`), '#!/bin/sh\necho "release $0"\nfor a in "$@"; do printf "%s\\n" "$a"; done\n');
  writeFileSync(join(server, 'VERSION'), `${version}\n`);
  return plugin;
};

const dataDirFor = (home: string): string =>
  platform() === 'darwin' ? join(home, 'Library', 'Application Support', 'Working Notes') : join(home, '.local', 'share', 'working-notes');

const newHome = (): string => mkdtempSync(join(tmpdir(), 'wnotes-home-'));

const run = (env: Record<string, string>, ...args: string[]) => runShim(SHIM, env, ...args);

const runShim = (shim: string, env: Record<string, string>, ...args: string[]) => {
  const home = env['HOME'] ?? newHome();
  return spawnSync('sh', [shim, ...args], { env: { PATH: process.env.PATH ?? '', HOME: home, ...env }, encoding: 'utf8' });
};

const recordClone = (home: string, app: string): void => {
  mkdirSync(dataDirFor(home), { recursive: true });
  writeFileSync(join(dataDirFor(home), 'app-path'), app);
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
    const home = newHome();
    recordClone(home, fakeApp());
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

  it('installs a release binary into the data directory and runs it, when there is no clone', () => {
    const home = newHome();
    const plugin = fakeRelease('9.9.9');
    const r = runShim(join(plugin, 'scripts', 'wnotes'), { HOME: home }, 'person.list', '--name', 'two words');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);

    const installed = join(dataDirFor(home), 'App', '9.9.9');
    expect(r.stdout).toBe(`release ${join(installed, 'wnotes')}\nperson.list\n--name\ntwo words\n`);
    expect(statSync(join(installed, 'wnotes')).mode & 0o111).not.toBe(0);
    expect(existsSync(join(installed, 'client', '_app'))).toBe(true);
    expect(existsSync(join(installed, 'migrations'))).toBe(true);
    expect(readlinkSync(join(dataDirFor(home), 'App', 'current'))).toBe('9.9.9');

    // An update installs alongside and repoints App/current.
    const next = runShim(join(fakeRelease('9.9.10'), 'scripts', 'wnotes'), { HOME: home }, 'help');
    expect(next.status).toBe(0);
    expect(readlinkSync(join(dataDirFor(home), 'App', 'current'))).toBe('9.9.10');
  });

  it('prefers a clone set up on this computer over the release binary, unless the clone is gone', () => {
    const home = newHome();
    const plugin = fakeRelease('9.9.9');
    recordClone(home, fakeApp());
    expect(runShim(join(plugin, 'scripts', 'wnotes'), { HOME: home }, 'person.list').stdout).toBe('person.list\n');

    recordClone(home, '/nonexistent/working-notes');
    expect(runShim(join(plugin, 'scripts', 'wnotes'), { HOME: home }, 'person.list').stdout).toContain('release ');
  });

  it('keeps the plugin free of a top-level bin/, which claude.ai-hosted plugins reject', () => {
    expect(existsSync(resolve('plugin/bin'))).toBe(false);
  });
});
