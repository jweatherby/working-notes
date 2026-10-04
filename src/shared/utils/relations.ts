// Adding a relation from an entity's own page: the kind is chosen as it reads
// from that side ("Depends on" or "Needed by"), so an inverse choice swaps the ends.

import { MANUAL_RELATION_KINDS, RELATABLE_TYPES, type RelatableType } from '$shared/types/enums';
import { RELATION_LABELS, isPersonalKind, isSymmetricKind } from '$shared/types/relations';

type ManualRelationKind = (typeof MANUAL_RELATION_KINDS)[number];

export interface RelationEnd {
  readonly entityType: RelatableType;
  readonly entityId: string;
}

export interface RelationChoice {
  readonly id: string;
  readonly name: string;
}

/** A link picked in a form before the entity it starts from is saved: added once it is. */
export interface PickedLink {
  readonly choice: string;
  readonly choiceName: string;
  readonly target: RelationEnd;
  readonly name: string;
}

export interface RelationAddInput {
  readonly fromType: RelatableType;
  readonly fromId: string;
  readonly toType: RelatableType;
  readonly toId: string;
  readonly kind: ManualRelationKind;
}

/** The entity as one end of a relation, or null for a type relations can't point at. */
export const relationEnd = (entityType: string, entityId: string): RelationEnd | null =>
  (RELATABLE_TYPES as readonly string[]).includes(entityType) && entityId
    ? { entityType: entityType as RelatableType, entityId }
    : null;

/**
 * Kind options from this entity's side: kinds with no direction once, other kinds
 * forward (`KIND:out`) and inverse (`KIND:in`). The personal kinds are offered
 * only with `personal` (a person's page in a home notebook); they link two people.
 */
export const relationChoices = (options: { readonly personal?: boolean } = {}): readonly RelationChoice[] =>
  MANUAL_RELATION_KINDS.filter((kind) => options.personal || !isPersonalKind(kind)).flatMap((kind) =>
    isSymmetricKind(kind)
      ? [{ id: `${kind}:out`, name: RELATION_LABELS[kind].forward }]
      : [
          { id: `${kind}:out`, name: RELATION_LABELS[kind].forward },
          { id: `${kind}:in`, name: RELATION_LABELS[kind].inverse }
        ]
  );

/** The `relation.add` input for a choice between this entity and a target, or null for a choice it can't read. */
export const toRelationInput = (choice: string, self: RelationEnd, target: RelationEnd): RelationAddInput | null => {
  const [kind, direction] = choice.split(':') as [ManualRelationKind, string | undefined];
  const known = MANUAL_RELATION_KINDS.includes(kind) && (direction === 'out' || (direction === 'in' && !isSymmetricKind(kind)));
  if (!known) return null;
  const [from, to] = direction === 'out' ? [self, target] : [target, self];
  return { fromType: from.entityType, fromId: from.entityId, toType: to.entityType, toId: to.entityId, kind };
};
