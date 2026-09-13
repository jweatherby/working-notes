import type { Registry } from '$shared/registry';
import { ok, err, type Result } from '$shared/utils';
import { RELATION_KINDS, type EntityType, type RelatableType, type RelationKind } from '$shared/types/enums';
import { RELATION_LABELS, type RelationGroup, type RelationItem } from '$shared/types/relations';
import { entityPath } from '$shared/utils/entity';
import { resolveEntityLabel } from '$api/_entity-labels';

// ----- Pure helpers -----

/**
 * Groups by label ("Owns", "Used by", …). Groups follow RELATION_KINDS order,
 * outgoing before incoming, so mentions come last.
 */
export const groupRelations = (items: readonly RelationItem[]): readonly RelationGroup[] => {
  const rank = (item: RelationItem) => RELATION_KINDS.indexOf(item.kind) * 2 + (item.direction === 'incoming' ? 1 : 0);
  const groups = new Map<string, { rank: number; items: RelationItem[] }>();
  for (const item of items) {
    const group = groups.get(item.label) ?? { rank: rank(item), items: [] };
    group.items.push(item);
    groups.set(item.label, group);
  }
  return [...groups.entries()]
    .sort(([, a], [, b]) => a.rank - b.rank)
    .map(([label, group]) => ({ label, items: group.items }));
};

// ----- Queries -----

// Docs and notes have no page of their own; link to the entity they're attached to.
const pathOf = async (reg: Pick<Registry, 'prisma'>, entityType: RelatableType, entityId: string): Promise<string> => {
  if (entityType === 'DOC' || entityType === 'NOTE') {
    const where = { where: { id: entityId }, select: { entityType: true, entityId: true } };
    const owner = entityType === 'DOC' ? await reg.prisma.doc.findUnique(where) : await reg.prisma.note.findUnique(where);
    if (owner) return entityPath(owner.entityType as EntityType, owner.entityId);
  }
  return entityPath(entityType, entityId);
};

/** Relations at either end of an entity, grouped by how they read from its side. Relations to deleted entities are left out. */
export const listRelationsForEntity = async (
  reg: Pick<Registry, 'prisma'>,
  entityType: EntityType,
  entityId: string
): Promise<Result<readonly RelationGroup[]>> => {
  const rows = await reg.prisma.relation.findMany({
    where: { OR: [{ fromType: entityType, fromId: entityId }, { toType: entityType, toId: entityId }] },
    orderBy: { createdAt: 'asc' }
  });

  const items = await Promise.all(
    rows.map(async (row): Promise<RelationItem | null> => {
      const outgoing = row.fromType === entityType && row.fromId === entityId;
      const kind = row.kind as RelationKind;
      const otherType = (outgoing ? row.toType : row.fromType) as RelatableType;
      const otherId = outgoing ? row.toId : row.fromId;
      const label = await resolveEntityLabel(reg, otherType, otherId);
      if (label === null) return null;
      return {
        id: row.id,
        kind,
        direction: outgoing ? 'outgoing' : 'incoming',
        label: outgoing ? RELATION_LABELS[kind].forward : RELATION_LABELS[kind].inverse,
        other: { entityType: otherType, entityId: otherId, label, path: await pathOf(reg, otherType, otherId) },
        note: row.note,
        createdAt: row.createdAt
      };
    })
  );

  return ok(groupRelations(items.filter((item): item is RelationItem => item !== null)));
};

// ----- Mutations -----

export interface AddRelationInput {
  readonly fromType: RelatableType;
  readonly fromId: string;
  readonly toType: RelatableType;
  readonly toId: string;
  readonly kind: RelationKind;
  readonly note?: string | null;
}

export const addRelation = async (
  reg: Pick<Registry, 'prisma'>,
  input: AddRelationInput
): Promise<Result<{ readonly id: string }>> => {
  if (input.kind === 'MENTIONS') {
    return err(new Error('MENTIONS relations come from links in content: link to the entity with its path in the markdown instead'));
  }
  if (input.fromType === input.toType && input.fromId === input.toId) {
    return err(new Error('A relation needs two different entities'));
  }

  const [fromLabel, toLabel] = await Promise.all([
    resolveEntityLabel(reg, input.fromType, input.fromId),
    resolveEntityLabel(reg, input.toType, input.toId)
  ]);
  if (fromLabel === null) return err(new Error(`${input.fromType} ${input.fromId} not found`));
  if (toLabel === null) return err(new Error(`${input.toType} ${input.toId} not found`));

  const key = { fromType: input.fromType, fromId: input.fromId, toType: input.toType, toId: input.toId, kind: input.kind };
  const existing = await reg.prisma.relation.findUnique({ where: { fromType_fromId_toType_toId_kind: key } });
  if (existing) {
    return err(new Error(
      `"${fromLabel}" ${RELATION_LABELS[input.kind].forward.toLowerCase()} "${toLabel}" already (relation ${existing.id}); use relation.update to change its note`
    ));
  }

  const row = await reg.prisma.relation.create({ data: { ...key, note: input.note ?? null } });
  return ok({ id: row.id });
};

export const updateRelation = async (
  reg: Pick<Registry, 'prisma'>,
  id: string,
  input: { readonly kind?: RelationKind; readonly note?: string | null }
): Promise<Result<{ readonly id: string }>> => {
  const existing = await reg.prisma.relation.findUnique({ where: { id } });
  if (!existing) return err(new Error(`Relation ${id} not found`));
  if (existing.kind === 'MENTIONS' || input.kind === 'MENTIONS') {
    return err(new Error('MENTIONS relations come from links in content and can\'t be edited; change the content instead'));
  }

  if (input.kind !== undefined && input.kind !== existing.kind) {
    const clash = await reg.prisma.relation.findUnique({
      where: {
        fromType_fromId_toType_toId_kind: {
          fromType: existing.fromType,
          fromId: existing.fromId,
          toType: existing.toType,
          toId: existing.toId,
          kind: input.kind
        }
      }
    });
    if (clash) return err(new Error(`A ${input.kind} relation between these entities already exists (relation ${clash.id})`));
  }

  await reg.prisma.relation.update({
    where: { id },
    data: {
      ...(input.kind !== undefined && { kind: input.kind }),
      ...(input.note !== undefined && { note: input.note })
    }
  });
  return ok({ id });
};

export const removeRelation = async (
  reg: Pick<Registry, 'prisma'>,
  id: string
): Promise<Result<{ readonly deleted: true }>> => {
  const existing = await reg.prisma.relation.findUnique({ where: { id } });
  if (!existing) return err(new Error(`Relation ${id} not found`));
  if (existing.kind === 'MENTIONS') {
    return err(new Error('MENTIONS relations come from links in content; remove the link from the content instead'));
  }

  await reg.prisma.relation.delete({ where: { id } });
  return ok({ deleted: true as const });
};
