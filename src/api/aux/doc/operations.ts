import type { Registry } from '$shared/registry';
import { ok, err, type Result } from '$shared/utils';
import type { EntityType } from '$shared/types/enums';
import { fileUrl } from '$shared/utils/files';

// ----- Types -----

export interface DocSummary {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly sourceUrl: string | null;
  readonly sortOrder: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ----- Operations -----

export const listDocs = async (
  reg: Pick<Registry, 'prisma'>,
  entityType: EntityType,
  entityId: string
): Promise<Result<readonly DocSummary[]>> => {
  const docs = await reg.prisma.doc.findMany({
    where: { entityType, entityId },
    orderBy: { sortOrder: 'asc' }
  });
  return ok(docs);
};

export const addDoc = async (
  reg: Pick<Registry, 'prisma'>,
  entityType: EntityType,
  entityId: string,
  input: { readonly title: string }
): Promise<Result<{ readonly id: string }>> => {
  const maxOrder = await reg.prisma.doc.aggregate({
    where: { entityType, entityId },
    _max: { sortOrder: true }
  });
  const doc = await reg.prisma.doc.create({
    data: {
      entityType,
      entityId,
      title: input.title,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1
    }
  });
  return ok({ id: doc.id });
};

export const updateDoc = async (
  reg: Pick<Registry, 'prisma'>,
  id: string,
  input: { readonly title?: string; readonly content?: string; readonly sourceUrl?: string | null }
): Promise<Result<{ readonly id: string }>> => {
  const existing = await reg.prisma.doc.findUnique({ where: { id } });
  if (!existing) return err(new Error('Doc not found'));

  await reg.prisma.doc.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.content !== undefined && { content: input.content }),
      ...(input.sourceUrl !== undefined && { sourceUrl: input.sourceUrl })
    }
  });
  return ok({ id });
};

export const removeDoc = async (
  reg: Pick<Registry, 'prisma' | 'storage' | 'logger'>,
  id: string
): Promise<Result<{ readonly deleted: true }>> => {
  const existing = await reg.prisma.doc.findUnique({ where: { id } });
  if (!existing) return err(new Error('Doc not found'));

  if (existing.sourceUrl) {
    try {
      await reg.storage.deleteObject(existing.sourceUrl);
    } catch (error) {
      reg.logger.warn({ docId: id, sourceUrl: existing.sourceUrl, error }, 'failed to delete PDF from storage');
    }
  }

  await reg.prisma.doc.delete({ where: { id } });
  return ok({ deleted: true as const });
};

export const reorderDocs = async (
  reg: Pick<Registry, 'prisma'>,
  entityType: EntityType,
  entityId: string,
  docIds: readonly string[]
): Promise<Result<{ readonly reordered: true }>> => {
  await reg.prisma.$transaction(
    docIds.map((id, i) =>
      reg.prisma.doc.update({ where: { id }, data: { sortOrder: i } })
    )
  );
  return ok({ reordered: true as const });
};

/**
 * Store a PDF as the doc's source file. The app does not convert it: turning
 * the PDF into markdown is Claude's job (read the PDF, then `doc.update`).
 */
export const attachSourcePdf = async (
  reg: Pick<Registry, 'prisma' | 'storage' | 'uuid' | 'logger'>,
  docId: string,
  contentType: string,
  dataBase64: string
): Promise<Result<{ readonly sourceUrl: string }>> => {
  const existing = await reg.prisma.doc.findUnique({ where: { id: docId } });
  if (!existing) return err(new Error('Doc not found'));

  const key = `docs/${docId}/source-${reg.uuid()}.pdf`;
  await reg.storage.putObject(key, Buffer.from(dataBase64, 'base64'), contentType);
  await reg.prisma.doc.update({ where: { id: docId }, data: { sourceUrl: key } });

  if (existing.sourceUrl) {
    try {
      await reg.storage.deleteObject(existing.sourceUrl);
    } catch (error) {
      reg.logger.warn({ docId, sourceUrl: existing.sourceUrl, error }, 'failed to delete previous PDF');
    }
  }

  return ok({ sourceUrl: key });
};

export const getDocReadUrl = async (
  reg: Pick<Registry, 'prisma'>,
  id: string
): Promise<Result<{ readonly url: string }>> => {
  const doc = await reg.prisma.doc.findUnique({ where: { id } });
  if (!doc || !doc.sourceUrl) return err(new Error('Doc not found'));
  return ok({ url: fileUrl(doc.sourceUrl) });
};
