// Database bootstrap: create the data directory, apply pending migrations and
// configure SQLite for concurrent use. Runs at server start (hooks `init`), at
// the start of every CLI and backup command, and in integration test setup.

import { mkdirSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { settings } from '$shared/settings/server/index.server';
import { databaseUrl, migrationsDir } from '$shared/settings/server/paths';
import { getRegistry } from '$shared/registry.server';
import { applyMigrations } from './migrate.server';

/** Apply migrations and enable WAL. Not memoised: use after replacing the database file. */
export const migrateDatabase = async (): Promise<void> => {
  mkdirSync(settings.dataDir, { recursive: true });
  const client = createClient({ url: databaseUrl(settings) });
  try {
    // WAL is persistent: the app, the CLI and backups can then read and write concurrently.
    await client.execute('PRAGMA journal_mode = WAL');
    const result = await applyMigrations(client, migrationsDir(), getRegistry().logger);
    if (!result.ok) throw new Error(`Database migration failed: ${result.error.message}`);
  } finally {
    client.close();
  }
};

let ready: Promise<void> | undefined;

/** Idempotent per process. Startup infrastructure: throws if the database can't be prepared. */
export const ensureDatabase = (): Promise<void> => {
  ready ??= migrateDatabase().then(async () => {
    await getRegistry().prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000');
  });
  return ready;
};
