// tRPC context: the notebook a call runs against, its Registry (`reg`), and the
// notebook store for the `notebook` procedures. Routes forward `ctx.reg` (or a
// slice of it) into operations.
//
// Only the web app's context has `pdfConverter`, which runs the local Claude
// Code CLI. It isn't on the Registry, and the CLI and MCP server go without it.

import type { RequestEvent } from '@sveltejs/kit';
import { getPdfConverter } from '$shared/assist/pdf-converter.server';
import { getReadyRegistry } from '$shared/db/bootstrap.server';
import { getNotebookStore } from '$shared/notebooks/current.server';
import type { NotebookStore } from '$shared/notebooks/store.server';
import type { Registry } from '$shared/registry';
import type { NotebookInfo } from '$shared/types/notebook';
import type { PdfConverter } from '$shared/types/pdf-conversion';

export interface Context {
  readonly reg: Registry;
  readonly notebook: NotebookInfo;
  readonly notebooks: NotebookStore;
  readonly pdfConverter?: PdfConverter;
}

/** Used by the HTTP handler and by in-process callers (the CLI and MCP server). */
export const createNotebookContext = async (notebook: NotebookInfo): Promise<Context> => ({
  reg: await getReadyRegistry(notebook.id),
  notebook,
  notebooks: getNotebookStore()
});

/** `event.locals.notebook` is set by notebookHandle in hooks.server.ts. */
export const createContext = async (opts: { readonly event: RequestEvent }): Promise<Context> => ({
  ...(await createNotebookContext(opts.event.locals.notebook)),
  pdfConverter: getPdfConverter()
});
