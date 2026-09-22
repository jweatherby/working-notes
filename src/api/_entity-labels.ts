// Cross-domain helper (not a domain): resolves a polymorphic entity reference
// (entityType + entityId) to the entity's display name. Null means the entity
// doesn't exist (or its type has no name).

import type { Registry } from '$shared/registry';
import type { EntityType } from '$shared/types/enums';

const firstLine = (content: string, max = 80): string => {
  const line = content
    .split('\n')
    .map((l) => l.replace(/^[#>*\-\s]+/, '').trim())
    .find((l) => l.length > 0) ?? '';
  return line.length > max ? `${line.slice(0, max - 1)}…` : line || '(empty note)';
};

export const resolveEntityLabel = async (
  reg: Pick<Registry, 'prisma'>,
  entityType: EntityType,
  entityId: string
): Promise<string | null> => {
  const where = { where: { id: entityId } };
  switch (entityType) {
    case 'PROJECT':
      return (await reg.prisma.project.findUnique({ ...where, select: { name: true } }))?.name ?? null;
    case 'PERSON':
      return (await reg.prisma.person.findUnique({ ...where, select: { name: true } }))?.name ?? null;
    case 'TEAM':
      return (await reg.prisma.team.findUnique({ ...where, select: { name: true } }))?.name ?? null;
    case 'DEPARTMENT':
      return (await reg.prisma.department.findUnique({ ...where, select: { name: true } }))?.name ?? null;
    case 'GOAL':
      return (await reg.prisma.goal.findUnique({ ...where, select: { title: true } }))?.title ?? null;
    case 'PAGE':
      return (await reg.prisma.page.findUnique({ ...where, select: { title: true } }))?.title ?? null;
    case 'DOC':
      return (await reg.prisma.doc.findUnique({ ...where, select: { title: true } }))?.title ?? null;
    case 'REPORT':
      return (await reg.prisma.report.findUnique({ ...where, select: { title: true } }))?.title ?? null;
    case 'TODO':
      return (await reg.prisma.todo.findUnique({ ...where, select: { title: true } }))?.title ?? null;
    case 'NOTE': {
      const note = await reg.prisma.note.findUnique({ ...where, select: { content: true } });
      return note ? firstLine(note.content) : null;
    }
    default:
      return null;
  }
};
