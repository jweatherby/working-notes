import { z } from 'zod';
import { router, procedure } from '$shared/trpc/init';
import {
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  listTeamMembers,
  addTeamMember,
  removeTeamMember
} from './operations';

export const teamRouter = router({
  list: procedure
    .query(({ ctx }) => listTeams(ctx.reg)),

  get: procedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => getTeam(ctx.reg, input.id)),

  create: procedure
    .input(z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(2000).optional()
    }))
    .mutation(({ ctx, input }) => createTeam(ctx.reg, input)),

  update: procedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).nullable().optional()
    }))
    .mutation(({ ctx, input }) => updateTeam(ctx.reg, input.id, input)),

  delete: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => deleteTeam(ctx.reg, input.id)),

  listMembers: procedure
    .input(z.object({ teamId: z.string() }))
    .query(({ ctx, input }) => listTeamMembers(ctx.reg, input.teamId)),

  addMember: procedure
    .input(z.object({ teamId: z.string(), personId: z.string() }))
    .mutation(({ ctx, input }) =>
      addTeamMember(ctx.reg, input.teamId, { personId: input.personId })
    ),

  removeMember: procedure
    .input(z.object({ teamId: z.string(), personId: z.string() }))
    .mutation(({ ctx, input }) => removeTeamMember(ctx.reg, input.teamId, input.personId))
});
