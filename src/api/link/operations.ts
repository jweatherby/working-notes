import type { Registry } from '$shared/registry';
import { ok, err, type Result } from '$shared/utils';
import type { EntityType } from '$shared/types/enums';

// ----- Types -----

export interface LinkSummary {
  readonly id: string;
  readonly url: string;
  readonly title: string | null;
  readonly createdAt: Date;
}

// ----- Operations -----

export const listLinks = async (
  reg: Pick<Registry, 'prisma'>,
  entityType: EntityType,
  entityId: string
): Promise<Result<readonly LinkSummary[]>> => {
  const links = await reg.prisma.link.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' }
  });
  return ok(links.map((l) => ({
    id: l.id,
    url: l.url,
    title: l.title,
    createdAt: l.createdAt
  })));
};

export const addLink = async (
  reg: Pick<Registry, 'prisma'>,
  entityType: EntityType,
  entityId: string,
  input: { readonly url: string; readonly title?: string }
): Promise<Result<{ readonly id: string }>> => {
  const link = await reg.prisma.link.create({
    data: {
      entityType,
      entityId,
      url: input.url,
      title: input.title
    }
  });
  return ok({ id: link.id });
};

export const removeLink = async (
  reg: Pick<Registry, 'prisma'>,
  id: string
): Promise<Result<{ readonly deleted: true }>> => {
  const existing = await reg.prisma.link.findUnique({ where: { id } });
  if (!existing) return err(new Error('Link not found'));

  await reg.prisma.link.delete({ where: { id } });
  return ok({ deleted: true as const });
};
