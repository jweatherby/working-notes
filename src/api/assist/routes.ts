import { z } from 'zod';
import { ENTITY_TYPES } from '$shared/types/enums';
import { router, procedure } from '$shared/trpc/init';
import { CHAT_LIMITS } from '$shared/assist/claude-cli';
import { sendChat, getChatStatus } from './chat';

// Web app only (hidden from the CLI and MCP in cli/api.ts): from there, Claude
// is already the one reading the notebook.
export const chatRouter = router({
  send: procedure
    .input(z.object({
      chatId: z.string().uuid(),
      entityType: z.enum(ENTITY_TYPES),
      entityName: z.string().max(500),
      // Longer page text is cut to CHAT_LIMITS.pageText in the prompt.
      pageText: z.string().max(CHAT_LIMITS.pageText * 2),
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(CHAT_LIMITS.message)
      })).min(1).max(CHAT_LIMITS.messages)
    }))
    .mutation(({ ctx, input }) => sendChat(ctx.pageChat, ctx.notebook.id, input)),

  status: procedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(({ ctx, input }) => getChatStatus(ctx.pageChat, ctx.notebook.id, input.chatId))
});
