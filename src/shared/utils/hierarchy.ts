// Parent/child hierarchies (projects, goals, pages): cycle checks and trees.

/** True when making `newParentId` the parent of `id` would make `id` its own ancestor. */
export const wouldCreateCycle = (
  parentOf: (id: string) => string | null | undefined,
  id: string,
  newParentId: string | null
): boolean => {
  const seen = new Set<string>();
  let current = newParentId;
  while (current) {
    if (current === id) return true;
    // A loop that doesn't include `id` is already there; stop rather than spin.
    if (seen.has(current)) return false;
    seen.add(current);
    current = parentOf(current) ?? null;
  }
  return false;
};

export interface TreeNode<T> {
  readonly item: T;
  readonly depth: number;
  readonly children: readonly TreeNode<T>[];
}

/**
 * A forest from flat items, keeping their order. Items whose parent isn't in
 * the list are roots. Items caught in a parent cycle also become roots, so
 * nothing disappears.
 */
export const buildTree = <T extends { readonly id: string }>(
  items: readonly T[],
  getParentId: (item: T) => string | null | undefined
): readonly TreeNode<T>[] => {
  const ids = new Set(items.map((item) => item.id));
  const childrenOf = new Map<string, T[]>();
  const roots: T[] = [];

  for (const item of items) {
    const parentId = getParentId(item);
    if (parentId && parentId !== item.id && ids.has(parentId)) {
      childrenOf.set(parentId, [...(childrenOf.get(parentId) ?? []), item]);
    } else {
      roots.push(item);
    }
  }

  const visited = new Set<string>();
  const build = (item: T, depth: number): TreeNode<T> => {
    visited.add(item.id);
    const children: TreeNode<T>[] = [];
    for (const child of childrenOf.get(item.id) ?? []) {
      if (!visited.has(child.id)) children.push(build(child, depth + 1));
    }
    return { item, depth, children };
  };

  const forest = roots.map((root) => build(root, 0));
  for (const item of items) {
    if (!visited.has(item.id)) forest.push(build(item, 0));
  }
  return forest;
};

/** Depth-first rows for rendering a tree as a flat, indented list. */
export const flattenTree = <T>(forest: readonly TreeNode<T>[]): readonly TreeNode<T>[] =>
  forest.flatMap((node) => [node, ...flattenTree(node.children)]);
