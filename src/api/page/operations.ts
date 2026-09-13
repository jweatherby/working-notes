import type { Registry } from '$shared/registry';
import { ok, err, type Result } from '$shared/utils';
import type { ArchiveFilter, PageKind } from '$shared/types/enums';
import { validateChartBlocks } from '$shared/types/charts';
import {
  PAGE_KIND_FIELDS,
  parsePageProperties,
  readPageProperties,
  type PageDetail,
  type PageProperties,
  type PagePropertyValue,
  type PageSummary
} from '$shared/types/pages';
import { entityPath } from '$shared/utils/entity';
import { wouldCreateCycle } from '$shared/utils/hierarchy';
import { planEntityCleanup, removeFiles } from '$api/_entity-cleanup';
import { archiveWhere, ensureWritable } from '$api/_archive';
import { syncMentions } from '$api/relation/mentions';

// ----- Pure helpers -----

export type PropertyPatch = Readonly<Record<string, PagePropertyValue | null>>;

/**
 * Applies a property patch: keys in the patch replace current values and null
 * removes a key. Current values the kind doesn't have (after a kind change)
 * are dropped; unknown keys in the patch are kept so validation can name them.
 */
export const mergePageProperties = (
  kind: PageKind,
  current: PageProperties,
  patch: PropertyPatch | undefined
): Record<string, PagePropertyValue> => {
  const allowed = new Set(PAGE_KIND_FIELDS[kind].map((field) => field.key));
  const kept = Object.entries(current).filter(([key]) => allowed.has(key));
  const merged = { ...Object.fromEntries(kept), ...patch };
  return Object.fromEntries(
    Object.entries(merged).filter((entry): entry is [string, PagePropertyValue] => entry[1] !== null)
  );
};

// ----- Row mapping -----

const ORDER = [{ sortOrder: 'asc' as const }, { title: 'asc' as const }];

const SUMMARY_FIELDS = { id: true, title: true, kind: true, parentId: true, properties: true, archivedAt: true, updatedAt: true } as const;

interface PageRow {
  readonly id: string;
  readonly title: string;
  readonly kind: string;
  readonly parentId: string | null;
  readonly properties: string;
  readonly archivedAt: Date | null;
  readonly updatedAt: Date;
}

const toSummary = (row: PageRow): PageSummary => ({
  id: row.id,
  title: row.title,
  kind: row.kind as PageKind,
  parentId: row.parentId,
  properties: readPageProperties(row.properties),
  path: entityPath('PAGE', row.id),
  archivedAt: row.archivedAt,
  updatedAt: row.updatedAt
});

const checkParent = async (
  reg: Pick<Registry, 'prisma'>,
  id: string | null,
  parentId: string
): Promise<Result<void>> => {
  const parent = await reg.prisma.page.findUnique({ where: { id: parentId }, select: { title: true } });
  if (!parent) return err(new Error(`Parent page ${parentId} not found`));
  if (id === null) return ok(undefined);

  const all = await reg.prisma.page.findMany({ select: { id: true, parentId: true } });
  const parents = new Map(all.map((p) => [p.id, p.parentId]));
  return wouldCreateCycle((pageId) => parents.get(pageId), id, parentId)
    ? err(new Error(`"${parent.title}" is this page or one of its sub-pages, so it can't be its parent`))
    : ok(undefined);
};

// ----- Queries -----

export interface PageFilters {
  readonly kind?: PageKind;
  /** null lists top-level pages. */
  readonly parentId?: string | null;
  readonly archived?: ArchiveFilter;
}

export const listPages = async (
  reg: Pick<Registry, 'prisma'>,
  filters: PageFilters
): Promise<Result<readonly PageSummary[]>> => {
  const rows = await reg.prisma.page.findMany({
    where: {
      ...archiveWhere(filters.archived),
      ...(filters.kind !== undefined && { kind: filters.kind }),
      ...(filters.parentId !== undefined && { parentId: filters.parentId })
    },
    orderBy: ORDER,
    select: SUMMARY_FIELDS
  });
  return ok(rows.map(toSummary));
};

export const getPage = async (
  reg: Pick<Registry, 'prisma'>,
  id: string
): Promise<Result<PageDetail>> => {
  const row = await reg.prisma.page.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, title: true } },
      children: { orderBy: ORDER, select: { id: true, title: true, kind: true } }
    }
  });
  if (!row) return err(new Error(`Page ${id} not found`));

  return ok({
    ...toSummary(row),
    content: row.content,
    parent: row.parent,
    children: row.children.map((child) => ({
      id: child.id,
      title: child.title,
      kind: child.kind as PageKind,
      path: entityPath('PAGE', child.id)
    })),
    createdAt: row.createdAt
  });
};

// ----- Mutations -----

export interface CreatePageInput {
  readonly title: string;
  readonly kind?: PageKind;
  readonly parentId?: string;
  readonly content?: string;
  readonly properties?: PropertyPatch;
}

export const createPage = async (
  reg: Pick<Registry, 'prisma'>,
  input: CreatePageInput
): Promise<Result<{ readonly id: string; readonly path: string }>> => {
  const kind = input.kind ?? 'GENERAL';
  const properties = parsePageProperties(kind, mergePageProperties(kind, {}, input.properties));
  if (!properties.ok) return err(properties.error);

  const content = input.content ?? '';
  const charts = validateChartBlocks(content);
  if (!charts.ok) return err(charts.error);

  if (input.parentId) {
    const parent = await checkParent(reg, null, input.parentId);
    if (!parent.ok) return err(parent.error);
  }

  const row = await reg.prisma.page.create({
    data: {
      title: input.title,
      kind,
      parentId: input.parentId,
      content,
      properties: JSON.stringify(properties.value)
    }
  });
  if (content) await syncMentions(reg, { entityType: 'PAGE', entityId: row.id }, content);
  return ok({ id: row.id, path: entityPath('PAGE', row.id) });
};

export interface UpdatePageInput {
  readonly title?: string;
  readonly kind?: PageKind;
  readonly parentId?: string | null;
  readonly content?: string;
  /** Merged into the current properties; null removes a key. */
  readonly properties?: PropertyPatch;
}

export const updatePage = async (
  reg: Pick<Registry, 'prisma'>,
  id: string,
  input: UpdatePageInput
): Promise<Result<{ readonly id: string }>> => {
  const existing = await reg.prisma.page.findUnique({ where: { id }, select: { kind: true, properties: true } });
  if (!existing) return err(new Error(`Page ${id} not found`));
  const writable = await ensureWritable(reg, 'PAGE', id);
  if (!writable.ok) return err(writable.error);

  const kind = input.kind ?? (existing.kind as PageKind);
  let properties: string | undefined;
  if (input.properties !== undefined || kind !== existing.kind) {
    const merged = mergePageProperties(kind, readPageProperties(existing.properties), input.properties);
    const parsed = parsePageProperties(kind, merged);
    if (!parsed.ok) return err(parsed.error);
    properties = JSON.stringify(parsed.value);
  }

  if (input.content !== undefined) {
    const charts = validateChartBlocks(input.content);
    if (!charts.ok) return err(charts.error);
  }

  if (input.parentId) {
    const parent = await checkParent(reg, id, input.parentId);
    if (!parent.ok) return err(parent.error);
  }

  await reg.prisma.page.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.kind !== undefined && { kind: input.kind }),
      ...(input.parentId !== undefined && { parentId: input.parentId }),
      ...(input.content !== undefined && { content: input.content }),
      ...(properties !== undefined && { properties })
    }
  });
  if (input.content !== undefined) await syncMentions(reg, { entityType: 'PAGE', entityId: id }, input.content);
  return ok({ id });
};

/** Sub-pages move up to this page's parent; attached items and relations are deleted. */
export const deletePage = async (
  reg: Pick<Registry, 'prisma' | 'storage' | 'logger'>,
  id: string
): Promise<Result<{ readonly deleted: true }>> => {
  const existing = await reg.prisma.page.findUnique({ where: { id }, select: { parentId: true } });
  if (!existing) return err(new Error(`Page ${id} not found`));

  const cleanup = await planEntityCleanup(reg, 'PAGE', id);
  await reg.prisma.$transaction([
    reg.prisma.page.updateMany({ where: { parentId: id }, data: { parentId: existing.parentId } }),
    ...cleanup.ops,
    reg.prisma.page.delete({ where: { id } })
  ]);
  await removeFiles(reg, cleanup.files);
  return ok({ deleted: true as const });
};
