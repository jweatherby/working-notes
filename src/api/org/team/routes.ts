import { z } from 'zod';
import { ARCHIVE_FILTERS } from '$shared/types/enums';
import { router, procedure } from '$shared/trpc/init';
import { setArchived } from '$api/_archive';
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
    .input(z.object({ archived: z.enum(ARCHIVE_FILTERS).default('exclude') }).default({}))
    .query(({ ctx, input }) => listTeams(ctx.reg, input.archived)),

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

  archive: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => setArchived(ctx.reg, 'TEAM', input.id, true)),

  unarchive: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => setArchived(ctx.reg, 'TEAM', input.id, false)),

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
