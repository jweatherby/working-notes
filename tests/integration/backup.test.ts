// Snapshots and restore against the test data directory (APP_ENV=test → ./data/test).

import { describe, it, expect } from 'vitest';
import { statSync } from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
import { once } from 'node:events';
import { join } from 'node:path';
import { getRegistry } from '../../src/shared/registry.server';
import { createSnapshot, listSnapshots } from '../../scripts/backup/snapshot';
import { restoreSnapshot } from '../../scripts/backup/restore';

const at = (second: number): Date => new Date(Date.UTC(2026, 8, 12, 12, 0, second));
const CLOSED_PORT = 9; // discard port: nothing listens on it locally

describe('backups', () => {
  it('snapshots only when data changes, hard-links unchanged files, and restores data and files', async () => {
    const reg = getRegistry();

    const first = await createSnapshot({ now: at(0), reason: 'test' });
    expect(first.status).toBe('created');
    expect(first.snapshot?.manifest.counts['person']).toBe(3);

    const unchanged = await createSnapshot({ now: at(1) });
    expect(unchanged.status).toBe('unchanged');
    expect(unchanged.snapshot?.id).toBe(first.snapshot?.id);

    await reg.prisma.person.create({ data: { id: 'person_dana', name: 'Dana Park' } });
    await reg.storage.putObject('docs/d1/source-a.pdf', new TextEncoder().encode('%PDF-1.4 test'), 'application/pdf');
    const changed = await createSnapshot({ now: at(2) });
    expect(changed.status).toBe('created');
    expect(changed.snapshot?.manifest.counts['person']).toBe(4);
    expect(changed.snapshot?.manifest.files.map((f) => f.path)).toEqual(['docs/d1/source-a.pdf']);

    const forced = await createSnapshot({ now: at(3), force: true, reason: 'forced' });
    expect(forced.status).toBe('created');
    expect(statSync(join(forced.snapshot!.path, 'files', 'docs/d1/source-a.pdf')).nlink).toBeGreaterThanOrEqual(2);

    // Lose the new person and the file, then restore the snapshot that had them.
    await reg.prisma.person.delete({ where: { id: 'person_dana' } });
    await reg.storage.deleteObject('docs/d1/source-a.pdf');

    const restored = await restoreSnapshot(changed.snapshot!.id, { appPort: CLOSED_PORT, now: at(4) });
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;

    expect(await reg.prisma.person.findUnique({ where: { id: 'person_dana' } })).not.toBeNull();
    expect(await reg.storage.readObject('docs/d1/source-a.pdf')).not.toBeNull();

    const snapshots = await listSnapshots();
    const safety = snapshots.find((s) => s.id === restored.value.safetySnapshot);
    expect(safety?.manifest.reason).toContain('pre-restore');
    expect(safety?.manifest.counts['person']).toBe(3);
  });

  it('refuses to restore while the app port is in use', async () => {
    const server = createServer().listen(0, '127.0.0.1');
    await once(server, 'listening');
    const { port } = server.address() as AddressInfo;
    try {
      const result = await restoreSnapshot('latest', { appPort: port });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.message).toContain('running');
    } finally {
      server.close();
    }
  });
});
