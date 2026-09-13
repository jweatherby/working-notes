// Integration test setup. Runs before each test file: wipes the test data
// directory, creates the database through the real migrator, and seeds it.

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, afterAll } from 'vitest';
import { settings } from '../../src/shared/settings/server/index.server';
import { ensureDatabase } from '../../src/shared/db/bootstrap.server';
import { getRegistry } from '../../src/shared/registry.server';

beforeAll(async () => {
  // Never wipe the real notebook.
  if (process.env.APP_ENV !== 'test' || resolve(settings.dataDir) !== resolve('data/test')) {
    throw new Error(`Integration tests must run with APP_ENV=test (data dir was ${settings.dataDir})`);
  }
  rmSync(settings.dataDir, { recursive: true, force: true });
  await ensureDatabase();

  await getRegistry().prisma.person.createMany({
    data: [
      { id: 'person_alice', name: 'Alice Johnson', email: 'alice@example.com' },
      { id: 'person_bob', name: 'Bob Smith', email: 'bob@example.com' },
      { id: 'person_carol', name: 'Carol Lee' }
    ]
  });
});

afterAll(async () => {
  await getRegistry().prisma.$disconnect();
});
