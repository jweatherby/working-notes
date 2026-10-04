import { z } from 'zod';
import { router, procedure } from '$shared/trpc/init';
import { NOTEBOOK_PROFILES } from '$shared/types/notebook';
import { getReadyRegistry } from '$shared/db/bootstrap.server';
import { addStarterKinds } from '$api/page-kind/operations';
import { createNotebook, listNotebooks, renameNotebook, setDefaultNotebook, setNotebookProfile } from './operations';

const seedStarterKinds = async (notebookId: string): Promise<void> => {
  await addStarterKinds(await getReadyRegistry(notebookId));
};

export const notebookRouter = router({
  list: procedure
    .query(({ ctx }) => listNotebooks(ctx, ctx.notebook.id)),

  create: procedure
    .input(z.object({
      name: z.string().trim().min(1).max(100),
      id: z.string().max(40).optional(),
      // home hides departments, leads and the org map, and calls teams groups. A work notebook starts with the starter page kinds.
      profile: z.enum(NOTEBOOK_PROFILES).default('work')
    }))
    .mutation(({ ctx, input }) =>
      createNotebook({ notebooks: ctx.notebooks, now: ctx.reg.now, addStarterKinds: seedStarterKinds }, input)),

  setProfile: procedure
    .input(z.object({
      id: z.string(),
      profile: z.enum(NOTEBOOK_PROFILES)
    }))
    .mutation(({ ctx, input }) => setNotebookProfile(ctx, input.id, input.profile)),

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
