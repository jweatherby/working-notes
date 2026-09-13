import { z } from 'zod';
import { ARCHIVE_FILTERS, PAGE_KINDS } from '$shared/types/enums';
import { router, procedure } from '$shared/trpc/init';
import { setArchived } from '$api/_archive';
import { createPage, deletePage, getPage, listPages, updatePage } from './operations';

// Values are validated per kind in the operation (src/shared/types/pages.ts).
const properties = z.record(z.union([z.string(), z.number(), z.null()]));

export const pageRouter = router({
  list: procedure
    .input(z.object({
      kind: z.enum(PAGE_KINDS).optional(),
      parentId: z.string().nullable().optional(),
      archived: z.enum(ARCHIVE_FILTERS).default('exclude')
    }).default({}))
    .query(({ ctx, input }) => listPages(ctx.reg, input)),

  get: procedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => getPage(ctx.reg, input.id)),

  create: procedure
    .input(z.object({
      title: z.string().min(1).max(200),
      kind: z.enum(PAGE_KINDS).optional(),
      parentId: z.string().optional(),
      content: z.string().optional(),
      properties: properties.optional()
    }))
    .mutation(({ ctx, input }) => createPage(ctx.reg, input)),

  update: procedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).max(200).optional(),
      kind: z.enum(PAGE_KINDS).optional(),
      parentId: z.string().nullable().optional(),
      content: z.string().optional(),
      properties: properties.optional()
    }))
    .mutation(({ ctx, input: { id, ...data } }) => updatePage(ctx.reg, id, data)),

  archive: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => setArchived(ctx.reg, 'PAGE', input.id, true)),

  unarchive: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => setArchived(ctx.reg, 'PAGE', input.id, false)),

  delete: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => deletePage(ctx.reg, input.id))
});
