// Cross-domain helper (not a domain): resolves a polymorphic entity reference
// (entityType + entityId) to the entity's display name.

import type { Registry } from '$shared/registry';
import type { EntityType } from '$shared/types/enums';

export const resolveEntityLabel = async (
  reg: Pick<Registry, 'prisma'>,
  entityType: EntityType,
  entityId: string
): Promise<string | null> => {
  switch (entityType) {
    case 'PROJECT': {
      const proj = await reg.prisma.project.findUnique({ where: { id: entityId }, select: { name: true } });
      return proj?.name ?? null;
    }
    case 'PERSON': {
      const person = await reg.prisma.person.findUnique({ where: { id: entityId }, select: { name: true } });
      return person?.name ?? null;
    }
    case 'TEAM': {
      const team = await reg.prisma.team.findUnique({ where: { id: entityId }, select: { name: true } });
      return team?.name ?? null;
    }
    case 'DEPARTMENT': {
      const dept = await reg.prisma.department.findUnique({ where: { id: entityId }, select: { name: true } });
      return dept?.name ?? null;
    }
    default:
      return null;
  }
};
