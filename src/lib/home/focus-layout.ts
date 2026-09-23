// Layout for the home focus graph: the focus in the middle, and each group of
// neighbours in its own slice of an ellipse around it, clockwise from the top.
// A slice is as wide as its share of the nodes. With many nodes, alternate ones
// step inwards so their labels don't collide. Pure and deterministic.

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface LayoutGroup {
  /** Pills in the group, "+N more" included. */
  readonly size: number;
}

export interface FocusLayout {
  readonly centre: Point;
  /** Per group, one point per pill, in order. */
  readonly nodes: readonly (readonly Point[])[];
  /** Where each group's label goes: halfway out along the middle of its slice. */
  readonly labels: readonly Point[];
}

/** Pills before the rings stagger. */
const STAGGER_FROM = 12;

/** The widest angle between neighbouring pills in a group. */
const MAX_SPREAD = (Math.PI * 2) / 16;

/** A taller canvas for a busy focus, so pills keep their spacing. */
export const focusHeight = (pills: number, base = 520): number => {
  if (pills <= 6) return Math.round(base * 0.75);
  return Math.min(base + Math.max(0, pills - 20) * 12, base * 1.75);
};

export const layoutFocus = (
  groups: readonly LayoutGroup[],
  width: number,
  height: number,
  padX = 90,
  padY = 36
): FocusLayout => {
  const centre = { x: width / 2, y: height / 2 };
  const rx = width / 2 - padX;
  const ry = height / 2 - padY;
  const total = groups.reduce((n, g) => n + g.size, 0);
  const stagger = total > STAGGER_FROM;

  // Each group's slice is one step per pill plus half a step of gap, so busy
  // groups get more room. Within a slice, pills sit together around its middle,
  // no further apart than MAX_SPREAD allows, so a small group reads as one.
  const steps = total + groups.length * 0.5;
  const step = steps > 0 ? (Math.PI * 2) / steps : 0;
  const spread = Math.min(step, MAX_SPREAD);
  const at = (angle: number, scale: number): Point => ({
    x: centre.x + rx * scale * Math.cos(angle),
    y: centre.y + ry * scale * Math.sin(angle)
  });

  let start = -Math.PI / 2 - ((groups[0]?.size ?? 0) * step) / 2;
  let index = 0;
  const nodes: Point[][] = [];
  const labels: Point[] = [];
  for (const group of groups) {
    const mid = start + (group.size * step) / 2;
    const points: Point[] = [];
    for (let i = 0; i < group.size; i++) {
      points.push(at(mid + (i - (group.size - 1) / 2) * spread, stagger && index % 2 === 1 ? 0.72 : 1));
      index++;
    }
    nodes.push(points);
    labels.push(at(mid, 0.45));
    start += (group.size + 0.5) * step;
  }
  return { centre, nodes, labels };
};
