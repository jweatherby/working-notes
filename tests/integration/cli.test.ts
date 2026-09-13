// The CLI as Claude uses it: bin/wnotes from another directory, no server running.

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const WNOTES = resolve('bin/wnotes');
const cwd = mkdtempSync(join(tmpdir(), 'wnotes-cli-'));

const wnotes = (...args: string[]) => {
  const r = spawnSync(WNOTES, args, { cwd, env: { ...process.env, APP_ENV: 'test' }, encoding: 'utf8' });
  let json: unknown = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    // not JSON
  }
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, json: json as { ok?: boolean; value?: Record<string, unknown>; error?: { message: string } } | null };
};

describe('wnotes CLI', () => {
  it('lists procedures, and shows a procedure\'s inputs', () => {
    const help = wnotes('help');
    expect(help.code).toBe(0);
    expect(help.stdout).toContain('report.create (mutation)');
    expect(help.stdout).not.toMatch(/\b(auth|org|forms)\./);

    const one = wnotes('help', 'todo.create');
    expect(one.stdout).toContain('--title  string  (required)');
    expect(one.stdout).toContain('--priority  integer');
  });

  it('writes without a server and keeps schema types (a numeric-looking title stays a string)', () => {
    const created = wnotes('person.create', '--name', 'Dana Park', '--title', '2024');
    expect(created.code).toBe(0);
    const id = created.json?.value?.['id'] as string;

    const person = wnotes('person.get', '--id', id);
    expect(person.json?.value?.['title']).toBe('2024');

    const led = wnotes('person.update', '--id', id, '--leadId', 'person_alice');
    expect(led.code).toBe(0);
    expect(wnotes('person.get', '--id', id).json?.value?.['leadName']).toBe('Alice Johnson');
    expect(wnotes('person.update', '--id', id, '--leadId', 'null').code).toBe(0);
    expect(wnotes('person.get', '--id', id).json?.value?.['leadName']).toBeNull();
  });

  it('reads long content from files relative to the caller, and reports chart errors by line', () => {
    writeFileSync(join(cwd, 'good.md'), ['# Q3', '', '```chart', '{"type":"bar","labels":["a","b"],"series":[{"values":[1,2]}]}', '```'].join('\n'));
    writeFileSync(join(cwd, 'bad.md'), ['# Q3', '', '```chart', '{"type":"bar","labels":["a","b","c"],"series":[{"values":[1,2]}]}', '```'].join('\n'));

    const good = wnotes('report.create', '--entityType', 'PERSON', '--entityId', 'person_alice', '--title', 'Q3', '--content-file', 'good.md');
    expect(good.code).toBe(0);
    expect(good.json?.ok).toBe(true);

    const bad = wnotes('report.create', '--entityType', 'PERSON', '--entityId', 'person_alice', '--title', 'Q3', '--content-file', 'bad.md');
    expect(bad.code).toBe(1);
    expect(bad.json?.error?.message).toContain('chart block at line 3');
  });

  it('explains bad invocations on stderr with exit code 1', () => {
    const typo = wnotes('person.create', '--nmae', 'Dana');
    expect(typo.code).toBe(1);
    expect(typo.stderr).toContain('Unknown option --nmae');

    const missing = wnotes('person.create', '--title', 'Engineer');
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain('--name');

    const unknown = wnotes('people.list');
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toContain('Unknown procedure');
  });
});
