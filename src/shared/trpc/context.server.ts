// tRPC context. Exposes `reg` (the Registry) to every procedure.
// Routes forward `ctx.reg` (or a slice of it) into operations.

import type { RequestEvent } from '@sveltejs/kit';
import { getRegistry } from '$shared/registry.server';
import type { Registry } from '$shared/registry';

export interface Context {
  readonly reg: Registry;
}

export const createContext = async (_opts: { readonly event: RequestEvent }): Promise<Context> => ({
  reg: getRegistry()
});
