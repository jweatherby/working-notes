import { z } from 'zod';
import { ENTITY_TYPES } from '$shared/types/enums';
import { router, procedure } from '$shared/trpc/init';
import { listLinks, findLinks, addLink, removeLink } from './operations';

const entityTypeEnum = z.enum(ENTITY_TYPES);

export const linkRouter = router({
  list: procedure
    .input(z.object({ entityType: entityTypeEnum, entityId: z.string() }))
    .query(({ ctx, input }) => listLinks(ctx.reg, input.entityType, input.entityId)),

  find: procedure
    .input(z.object({
      url: z.string().min(1).max(2000).optional(),
      contains: z.string().min(1).max(200).optional()
    }))
    .query(({ ctx, input }) => findLinks(ctx.reg, input)),

  add: procedure
    .input(z.object({
      entityType: entityTypeEnum,
      entityId: z.string(),
      url: z.string().url().max(2000),
      title: z.string().max(200).optional()
    }))
    .mutation(({ ctx, input }) => addLink(ctx.reg, input.entityType, input.entityId, input)),

  remove: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => removeLink(ctx.reg, input.id)),
});
