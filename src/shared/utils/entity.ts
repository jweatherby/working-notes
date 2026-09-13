import type { EntityType } from '$shared/types/enums';

/** App route for a polymorphic entity reference. */
export const entityPath = (entityType: EntityType, entityId: string): string => {
  switch (entityType) {
    case 'PROJECT': return `/app/projects/${entityId}`;
    case 'PERSON': return `/app/people/${entityId}`;
    case 'TEAM': return `/app/teams/${entityId}`;
    case 'DEPARTMENT': return `/app/departments/${entityId}`;
    case 'REPORT': return `/app/reports/${entityId}`;
    default: return `/app/${entityType.toLowerCase()}/${entityId}`;
  }
};
