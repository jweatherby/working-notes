import type { Registry } from '$shared/registry';
import { ok, err, type Result } from '$shared/utils';
import { ensureWritable } from '$api/_archive';
import type { ArchiveFilter, EntityType, TodoStatus } from '$shared/types/enums';
import { entityPath } from '$shared/utils/entity';
import { resolveEntityLabel } from '$api/_entity-labels';
import { loadArchivedIds, notAttachedToArchived } from '$api/_archive';

// ----- Types -----

export interface TodoSummary {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: TodoStatus;
  readonly priority: number;
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly entityLabel: string | null;
  readonly entityPath: string;
  readonly targetDate: Date | null;
  readonly completedAt: Date | null;
  readonly createdAt: Date;
}

export interface TodoFilters {
  readonly status?: TodoStatus;
  readonly entityType?: EntityType;
  /** 'exclude' (the default) leaves out todos on archived entities. */
  readonly archived?: ArchiveFilter;
}

// ----- Operations -----

export const listTodos = async (
  reg: Pick<Registry, 'prisma'>,
  filters?: TodoFilters
): Promise<readonly TodoSummary[]> => {
  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.entityType) where.entityType = filters.entityType;
  if ((filters?.archived ?? 'exclude') === 'exclude') Object.assign(where, notAttachedToArchived(await loadArchivedIds(reg)));

  const todos = await reg.prisma.todo.findMany({
    where,
    orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }]
  });

  const labels = await Promise.all(
    todos.map((t) => resolveEntityLabel(reg, t.entityType as EntityType, t.entityId))
  );

  return todos.map((t, i) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status as TodoStatus,
    priority: t.priority,
    entityType: t.entityType as EntityType,
    entityId: t.entityId,
    entityLabel: labels[i] ?? null,
    entityPath: entityPath(t.entityType as EntityType, t.entityId),
    targetDate: t.targetDate,
    completedAt: t.completedAt,
    createdAt: t.createdAt
  }));
};

export const listTodosForEntity = async (
  reg: Pick<Registry, 'prisma'>,
  entityType: EntityType,
  entityId: string
): Promise<readonly TodoSummary[]> => {
  const todos = await reg.prisma.todo.findMany({
    where: { entityType, entityId },
    orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }]
  });

  const label = await resolveEntityLabel(reg, entityType, entityId);

  return todos.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status as TodoStatus,
    priority: t.priority,
    entityType: t.entityType as EntityType,
    entityId: t.entityId,
    entityLabel: label ?? null,
    entityPath: entityPath(t.entityType as EntityType, t.entityId),
    targetDate: t.targetDate,
    completedAt: t.completedAt,
    createdAt: t.createdAt
  }));
};

interface CreateTodoInput {
  readonly title: string;
  readonly description?: string;
  readonly priority?: number;
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly targetDate?: Date;
}

export const createTodo = async (
  reg: Pick<Registry, 'prisma'>,
  input: CreateTodoInput
): Promise<Result<{ readonly id: string }>> => {
  const writable = await ensureWritable(reg, input.entityType, input.entityId);
  if (!writable.ok) return err(writable.error);
  const todo = await reg.prisma.todo.create({
    data: {
      title: input.title,
      description: input.description,
      priority: input.priority ?? 0,
      entityType: input.entityType,
      entityId: input.entityId,
      targetDate: input.targetDate
    }
  });

  return ok({ id: todo.id });
};

interface UpdateTodoInput {
  readonly title?: string;
  readonly description?: string | null;
  readonly status?: TodoStatus;
  readonly priority?: number;
  readonly targetDate?: Date | null;
}

export const updateTodo = async (
  reg: Pick<Registry, 'prisma' | 'now'>,
  id: string,
  input: UpdateTodoInput
): Promise<Result<{ readonly id: string }>> => {
  const existing = await reg.prisma.todo.findFirst({ where: { id } });
  if (!existing) return err(new Error('Todo not found'));
  const writable = await ensureWritable(reg, existing.entityType, existing.entityId);
  if (!writable.ok) return err(writable.error);

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.targetDate !== undefined) data.targetDate = input.targetDate;

  if (input.status === 'COMPLETE' && existing.status !== 'COMPLETE') {
    data.completedAt = reg.now();
  } else if (input.status && input.status !== 'COMPLETE') {
    data.completedAt = null;
  }

  await reg.prisma.todo.update({ where: { id }, data });
  return ok({ id });
};

export const deleteTodo = async (
  reg: Pick<Registry, 'prisma'>,
  id: string
): Promise<Result<{ readonly deleted: boolean }>> => {
  const existing = await reg.prisma.todo.findFirst({ where: { id } });
  if (!existing) return err(new Error('Todo not found'));
  const writable = await ensureWritable(reg, existing.entityType, existing.entityId);
  if (!writable.ok) return err(writable.error);

  await reg.prisma.todo.delete({ where: { id } });
  return ok({ deleted: true });
};
