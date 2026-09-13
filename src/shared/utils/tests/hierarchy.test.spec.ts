import { describe, it, expect } from 'vitest';
import { buildTree, flattenTree, wouldCreateCycle } from '../hierarchy';

const parentsOf = (map: Readonly<Record<string, string | null>>) => (id: string) => map[id];

describe('wouldCreateCycle', () => {
  const tree = { a: null, b: 'a', c: 'b', d: null };

  it('allows a parent outside the subtree', () => {
    expect(wouldCreateCycle(parentsOf(tree), 'b', 'd')).toBe(false);
  });

  it('rejects the item itself', () => {
    expect(wouldCreateCycle(parentsOf(tree), 'b', 'b')).toBe(true);
  });

  it('rejects a descendant', () => {
    expect(wouldCreateCycle(parentsOf(tree), 'a', 'c')).toBe(true);
  });

  it('always allows clearing the parent', () => {
    expect(wouldCreateCycle(parentsOf(tree), 'a', null)).toBe(false);
  });

  it('stops on a loop that does not include the item', () => {
    expect(wouldCreateCycle(parentsOf({ x: 'y', y: 'x', a: null }), 'a', 'x')).toBe(false);
  });
});

describe('buildTree', () => {
  it('nests children under their parents in order, with orphans as roots', () => {
    const items = [
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
      { id: 'd', parentId: 'missing' },
      { id: 'e', parentId: 'a' }
    ];
    const rows = flattenTree(buildTree(items, (i) => i.parentId)).map((n) => [n.item.id, n.depth]);
    expect(rows).toEqual([['a', 0], ['b', 1], ['c', 2], ['e', 1], ['d', 0]]);
  });

  it('keeps items caught in a parent cycle', () => {
    const items = [{ id: 'x', parentId: 'y' }, { id: 'y', parentId: 'x' }];
    const ids = flattenTree(buildTree(items, (i) => i.parentId)).map((n) => n.item.id);
    expect([...ids].sort()).toEqual(['x', 'y']);
  });
});
