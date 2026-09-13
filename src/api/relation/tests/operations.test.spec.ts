import { describe, it, expect, vi } from 'vitest';
import { createTestRegistry } from '$shared/registry.test';
import type { Registry } from '$shared/registry';
import type { RelationItem } from '$shared/types/relations';
import { addRelation, groupRelations, removeRelation } from '../operations';

const item = (overrides: Partial<RelationItem>): RelationItem => ({
  id: 'rel',
  kind: 'RELATED',
  direction: 'outgoing',
  label: 'Related to',
  other: { entityType: 'TEAM', entityId: 't1', label: 'Payments', path: '/app/teams/t1' },
  note: null,
  createdAt: new Date(0),
  ...overrides
});

describe('groupRelations', () => {
  it('orders groups by kind, outgoing before incoming, with mentions last', () => {
    const groups = groupRelations([
      item({ id: '1', kind: 'MENTIONS', direction: 'incoming', label: 'Mentioned in' }),
      item({ id: '2', kind: 'OWNS', direction: 'incoming', label: 'Owned by' }),
      item({ id: '3', kind: 'USES', direction: 'outgoing', label: 'Uses' }),
      item({ id: '4', kind: 'OWNS', direction: 'outgoing', label: 'Owns' }),
      item({ id: '5', kind: 'OWNS', direction: 'incoming', label: 'Owned by' })
    ]);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ['Owns', ['4']],
      ['Owned by', ['2', '5']],
      ['Uses', ['3']],
      ['Mentioned in', ['1']]
    ]);
  });
});

describe('addRelation', () => {
  const input = { fromType: 'PAGE', fromId: 'p1', toType: 'TEAM', toId: 't1', kind: 'OWNS' } as const;

  it('rejects a relation from an entity to itself', async () => {
    const reg = createTestRegistry();
    const result = await addRelation(reg, { ...input, toType: 'PAGE', toId: 'p1' });
    expect(!result.ok && result.error.message).toContain('two different entities');
  });

  it('refuses MENTIONS, which come from content', async () => {
    const result = await addRelation(createTestRegistry(), { ...input, kind: 'MENTIONS' });
    expect(!result.ok && result.error.message).toContain('links in content');
  });

  it('names the end that does not exist, without writing', async () => {
    const create = vi.fn();
    const reg = createTestRegistry({
      prisma: {
        page: { findUnique: vi.fn().mockResolvedValue(null) },
        team: { findUnique: vi.fn().mockResolvedValue({ name: 'Payments' }) },
        relation: { findUnique: vi.fn(), create }
      } as unknown as Registry['prisma']
    });
    const result = await addRelation(reg, input);
    expect(!result.ok && result.error.message).toBe('PAGE p1 not found');
    expect(create).not.toHaveBeenCalled();
  });

  it('points at relation.update when the relation already exists', async () => {
    const reg = createTestRegistry({
      prisma: {
        page: { findUnique: vi.fn().mockResolvedValue({ title: 'Checkout' }) },
        team: { findUnique: vi.fn().mockResolvedValue({ name: 'Payments' }) },
        relation: { findUnique: vi.fn().mockResolvedValue({ id: 'rel_1' }), create: vi.fn() }
      } as unknown as Registry['prisma']
    });
    const result = await addRelation(reg, input);
    expect(!result.ok && result.error.message).toContain('relation rel_1');
    expect(!result.ok && result.error.message).toContain('relation.update');
  });
});

describe('removeRelation', () => {
  it('refuses to remove a MENTIONS relation', async () => {
    const del = vi.fn();
    const reg = createTestRegistry({
      prisma: {
        relation: { findUnique: vi.fn().mockResolvedValue({ id: 'rel_1', kind: 'MENTIONS' }), delete: del }
      } as unknown as Registry['prisma']
    });
    const result = await removeRelation(reg, 'rel_1');
    expect(!result.ok && result.error.message).toContain('remove the link from the content');
    expect(del).not.toHaveBeenCalled();
  });
});
