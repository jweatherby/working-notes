// Relations: links between any two entities, with an optional note. RELATED
// has no direction; DEPENDS_ON does. The personal kinds link two people
// (PARENT_OF has a direction, the rest don't). MENTIONS relations are derived
// from app links in content.

import { PERSONAL_RELATION_KINDS, SYMMETRIC_RELATION_KINDS, type RelatableType, type RelationKind } from './enums';

export const isSymmetricKind = (kind: string): boolean => (SYMMETRIC_RELATION_KINDS as readonly string[]).includes(kind);

export const isPersonalKind = (kind: string): boolean => (PERSONAL_RELATION_KINDS as readonly string[]).includes(kind);

/** How a relation reads from each end: "Checkout depends on Payments" / "Payments is needed by Checkout". */
export const RELATION_LABELS: Readonly<Record<RelationKind, { readonly forward: string; readonly inverse: string }>> = {
  RELATED: { forward: 'Related to', inverse: 'Related to' },
  DEPENDS_ON: { forward: 'Depends on', inverse: 'Needed by' },
  PARTNER_OF: { forward: 'Partner of', inverse: 'Partner of' },
  PARENT_OF: { forward: 'Parent of', inverse: 'Child of' },
  SIBLING_OF: { forward: 'Sibling of', inverse: 'Sibling of' },
  FRIEND_OF: { forward: 'Friend of', inverse: 'Friend of' },
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
  /** Set for a goal–project link shown as a relation; it's managed in the goal's Projects section, not with relation.remove. */
  readonly goalProject?: true;
}

export interface RelationGroup {
  readonly label: string;
  readonly items: readonly RelationItem[];
}
