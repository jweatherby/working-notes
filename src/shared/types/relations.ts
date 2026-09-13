// Relations: typed, directional links between any two entities, with an
// optional note. MENTIONS relations are derived from app links in content.

import type { RelatableType, RelationKind } from './enums';

/** How a relation reads from each end: "Payments owns Checkout" / "Checkout is owned by Payments". */
export const RELATION_LABELS: Readonly<Record<RelationKind, { readonly forward: string; readonly inverse: string }>> = {
  RELATED: { forward: 'Related to', inverse: 'Related to' },
  OWNS: { forward: 'Owns', inverse: 'Owned by' },
  USES: { forward: 'Uses', inverse: 'Used by' },
  APPLIES_TO: { forward: 'Applies to', inverse: 'Subject to' },
  DEPENDS_ON: { forward: 'Depends on', inverse: 'Needed by' },
  SUPERSEDES: { forward: 'Supersedes', inverse: 'Superseded by' },
  MENTIONS: { forward: 'Mentions', inverse: 'Mentioned in' }
};

export interface RelationItem {
  readonly id: string;
  readonly kind: RelationKind;
  readonly direction: 'outgoing' | 'incoming';
  /** The label from this entity's side, e.g. "Used by". */
  readonly label: string;
  readonly other: {
    readonly entityType: RelatableType;
    readonly entityId: string;
    readonly label: string | null;
    readonly path: string;
  };
  readonly note: string | null;
  readonly createdAt: Date;
}

export interface RelationGroup {
  readonly label: string;
  readonly items: readonly RelationItem[];
}
