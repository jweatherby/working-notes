// The CLI as Claude uses it: bin/wono from another directory, no server running.

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { features } from '$shared/settings/base/features';

const WONO = resolve('bin/wono');
const cwd = mkdtempSync(join(tmpdir(), 'wono-cli-'));

const wono = (...args: string[]) => {
  const r = spawnSync(WONO, args, { cwd, env: { ...process.env, APP_ENV: 'test' }, encoding: 'utf8' });
  let json: unknown = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    // not JSON
  }
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, json: json as { ok?: boolean; value?: Record<string, unknown>; error?: { message: string } } | null };
};

describe('wono CLI', () => {
  it('lists procedures, and shows a procedure\'s inputs', () => {
    const help = wono('help');
    expect(help.code).toBe(0);
    expect(help.stdout).toContain('page.create (mutation)');
    // report.* stays out of the CLI while reports are switched off.
    expect(help.stdout.includes('report.create (mutation)')).toBe(features.reports);
    expect(help.stdout).not.toMatch(/\b(auth|org|forms)\./);

    const one = wono('help', 'todo.create');
    expect(one.stdout).toContain('--title  string  (required)');
    expect(one.stdout).toContain('--priority  integer');
  });

  it('writes without a server and keeps schema types (a numeric-looking title stays a string)', () => {
    const created = wono('person.create', '--name', 'Dana Park', '--title', '2024');
    expect(created.code).toBe(0);
    const id = created.json?.value?.['id'] as string;

    const person = wono('person.get', '--id', id);
    expect(person.json?.value?.['title']).toBe('2024');

    const led = wono('person.update', '--id', id, '--leadId', 'person_alice');
    expect(led.code).toBe(0);
    expect(wono('person.get', '--id', id).json?.value?.['leadName']).toBe('Alice Johnson');
    expect(wono('person.update', '--id', id, '--leadId', 'null').code).toBe(0);
    expect(wono('person.get', '--id', id).json?.value?.['leadName']).toBeNull();
  });

  it('reads long content from files relative to the caller, and reports chart errors by line', () => {
    writeFileSync(join(cwd, 'good.md'), ['# Q3', '', '```chart', '{"type":"bar","labels":["a","b"],"series":[{"values":[1,2]}]}', '```'].join('\n'));
    writeFileSync(join(cwd, 'bad.md'), ['# Q3', '', '```chart', '{"type":"bar","labels":["a","b","c"],"series":[{"values":[1,2]}]}', '```'].join('\n'));

    const good = wono('page.create', '--title', 'Q3 velocity', '--content-file', 'good.md');
    expect(good.code).toBe(0);
    expect(good.json?.ok).toBe(true);

    const bad = wono('page.create', '--title', 'Q3 velocity draft', '--content-file', 'bad.md');
    expect(bad.code).toBe(1);
    expect(bad.json?.error?.message).toContain('chart block at line 3');
  });

  it('uses the default notebook unless --notebook names another', () => {
    const listed = wono('notebook.list');
    expect(listed.code).toBe(0);
    const notebooks = listed.json?.value as unknown as Array<{ id: string; isDefault: boolean }>;
    expect(notebooks.map((n) => [n.id, n.isDefault])).toEqual([['notebook', true], ['other', false]]);

    expect(wono('person.create', '--name', 'Ola Other', '--notebook', 'other').code).toBe(0);
    const names = (...args: string[]) => (wono('person.list', ...args).json?.value as unknown as Array<{ name: string }>).map((p) => p.name);
    expect(names('--notebook=other')).toEqual(['Ola Other']);
    expect(names()).not.toContain('Ola Other');

    const unknown = wono('person.list', '--notebook', 'nope');
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toContain('There is no notebook "nope"');
  });

  it('explains bad invocations on stderr with exit code 1', () => {
    const typo = wono('person.create', '--nmae', 'Dana');
    expect(typo.code).toBe(1);
    expect(typo.stderr).toContain('Unknown option --nmae');

    const missing = wono('person.create', '--title', 'Engineer');
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain('--name');

    const unknown = wono('people.list');
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toContain('Unknown procedure');
  });
});
