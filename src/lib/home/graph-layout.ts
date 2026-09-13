// Small deterministic force-directed layout (no dependency).

export interface LayoutNode {
  readonly id: string;
}

export interface LayoutEdge {
  readonly source: string;
  readonly target: string;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Mulberry32: seeded PRNG so the same data always lays out the same way. */
const seeded = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const layoutGraph = (
  nodes: readonly LayoutNode[],
  edges: readonly LayoutEdge[],
  width: number,
  height: number,
  iterations = 300,
  padding = 40
): ReadonlyMap<string, Point> => {
  const rand = seeded(nodes.length * 7919 + edges.length);
  const pos = nodes.map(() => ({ x: width / 2 + (rand() - 0.5) * width * 0.6, y: height / 2 + (rand() - 0.5) * height * 0.6 }));
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const links = edges
    .map((e) => [index.get(e.source), index.get(e.target)] as const)
    .filter((l): l is readonly [number, number] => l[0] !== undefined && l[1] !== undefined);

  const n = nodes.length;
  const k = Math.sqrt(((width - 2 * padding) * (height - 2 * padding)) / Math.max(n, 1)) * 0.8;

  for (let iter = 0; iter < iterations; iter++) {
    const temp = (1 - iter / iterations) * width * 0.1 + 1;
    const disp = pos.map(() => ({ x: 0, y: 0 }));

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[i]!.x - pos[j]!.x || 0.01;
        const dy = pos[i]!.y - pos[j]!.y || 0.01;
        const dist = Math.max(Math.hypot(dx, dy), 0.01);
        const force = (k * k) / dist;
        disp[i]!.x += (dx / dist) * force;
        disp[i]!.y += (dy / dist) * force;
        disp[j]!.x -= (dx / dist) * force;
        disp[j]!.y -= (dy / dist) * force;
      }
    }

    for (const [a, b] of links) {
      const dx = pos[a]!.x - pos[b]!.x;
      const dy = pos[a]!.y - pos[b]!.y;
      const dist = Math.max(Math.hypot(dx, dy), 0.01);
      const force = (dist * dist) / k;
      disp[a]!.x -= (dx / dist) * force;
      disp[a]!.y -= (dy / dist) * force;
      disp[b]!.x += (dx / dist) * force;
      disp[b]!.y += (dy / dist) * force;
    }

    for (let i = 0; i < n; i++) {
      // Gentle gravity keeps disconnected components on screen.
      disp[i]!.x += (width / 2 - pos[i]!.x) * 0.05;
      disp[i]!.y += (height / 2 - pos[i]!.y) * 0.05;
      const len = Math.max(Math.hypot(disp[i]!.x, disp[i]!.y), 0.01);
      const step = Math.min(len, temp);
      pos[i]!.x = Math.min(width - padding, Math.max(padding, pos[i]!.x + (disp[i]!.x / len) * step));
      pos[i]!.y = Math.min(height - padding, Math.max(padding, pos[i]!.y + (disp[i]!.y / len) * step));
    }
  }

  return new Map(nodes.map((node, i) => [node.id, { x: pos[i]!.x, y: pos[i]!.y }]));
};
