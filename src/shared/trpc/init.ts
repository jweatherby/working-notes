// tRPC initialization. Exports the primitives used by every domain router.
// Local-only and single-user: there is no auth. The security boundary is the
// network guard in hooks.server.ts (loopback Host + LOCAL_HEADER).

import { initTRPC } from '@trpc/server';
import type { Context } from './context.server';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const middleware = t.middleware;
export const procedure = t.procedure;
/** In-process callers (the CLI) run procedures with the same validation, without HTTP. */
export const createCallerFactory = t.createCallerFactory;
