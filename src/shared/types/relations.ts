// Relations: links between any two entities, with a kind and an optional note.
// RELATED (no direction) and DEPENDS_ON are built in, and MENTIONS is derived from
// app links in content. Every other kind is the notebook's own (relation_kind): a
// label each way ("Parent of" / "Child of"), whether it has a direction, and
// whether it links only people.

import { MANUAL_RELATION_KINDS, type RelatableType, type RelationKind } from './enums';

export interface RelationKindDefinition {
  readonly key: string;
  /** How it reads from the `from` end: "Parent of". */
  readonly label: string;
  /** How it reads from the `to` end: "Child of"; the same as `label` when symmetric. */
  readonly inverseLabel: string;
  /** No direction: A→B is the same relation as B→A. */
  readonly symmetric: boolean;
  /** Links two people only. */
  readonly peopleOnly: boolean;
  /** The `to` end has at most one relation of this kind (a person has one lead): adding replaces it. */
  readonly exclusive: boolean;
  readonly sortOrder: number;
  /** RELATED, DEPENDS_ON and MENTIONS; they can't be changed. */
  readonly builtIn: boolean;
}

export interface RelationKindSummary extends RelationKindDefinition {
  readonly relationCount: number;
}

export const BUILTIN_RELATION_KINDS: readonly RelationKindDefinition[] = [
  { key: 'RELATED', label: 'Related to', inverseLabel: 'Related to', symmetric: true, peopleOnly: false, exclusive: false, sortOrder: -3, builtIn: true },
  { key: 'DEPENDS_ON', label: 'Depends on', inverseLabel: 'Needed by', symmetric: false, peopleOnly: false, exclusive: false, sortOrder: -2, builtIn: true },
  { key: 'MENTIONS', label: 'Mentions', inverseLabel: 'Mentioned in', symmetric: false, peopleOnly: false, exclusive: false, sortOrder: 1_000_000, builtIn: true }
];

/** Relation kind keys look like PARENT_OF or MENTOR_OF. */
export const RELATION_KIND_KEY = /^[A-Z][A-Z0-9_]{0,39}$/;

export const isManualBuiltIn = (kind: string): boolean => (MANUAL_RELATION_KINDS as readonly string[]).includes(kind);

/** The kind's label from one end; an unknown kind reads as its key. */
export const relationLabel = (kinds: readonly RelationKindDefinition[], kind: RelationKind, outgoing: boolean): string => {
  const def = kinds.find((k) => k.key === kind);
  if (!def) return kind;
  return outgoing ? def.label : def.inverseLabel;
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
