import { z } from 'zod';
import { ARCHIVE_FILTERS } from '$shared/types/enums';
import { router, procedure } from '$shared/trpc/init';
import { setArchived } from '$api/_archive';
import { listPersons, getPerson, createPerson, updatePerson, deletePerson } from './operations';

export const personRouter = router({
  list: procedure
    .input(z.object({ archived: z.enum(ARCHIVE_FILTERS).default('exclude') }).default({}))
    .query(({ ctx, input }) => listPersons(ctx.reg, input.archived)),

  get: procedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => getPerson(ctx.reg, input.id)),

  create: procedure
    .input(z.object({
      name: z.string().min(1).max(200),
      email: z.string().email().optional(),
      title: z.string().max(200).optional(),
      leadId: z.string().nullable().optional()
    }))
    .mutation(({ ctx, input }) => createPerson(ctx.reg, input)),

  update: procedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(200).optional(),
      email: z.string().email().nullable().optional(),
      title: z.string().max(200).nullable().optional(),
      leadId: z.string().nullable().optional()
    }))
    .mutation(({ ctx, input }) => updatePerson(ctx.reg, input.id, input)),

  archive: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => setArchived(ctx.reg, 'PERSON', input.id, true)),

  unarchive: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => setArchived(ctx.reg, 'PERSON', input.id, false)),

  delete: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => deletePerson(ctx.reg, input.id))
});
