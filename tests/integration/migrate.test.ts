// The in-process migrator against real SQLite files, independent of the app database.

import { describe, it, expect } from 'vitest';
import { appendFileSync, cpSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import type { Logger } from '../../src/shared/types/logger';
import { applyMigrations, checksum } from '../../src/shared/db/migrate.server';

const quiet = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as unknown as Logger;
const onDisk = readdirSync('prisma/migrations', { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();

const freshDb = () => {
  const dir = mkdtempSync(join(tmpdir(), 'wnotes-migrate-'));
  return { dir, client: createClient({ url: `file:${join(dir, 'db.sqlite')}` }) };
};

describe('applyMigrations', () => {
  it('migrates a fresh database and records rows Prisma can read', async () => {
    const { client } = freshDb();
    const result = await applyMigrations(client, 'prisma/migrations', quiet);
    expect(result.ok && result.value.applied).toEqual(onDisk);

    const rows = await client.execute('SELECT migration_name, checksum, finished_at, applied_steps_count FROM _prisma_migrations ORDER BY migration_name');
    expect(rows.rows.map((r) => r[0])).toEqual(onDisk);
    const first = rows.rows[0]!;
    expect(first[1]).toBe(checksum(readFileSync(join('prisma/migrations', onDisk[0]!, 'migration.sql'), 'utf8')));
    expect(first[2]).not.toBeNull();
    expect(Number(first[3])).toBe(1);

    const tables = (await client.execute("SELECT name FROM sqlite_master WHERE type = 'table'")).rows.map((r) => r[0]);
    expect(tables).toEqual(expect.arrayContaining(['person', 'team', 'report', 'branding']));
    client.close();
  });

  it('applies nothing the second time', async () => {
    const { client } = freshDb();
    await applyMigrations(client, 'prisma/migrations', quiet);
    const again = await applyMigrations(client, 'prisma/migrations', quiet);
    expect(again.ok && again.value.applied).toEqual([]);
    client.close();
  });

  it('refuses a migration edited after it was applied', async () => {
    const { dir, client } = freshDb();
    const migrations = join(dir, 'migrations');
    cpSync('prisma/migrations', migrations, { recursive: true });
    await applyMigrations(client, migrations, quiet);

    appendFileSync(join(migrations, onDisk[0]!, 'migration.sql'), '\n-- edited later\n');
    const result = await applyMigrations(client, migrations, quiet);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('modified after it was applied');
    client.close();
  });
});
