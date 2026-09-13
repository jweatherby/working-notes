import { z } from 'zod';
import { router, procedure } from '$shared/trpc/init';
import {
  listBrandings,
  getBranding,
  createBranding,
  updateBranding,
  deleteBranding,
  uploadImage
} from './operations';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const brandingInput = z.object({
  name: z.string().min(1).max(200),
  iconUrl: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  primaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
  primaryFontColor: hexColor.optional(),
  accentFontColor: hexColor.optional(),
  isDefault: z.boolean().optional()
});

// Images are resized client-side (icon 256px, logo 800x200) before upload.
const MAX_IMAGE_BASE64_CHARS = 4_000_000;

export const brandingRouter = router({
  list: procedure.query(({ ctx }) => listBrandings(ctx.reg)),

  get: procedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => getBranding(ctx.reg, input.id)),

  create: procedure
    .input(brandingInput)
    .mutation(({ ctx, input }) => createBranding(ctx.reg, input)),

  update: procedure
    .input(z.object({ id: z.string() }).merge(brandingInput.partial()))
    .mutation(({ ctx, input: { id, ...data } }) => updateBranding(ctx.reg, id, data)),

  delete: procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => deleteBranding(ctx.reg, input.id)),

  uploadImage: procedure
    .input(z.object({
      brandingId: z.string(),
      type: z.enum(['icon', 'logo']),
      contentType: z.enum(['image/png', 'image/jpeg']),
      dataBase64: z.string().max(MAX_IMAGE_BASE64_CHARS)
    }))
    .mutation(({ ctx, input }) => uploadImage(ctx.reg, input))
});
