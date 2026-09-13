// String unions for columns SQLite stores as plain text (it has no enums).
// Zod schemas use these arrays via z.enum(); TypeScript uses the derived types.

export const ENTITY_TYPES = [
  'PERSON',
  'TEAM',
  'DEPARTMENT',
  'PROJECT',
  'GOAL',
  'PAGE',
  'DOC',
  'NOTE',
  'REPORT',
  'TODO',
  'LINK',
  'TAG',
  'COMMENT',
  'EMOJI'
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export const TODO_STATUSES = ['PENDING', 'ACTIVE', 'COMPLETE', 'CANCELLED'] as const;

export type TodoStatus = (typeof TODO_STATUSES)[number];

/** Who can own a goal or a project. */
export const OWNER_TYPES = ['PERSON', 'TEAM', 'DEPARTMENT'] as const;

export type OwnerType = (typeof OWNER_TYPES)[number];

export const GOAL_STATUSES = ['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'DONE', 'DROPPED'] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const PAGE_KINDS = ['GENERAL', 'POLICY', 'PRODUCT', 'SOFTWARE', 'DECISION'] as const;

export type PageKind = (typeof PAGE_KINDS)[number];

/** Kinds `relation.add` accepts. MENTIONS is derived from app links in content and never written by hand. */
export const MANUAL_RELATION_KINDS = ['RELATED', 'OWNS', 'USES', 'APPLIES_TO', 'DEPENDS_ON', 'SUPERSEDES'] as const;

export const RELATION_KINDS = [...MANUAL_RELATION_KINDS, 'MENTIONS'] as const;

export type RelationKind = (typeof RELATION_KINDS)[number];

/** Entity types a relation can start or end at. */
export const RELATABLE_TYPES = ['PERSON', 'TEAM', 'DEPARTMENT', 'PROJECT', 'GOAL', 'PAGE', 'DOC', 'NOTE', 'REPORT'] as const;

export type RelatableType = (typeof RELATABLE_TYPES)[number];
