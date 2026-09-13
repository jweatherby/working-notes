import { describe, it, expect } from 'vitest';
import { layoutGraph } from '../graph-layout';
import { timeAgo } from '../utils';

describe('layoutGraph', () => {
  const nodes = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
  const edges = [
    { source: 'a', target: 'b' },
    { source: 'b', target: 'c' },
    { source: 'x', target: 'a' }
  ];

  it('keeps every node inside the padded bounds', () => {
    const pos = layoutGraph(nodes, edges, 400, 300, 200, 20);
    expect(pos.size).toBe(5);
    for (const p of pos.values()) {
      expect(p.x).toBeGreaterThanOrEqual(20);
      expect(p.x).toBeLessThanOrEqual(380);
      expect(p.y).toBeGreaterThanOrEqual(20);
      expect(p.y).toBeLessThanOrEqual(280);
    }
  });

  it('is deterministic', () => {
    expect([...layoutGraph(nodes, edges, 400, 300)]).toEqual([...layoutGraph(nodes, edges, 400, 300)]);
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-09-12T12:00:00Z');
  it('formats relative times', () => {
    expect(timeAgo(new Date('2026-09-12T11:59:30Z'), now)).toBe('just now');
    expect(timeAgo(new Date('2026-09-12T11:55:00Z'), now)).toBe('5m ago');
    expect(timeAgo(new Date('2026-09-12T09:00:00Z'), now)).toBe('3h ago');
    expect(timeAgo('2026-09-10T12:00:00Z', now)).toBe('2d ago');
  });
});
