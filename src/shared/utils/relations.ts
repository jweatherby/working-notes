// Adding a relation from an entity's own page: the kind is chosen as it reads
// from that side ("Depends on" or "Needed by"), so an inverse choice swaps the ends.

import { RELATABLE_TYPES, type RelatableType } from '$shared/types/enums';
import { BUILTIN_RELATION_KINDS, RELATION_KIND_KEY, type RelationKindDefinition } from '$shared/types/relations';


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
  readonly kind: string;
}

/** The entity as one end of a relation, or null for a type relations can't point at. */
export const relationEnd = (entityType: string, entityId: string): RelationEnd | null =>
  (RELATABLE_TYPES as readonly string[]).includes(entityType) && entityId
    ? { entityType: entityType as RelatableType, entityId }
    : null;

/**
 * Kind options from this entity's side: kinds with no direction once, other kinds
 * forward (`KIND:out`) and inverse (`KIND:in`). `kinds` is relationKind.list; MENTIONS
 * is never offered, and people-only kinds only on a person.
 */
export const relationChoices = (kinds: readonly RelationKindDefinition[], selfType: string | null): readonly RelationChoice[] =>
  kinds
    .filter((k) => k.key !== 'MENTIONS' && (!k.peopleOnly || selfType === 'PERSON' || selfType === null))
    .flatMap((k) =>
      k.symmetric
        ? [{ id: `${k.key}:out`, name: k.label }]
        : [
            { id: `${k.key}:out`, name: k.label },
            { id: `${k.key}:in`, name: k.inverseLabel }
          ]
    );

/** Whether a choice's kind links people only, so the target must be a person. */
export const choiceIsPeopleOnly = (kinds: readonly RelationKindDefinition[], choice: string): boolean =>
  kinds.find((k) => k.key === choice.split(':')[0])?.peopleOnly ?? false;

/** The `relation.add` input for a choice between this entity and a target, or null for a choice it can't read. */
export const toRelationInput = (
  choice: string,
  self: RelationEnd,
  target: RelationEnd,
  kinds: readonly RelationKindDefinition[] = BUILTIN_RELATION_KINDS
): RelationAddInput | null => {
  const [kind = '', direction] = choice.split(':');
  // A kind not in `kinds` is still sent when it looks like a key; relation.add checks the notebook has it.
  const def = kinds.find((k) => k.key === kind);
  const known = kind !== 'MENTIONS' && RELATION_KIND_KEY.test(kind)
    && (direction === 'out' || (direction === 'in' && !(def?.symmetric ?? false)));
  if (!known) return null;
  const [from, to] = direction === 'out' ? [self, target] : [target, self];
  return { fromType: from.entityType, fromId: from.entityId, toType: to.entityType, toId: to.entityId, kind };
};
