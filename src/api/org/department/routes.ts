import { z } from 'zod';
import { ARCHIVE_FILTERS } from '$shared/types/enums';
import { router, procedure } from '$shared/trpc/init';
import { setArchived } from '$api/_archive';
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
    .input(z.object({ archived: z.enum(ARCHIVE_FILTERS).default('exclude') }).default({}))
    .query(({ ctx, input }) => listDepartments(ctx.reg, input.archived)),

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

  archive: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => setArchived(ctx.reg, 'DEPARTMENT', input.id, true)),

  unarchive: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => setArchived(ctx.reg, 'DEPARTMENT', input.id, false)),

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
