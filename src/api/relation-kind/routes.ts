import { z } from 'zod';
import { router, procedure } from '$shared/trpc/init';
import { createRelationKind, deleteRelationKind, getRelationKind, listRelationKinds, updateRelationKind } from './operations';

export const relationKindRouter = router({
  list: procedure
    .query(({ ctx }) => listRelationKinds(ctx.reg)),

  get: procedure
    .input(z.object({ key: z.string() }))
    .query(({ ctx, input }) => getRelationKind(ctx.reg, input.key)),

  // "Parent of" / "Child of": label reads from the `from` end, inverseLabel from the `to` end.
  // Leave inverseLabel out for a kind with no direction ("Friend of").
  create: procedure
    .input(z.object({
      key: z.string().max(40),
      label: z.string().trim().min(1).max(60),
      inverseLabel: z.string().trim().min(1).max(60).optional(),
      symmetric: z.boolean().optional(),
      peopleOnly: z.boolean().optional(),
      // The `to` end has at most one (a person has one lead): adding another replaces it.
      exclusive: z.boolean().optional()
    }))
    .mutation(({ ctx, input }) => createRelationKind(ctx.reg, input)),

  update: procedure
    .input(z.object({
      key: z.string(),
      label: z.string().trim().min(1).max(60).optional(),
      inverseLabel: z.string().trim().min(1).max(60).optional(),
      sortOrder: z.number().int().optional()
    }))
    .mutation(({ ctx, input: { key, ...data } }) => updateRelationKind(ctx.reg, key, data)),

  delete: procedure
    .input(z.object({ key: z.string(), moveTo: z.string().optional() }))
    .mutation(({ ctx, input }) => deleteRelationKind(ctx.reg, input.key, input.moveTo))
});
