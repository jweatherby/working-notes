import { z } from 'zod';
import { router, procedure } from '$shared/trpc/init';
import { listProjects, getProject, createProject, updateProject, deleteProject } from './operations';

export const projectRouter = router({
  list: procedure
    .query(({ ctx }) => listProjects(ctx.reg)),

  get: procedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => getProject(ctx.reg, input.id)),

  create: procedure
    .input(z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(5000).optional(),
      status: z.string().max(50).optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      daysOptimistic: z.number().int().min(0).optional(),
      daysLikely: z.number().int().min(0).optional(),
      daysPessimistic: z.number().int().min(0).optional(),
      parentId: z.string().optional()
    }))
    .mutation(({ ctx, input }) => createProject(ctx.reg, input)),

  update: procedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(5000).nullable().optional(),
      status: z.string().max(50).nullable().optional(),
      startDate: z.coerce.date().nullable().optional(),
      endDate: z.coerce.date().nullable().optional(),
      daysOptimistic: z.number().int().min(0).nullable().optional(),
      daysLikely: z.number().int().min(0).nullable().optional(),
      daysPessimistic: z.number().int().min(0).nullable().optional(),
      parentId: z.string().nullable().optional()
    }))
    .mutation(({ ctx, input: { id, ...data } }) => updateProject(ctx.reg, id, data)),

  delete: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => deleteProject(ctx.reg, input.id)),
});
