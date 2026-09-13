// The app's tRPC procedures, called in-process against the local notebook.
// Shared by the CLI (main.ts) and its MCP server (mcp.ts). Import it only after
// the entry point has changed to the repo directory, because settings resolve paths from there.

import { TRPCError } from '@trpc/server';
import { appRouter } from '$shared/trpc/router';
import { createCallerFactory } from '$shared/trpc/init';
import { listProcedures, type ProcedureMeta } from '$shared/trpc/meta';
import { getRegistry } from '$shared/registry.server';
import { ensureDatabase } from '$shared/db/bootstrap.server';

export const procedures: readonly ProcedureMeta[] = listProcedures(appRouter, new Set(['trpcMeta.list']));

export interface InputIssue {
  /** Dotted path of the offending field; empty for the input as a whole. */
  readonly path: string;
  readonly message: string;
}

export type CallOutcome =
  | { readonly kind: 'result'; readonly result: unknown; readonly failed: boolean }
  | { readonly kind: 'invalid'; readonly issues: readonly InputIssue[] };

let databaseReady: Promise<unknown> | null = null;

const zodIssues = (error: unknown): readonly InputIssue[] => {
  const issues = (error as { issues?: ReadonlyArray<{ path: readonly (string | number)[]; message: string }> } | undefined)?.issues ?? [];
  return issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
};

/** Calls a procedure by name. Invalid input comes back as issues; any other error throws. */
export const callProcedure = async (name: string, input: unknown): Promise<CallOutcome> => {
  if (!procedures.some((p) => p.name === name)) throw new Error(`Unknown procedure: ${name}`);
  databaseReady ??= ensureDatabase();
  await databaseReady;

  const caller = createCallerFactory(appRouter)({ reg: getRegistry() });
  const call = name
    .split('.')
    .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], caller) as (value: unknown) => Promise<unknown>;

  try {
    const result = await call(input);
    const failed = result !== null && typeof result === 'object' && 'ok' in result && result.ok === false;
    return { kind: 'result', result, failed };
  } catch (error) {
    const issues = error instanceof TRPCError ? zodIssues(error.cause) : [];
    if (issues.length) return { kind: 'invalid', issues };
    throw error;
  }
};

export const disconnect = (): Promise<void> => getRegistry().prisma.$disconnect();
