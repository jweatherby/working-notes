// Integration test setup. Runs before each test file: wipes the test data
// directory, lets the real bootstrap create the notebook layout and migrate the
// database, adds an empty second notebook, and seeds the first.

import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, afterAll } from 'vitest';
import { settings } from '../../src/shared/settings/server/index.server';
import { ensureDatabase } from '../../src/shared/db/bootstrap.server';
import { getNotebookStore } from '../../src/shared/notebooks/current.server';
import { closeRegistries, getRegistry } from '../../src/shared/registry.server';
import { OTHER_NOTEBOOK, TEST_NOTEBOOK } from './test-notebooks';

beforeAll(async () => {
  // Never wipe the real notebooks.
  if (process.env.APP_ENV !== 'test' || resolve(settings.dataDir) !== resolve('data/test')) {
    throw new Error(`Integration tests must run with APP_ENV=test (data dir was ${settings.dataDir})`);
  }
  rmSync(settings.dataDir, { recursive: true, force: true });
  await ensureDatabase(TEST_NOTEBOOK);
  await getNotebookStore().create({ id: OTHER_NOTEBOOK, name: 'Other', createdAt: new Date().toISOString() });

  await getRegistry(TEST_NOTEBOOK).prisma.person.createMany({
    data: [
      { id: 'person_alice', name: 'Alice Johnson', email: 'alice@example.com' },
      { id: 'person_bob', name: 'Bob Smith', email: 'bob@example.com' },
      { id: 'person_carol', name: 'Carol Lee' }
    ]
  });
});

afterAll(async () => {
  await closeRegistries();
});
