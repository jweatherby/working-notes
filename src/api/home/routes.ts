import { z } from 'zod';
import { router, procedure } from '$shared/trpc/init';
import { FOCUS_TYPES } from '$shared/types/home';
import { listOpenTodos, listRecentUpdates } from './operations';
import { getFocusGraph } from './focus-graph';

export const homeRouter = router({
  todos: procedure
    .input(z.object({ limit: z.number().int().min(1).max(200).optional() }))
    .query(({ ctx, input }) => listOpenTodos(ctx.reg, input.limit)),

  updates: procedure
    .input(z.object({ limit: z.number().int().min(1).max(200).optional() }))
    .query(({ ctx, input }) => listRecentUpdates(ctx.reg, input.limit)),

  graph: procedure
    .input(z.object({ focusType: z.enum(FOCUS_TYPES).optional(), focusId: z.string().min(1).optional() }).default({}))
    .query(({ ctx, input }) =>
      getFocusGraph(ctx.reg, input.focusType && input.focusId ? { type: input.focusType, id: input.focusId } : undefined)
    )
});
