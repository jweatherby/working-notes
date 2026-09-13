import { z } from 'zod';
import { router, procedure } from '$shared/trpc/init';
import { listOpenTodos, listRecentUpdates, getRelationGraph } from './operations';

export const homeRouter = router({
  todos: procedure
    .input(z.object({ limit: z.number().int().min(1).max(200).optional() }))
    .query(({ ctx, input }) => listOpenTodos(ctx.reg, input.limit)),

  updates: procedure
    .input(z.object({ limit: z.number().int().min(1).max(200).optional() }))
    .query(({ ctx, input }) => listRecentUpdates(ctx.reg, input.limit)),

  graph: procedure
    .input(z.object({}).optional())
    .query(({ ctx }) => getRelationGraph(ctx.reg))
});
