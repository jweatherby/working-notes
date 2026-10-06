// Relation kinds are data: each notebook has its own (Parent of / Child of,
// Partner of, Mentor of…) beside the built-in RELATED, DEPENDS_ON and MENTIONS.
// Modules seed theirs (`seedRelationKinds`); the user can add more.

import type { Registry } from '$shared/registry';
import { ok, err, type Result } from '$shared/utils';
import {
  BUILTIN_RELATION_KINDS,
  RELATION_KIND_KEY,
  type RelationKindDefinition,
  type RelationKindSummary
} from '$shared/types/relations';
import type { RelationKindSeed } from '$shared/modules/types';

type Reg = Pick<Registry, 'prisma'>;

const ORDER = [{ sortOrder: 'asc' as const }, { label: 'asc' as const }];

interface Row {
  readonly key: string;
  readonly label: string;
  readonly inverseLabel: string;
  readonly symmetric: boolean;
  readonly peopleOnly: boolean;
  readonly exclusive: boolean;
  readonly sortOrder: number;
}

const toDefinition = (row: Row): RelationKindDefinition => ({
  key: row.key,
  label: row.label,
  inverseLabel: row.inverseLabel,
  symmetric: row.symmetric,
  peopleOnly: row.peopleOnly,
  exclusive: row.exclusive,
  sortOrder: row.sortOrder,
  builtIn: false
});

/** Every kind the notebook can use: the built-ins, then its own. */
export const loadRelationKinds = async (reg: Reg): Promise<readonly RelationKindDefinition[]> => [
  ...BUILTIN_RELATION_KINDS,
  ...(await reg.prisma.relationKind.findMany({ orderBy: ORDER })).map(toDefinition)
];

const unknownKind = async (reg: Reg, key: string): Promise<Error> => {
  const keys = (await loadRelationKinds(reg)).filter((k) => k.key !== 'MENTIONS').map((k) => k.key);
  return new Error(`There is no relation kind "${key}" in this notebook. Kinds: ${keys.join(', ')}. Create one with relationKind.create.`);
};

export const listRelationKinds = async (reg: Reg): Promise<Result<readonly RelationKindSummary[]>> => {
  const [kinds, counts] = await Promise.all([
    loadRelationKinds(reg),
    reg.prisma.relation.groupBy({ by: ['kind'], _count: { _all: true } })
  ]);
  return ok(kinds.map((k) => ({ ...k, relationCount: counts.find((c) => c.kind === k.key)?._count._all ?? 0 })));
};

/** A kind by key, built in or the notebook's own. The error lists the notebook's kinds. */
export const getRelationKind = async (reg: Reg, key: string): Promise<Result<RelationKindDefinition>> => {
  const builtIn = BUILTIN_RELATION_KINDS.find((k) => k.key === key);
  if (builtIn) return ok(builtIn);
  const row = await reg.prisma.relationKind.findUnique({ where: { key } });
  return row ? ok(toDefinition(row)) : err(await unknownKind(reg, key));
};

export interface CreateRelationKindInput {
  readonly key: string;
  readonly label: string;
  /** Leave out for a symmetric kind. */
  readonly inverseLabel?: string;
  readonly symmetric?: boolean;
  readonly peopleOnly?: boolean;
  readonly exclusive?: boolean;
}

export const createRelationKind = async (reg: Reg, input: CreateRelationKindInput): Promise<Result<RelationKindDefinition>> => {
  if (!RELATION_KIND_KEY.test(input.key)) {
    return err(new Error(`"${input.key}" can't be a relation kind key. Use capital letters, digits and underscores, starting with a letter (like MENTOR_OF), at most 40.`));
  }
  if (BUILTIN_RELATION_KINDS.some((k) => k.key === input.key) || (await reg.prisma.relationKind.findUnique({ where: { key: input.key }, select: { key: true } }))) {
    return err(new Error(`There is already a relation kind ${input.key}.`));
  }
  const symmetric = input.symmetric ?? !input.inverseLabel;
  const last = await reg.prisma.relationKind.aggregate({ _max: { sortOrder: true } });
  const row = await reg.prisma.relationKind.create({
    data: {
      key: input.key,
      label: input.label.trim(),
      inverseLabel: symmetric ? input.label.trim() : (input.inverseLabel ?? input.label).trim(),
      symmetric,
      peopleOnly: input.peopleOnly ?? false,
      exclusive: input.exclusive ?? false,
      sortOrder: (last._max.sortOrder ?? -1) + 1
    }
  });
  return ok(toDefinition(row));
};

export interface UpdateRelationKindInput {
  readonly label?: string;
  readonly inverseLabel?: string;
  readonly sortOrder?: number;
}

/** Labels and order change freely; direction and who it links don't, once relations use it. */
export const updateRelationKind = async (reg: Reg, key: string, input: UpdateRelationKindInput): Promise<Result<RelationKindDefinition>> => {
  if (BUILTIN_RELATION_KINDS.some((k) => k.key === key)) return err(new Error(`${key} is built in and can't be changed.`));
  const existing = await reg.prisma.relationKind.findUnique({ where: { key } });
  if (!existing) return err(await unknownKind(reg, key));
  const label = input.label?.trim() ?? existing.label;
  const row = await reg.prisma.relationKind.update({
    where: { key },
    data: {
      label,
      inverseLabel: existing.symmetric ? label : (input.inverseLabel?.trim() ?? existing.inverseLabel),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder })
    }
  });
  return ok(toDefinition(row));
};

/** Refuses while relations use the kind, unless `moveTo` names a kind to move them to. */
export const deleteRelationKind = async (
  reg: Reg,
  key: string,
  moveTo?: string
): Promise<Result<{ readonly deleted: true; readonly relationsMoved: number }>> => {
  if (BUILTIN_RELATION_KINDS.some((k) => k.key === key)) return err(new Error(`${key} is built in and can't be deleted.`));
  if (!(await reg.prisma.relationKind.findUnique({ where: { key }, select: { key: true } }))) return err(await unknownKind(reg, key));
  const used = await reg.prisma.relation.count({ where: { kind: key } });
  if (used > 0 && moveTo === undefined) {
    return err(new Error(`${used} relation(s) are ${key}. Pass moveTo with another kind (RELATED keeps them as plain links) to move them first.`));
  }
  if (moveTo !== undefined) {
    if (moveTo === key || moveTo === 'MENTIONS') return err(new Error('moveTo must be another kind, and not MENTIONS'));
    const target = await getRelationKind(reg, moveTo);
    if (!target.ok) return err(target.error);
  }
  await reg.prisma.$transaction([
    ...(moveTo !== undefined ? [reg.prisma.relation.updateMany({ where: { kind: key }, data: { kind: moveTo } })] : []),
    reg.prisma.relationKind.delete({ where: { key } })
  ]);
  return ok({ deleted: true as const, relationsMoved: used });
};

/** Adds the kinds a notebook's modules bring and it doesn't have yet. Returns the keys added. */
export const seedRelationKinds = async (reg: Reg, seeds: readonly RelationKindSeed[]): Promise<readonly string[]> => {
  const existing = new Set((await reg.prisma.relationKind.findMany({ select: { key: true } })).map((r) => r.key));
  const missing = seeds.filter((s) => !existing.has(s.key));
  for (const [i, seed] of missing.entries()) {
    await reg.prisma.relationKind.create({ data: { ...seed, sortOrder: existing.size + i } });
  }
  return missing.map((s) => s.key);
};
