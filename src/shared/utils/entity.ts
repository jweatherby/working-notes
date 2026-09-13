import type { EntityType } from '$shared/types/enums';

export interface EntityRef {
  readonly entityType: EntityType;
  readonly entityId: string;
}

// Entity types with their own page. entityPath and parseEntityPath both read
// this table, so a link built from a path always parses back to its entity.
const ROUTE_SEGMENTS: Readonly<Partial<Record<EntityType, string>>> = {
  PERSON: 'people',
  TEAM: 'teams',
  DEPARTMENT: 'departments',
  PROJECT: 'projects',
  GOAL: 'goals',
  PAGE: 'wiki',
  REPORT: 'reports'
};

const SEGMENT_TYPES: ReadonlyMap<string, EntityType> = new Map(
  (Object.entries(ROUTE_SEGMENTS) as [EntityType, string][]).map(([type, segment]) => [segment, type])
);

const TYPE_LABELS: Readonly<Record<EntityType, string>> = {
  PERSON: 'Person',
  TEAM: 'Team',
  DEPARTMENT: 'Department',
  PROJECT: 'Project',
  GOAL: 'Goal',
  PAGE: 'Page',
  DOC: 'Doc',
  NOTE: 'Note',
  REPORT: 'Report',
  TODO: 'Todo',
  LINK: 'Link',
  TAG: 'Tag',
  COMMENT: 'Comment',
  EMOJI: 'Emoji'
};

/** App route for a polymorphic entity reference. */
export const entityPath = (entityType: EntityType, entityId: string): string => {
  const segment = ROUTE_SEGMENTS[entityType];
  return segment ? `/app/${segment}/${entityId}` : `/app/${entityType.toLowerCase()}/${entityId}`;
};

export const entityTypeLabel = (entityType: EntityType): string => TYPE_LABELS[entityType];

// The app only listens on loopback, so an absolute link to it uses one of these hosts.
const LOOPBACK_ORIGIN = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?=\/)/i;
const APP_PATH = /^\/app\/([a-z]+)\/([A-Za-z0-9_-]+)(?:[/?#].*)?$/;

/** The entity an app link points at (`/app/wiki/<id>`, relative or on a loopback origin), or null. */
export const parseEntityPath = (href: string): EntityRef | null => {
  const match = APP_PATH.exec(href.trim().replace(LOOPBACK_ORIGIN, ''));
  const entityType = match ? SEGMENT_TYPES.get(match[1]!) : undefined;
  return match && entityType ? { entityType, entityId: match[2]! } : null;
};
