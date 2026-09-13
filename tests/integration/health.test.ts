// Sample integration test. Runs against a real Postgres DB (see setup.ts).

import { describe, it, expect } from 'vitest';
import { getRegistry } from '../../src/shared/registry.server';
import { getStatus } from '../../src/api/health/operations';

describe('health integration', () => {
  it('reports database up against a real DB', async () => {
    const reg = getRegistry();
    const status = await getStatus(reg);
    expect(status.ok).toBe(true);
    expect(status.database).toBe('up');
  });
});
