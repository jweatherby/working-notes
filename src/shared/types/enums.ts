// String unions for columns SQLite stores as plain text (it has no enums).
// Zod schemas use these arrays via z.enum(); TypeScript uses the derived types.

export const ENTITY_TYPES = [
  'PERSON',
  'TEAM',
  'DEPARTMENT',
  'PROJECT',
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
