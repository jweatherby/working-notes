import { describe, it, expect } from 'vitest';
import { focusHeight, layoutFocus } from '../focus-layout';
import { timeAgo } from '../utils';

describe('layoutFocus', () => {
  const groups = [{ size: 1 }, { size: 5 }, { size: 9 }];

  it('places every pill inside the canvas, and the focus in the middle', () => {
    const layout = layoutFocus(groups, 1000, 560);
    expect(layout.centre).toEqual({ x: 500, y: 280 });
    expect(layout.nodes.map((g) => g.length)).toEqual([1, 5, 9]);
    for (const p of [...layout.nodes.flat(), ...layout.labels]) {
      expect(p.x).toBeGreaterThanOrEqual(90);
      expect(p.x).toBeLessThanOrEqual(910);
      expect(p.y).toBeGreaterThanOrEqual(36);
      expect(p.y).toBeLessThanOrEqual(524);
    }
  });

  it('starts at the top and gives each group its own slice', () => {
    const layout = layoutFocus([{ size: 1 }, { size: 1 }], 1000, 560);
    expect(layout.nodes[0]?.[0]?.x).toBeCloseTo(500);
    expect(layout.nodes[0]?.[0]?.y).toBeLessThan(280);
    expect(layout.nodes[1]?.[0]?.y).toBeGreaterThan(280);
  });

  it('is deterministic', () => {
    expect(layoutFocus(groups, 1000, 560)).toEqual(layoutFocus(groups, 1000, 560));
  });

  it('handles no groups', () => {
    expect(layoutFocus([], 1000, 560).nodes).toEqual([]);
  });
});

describe('focusHeight', () => {
  it('grows with the number of pills, up to a limit', () => {
    expect(focusHeight(3)).toBe(390);
    expect(focusHeight(10)).toBe(520);
    expect(focusHeight(30)).toBeGreaterThan(520);
    expect(focusHeight(500)).toBe(910);
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
