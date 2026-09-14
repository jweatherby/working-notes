import { z } from 'zod';
import { ENTITY_TYPES } from '$shared/types/enums';
import { router, procedure } from '$shared/trpc/init';
import { listDocs, addDoc, updateDoc, removeDoc, reorderDocs, attachSourcePdf, getDocReadUrl } from './operations';
import { convertDocPdf, getPdfConversion } from './convert';

// Base64 inflates by a third; this stays under the 25M BODY_SIZE_LIMIT (~18 MB of PDF).
const MAX_PDF_BASE64_CHARS = 24_000_000;

export const docRouter = router({
  list: procedure
    .input(z.object({ entityType: z.enum(ENTITY_TYPES), entityId: z.string() }))
    .query(({ ctx, input }) => listDocs(ctx.reg, input.entityType, input.entityId)),

  add: procedure
    .input(z.object({
      entityType: z.enum(ENTITY_TYPES),
      entityId: z.string(),
      title: z.string().min(1).max(200)
    }))
    .mutation(({ ctx, input }) => addDoc(ctx.reg, input.entityType, input.entityId, input)),

  update: procedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).max(200).optional(),
      content: z.string().optional()
    }))
    .mutation(({ ctx, input }) => updateDoc(ctx.reg, input.id, input)),

  remove: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => removeDoc(ctx.reg, input.id)),

  reorder: procedure
    .input(z.object({
      entityType: z.enum(ENTITY_TYPES),
      entityId: z.string(),
      docIds: z.array(z.string())
    }))
    .mutation(({ ctx, input }) => reorderDocs(ctx.reg, input.entityType, input.entityId, input.docIds)),

  attachSource: procedure
    .input(z.object({
      docId: z.string(),
      contentType: z.literal('application/pdf'),
      dataBase64: z.string().max(MAX_PDF_BASE64_CHARS)
    }))
    .mutation(({ ctx, input }) => attachSourcePdf(ctx.reg, input.docId, input.contentType, input.dataBase64)),

  getReadUrl: procedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => getDocReadUrl(ctx.reg, input.id)),

  // Web app only (hidden from the CLI and MCP in cli/api.ts).
  convertPdf: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => convertDocPdf(ctx.reg, ctx.pdfConverter, ctx.notebook.id, input.id)),

  pdfConversion: procedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => getPdfConversion(ctx.pdfConverter, ctx.notebook.id, input.id))
});
