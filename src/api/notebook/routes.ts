import { z } from 'zod';
import { router, procedure } from '$shared/trpc/init';
import { createNotebook, listNotebooks, renameNotebook, setDefaultNotebook } from './operations';

export const notebookRouter = router({
  list: procedure
    .query(({ ctx }) => listNotebooks(ctx, ctx.notebook.id)),

  create: procedure
    .input(z.object({
      name: z.string().trim().min(1).max(100),
      id: z.string().max(40).optional()
    }))
    .mutation(({ ctx, input }) => createNotebook({ notebooks: ctx.notebooks, now: ctx.reg.now }, input)),

  rename: procedure
    .input(z.object({
      id: z.string(),
      name: z.string().trim().min(1).max(100)
    }))
    .mutation(({ ctx, input }) => renameNotebook(ctx, input.id, input.name)),

  setDefault: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => setDefaultNotebook(ctx, input.id)),
});
