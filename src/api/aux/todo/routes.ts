import { z } from 'zod';
import { ENTITY_TYPES, TODO_STATUSES } from '$shared/types/enums';
import { router, procedure } from '$shared/trpc/init';
import { listTodos, listTodosForEntity, createTodo, updateTodo, deleteTodo } from './operations';

const entityTypeEnum = z.enum(ENTITY_TYPES);
const todoStatusEnum = z.enum(TODO_STATUSES);

export const todoRouter = router({
  list: procedure
    .input(z.object({
      status: todoStatusEnum.optional(),
      entityType: entityTypeEnum.optional()
    }))
    .query(({ ctx, input }) => listTodos(ctx.reg, input)),

  forEntity: procedure
    .input(z.object({
      entityType: entityTypeEnum,
      entityId: z.string()
    }))
    .query(({ ctx, input }) => listTodosForEntity(ctx.reg, input.entityType, input.entityId)),

  create: procedure
    .input(z.object({
      title: z.string().min(1).max(500),
      description: z.string().max(5000).optional(),
      priority: z.number().int().min(0).max(3).optional(),
      entityType: entityTypeEnum,
      entityId: z.string(),
      targetDate: z.coerce.date().optional()
    }))
    .mutation(({ ctx, input }) => createTodo(ctx.reg, input)),

  update: procedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).max(500).optional(),
      description: z.string().max(5000).nullable().optional(),
      status: todoStatusEnum.optional(),
      priority: z.number().int().min(0).max(3).optional(),
      targetDate: z.coerce.date().nullable().optional()
    }))
    .mutation(({ ctx, input }) => updateTodo(ctx.reg, input.id, input)),

  delete: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => deleteTodo(ctx.reg, input.id))
});
