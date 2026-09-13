import { z } from 'zod';
import { router, procedure } from '$shared/trpc/init';
import {
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  listDepartmentMembers,
  addDepartmentMember,
  removeDepartmentMember
} from './operations';

export const departmentRouter = router({
  list: procedure
    .query(({ ctx }) => listDepartments(ctx.reg)),

  get: procedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => getDepartment(ctx.reg, input.id)),

  create: procedure
    .input(z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(2000).optional()
    }))
    .mutation(({ ctx, input }) => createDepartment(ctx.reg, input)),

  update: procedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).nullable().optional()
    }))
    .mutation(({ ctx, input }) => updateDepartment(ctx.reg, input.id, input)),

  delete: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => deleteDepartment(ctx.reg, input.id)),

  listMembers: procedure
    .input(z.object({ departmentId: z.string() }))
    .query(({ ctx, input }) => listDepartmentMembers(ctx.reg, input.departmentId)),

  addMember: procedure
    .input(z.object({ departmentId: z.string(), personId: z.string() }))
    .mutation(({ ctx, input }) =>
      addDepartmentMember(ctx.reg, input.departmentId, { personId: input.personId })
    ),

  removeMember: procedure
    .input(z.object({ departmentId: z.string(), personId: z.string() }))
    .mutation(({ ctx, input }) => removeDepartmentMember(ctx.reg, input.departmentId, input.personId))
});
