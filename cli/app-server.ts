// Serves the built UI from the standalone binary: static files from disk, and
// everything else (pages, the API, the guard in hooks.server.ts) through the
// SvelteKit server. Loopback only, like `bun run start`.

import { stat } from 'node:fs/promises';
import { join, normalize, sep } from 'node:path';

/** The parts of SvelteKit's generated `Server` (build/server/index.js) this uses. */
export interface SvelteKitServer {
  readonly init: (options: { readonly env: Record<string, string>; readonly read?: (file: string) => ReadableStream }) => Promise<void>;
  readonly respond: (request: Request, options: { readonly getClientAddress: () => string }) => Promise<Response>;
}

export const APP_HOST = '127.0.0.1';
export const APP_PORT = 5173;

const IMMUTABLE = '/_app/immutable/';

/** The file a request path names inside clientDir, or null if it would escape it or is malformed. */
export const staticFilePath = (clientDir: string, pathname: string): string | null => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const root = clientDir.endsWith(sep) ? clientDir : `${clientDir}${sep}`;
  const full = normalize(join(clientDir, decoded));
  return full.startsWith(root) && full.length > root.length ? full : null;
};

export interface ServeAppOptions {
  readonly server: SvelteKitServer;
  readonly clientDir: string;
  readonly port?: number;
}

export const serveApp = async (options: ServeAppOptions): Promise<void> => {
  const { server, clientDir } = options;
  const port = options.port ?? Number(process.env['PORT'] || APP_PORT);
  await server.init({ env: process.env as Record<string, string>, read: (file) => Bun.file(join(clientDir, file)).stream() });

  try {
    const http = Bun.serve({
      hostname: APP_HOST,
      port,
      async fetch(request, bunServer) {
        const url = new URL(request.url);
        if (request.method === 'GET' || request.method === 'HEAD') {
          const path = staticFilePath(clientDir, url.pathname);
          const file = path ? await stat(path).catch(() => null) : null;
          if (path && file?.isFile()) {
            const headers: Record<string, string> = url.pathname.startsWith(IMMUTABLE) ? { 'cache-control': 'public, max-age=31536000, immutable' } : {};
            return new Response(Bun.file(path), { headers });
          }
        }
        return server.respond(request, { getClientAddress: () => bunServer.requestIP(request)?.address ?? APP_HOST });
      }
    });
    console.error(`Working Notes is running at http://${APP_HOST}:${http.port}/app`);
  } catch (error) {
    const inUse = (error as { code?: string }).code === 'EADDRINUSE';
    console.error(inUse ? `Something is already running on ${APP_HOST}:${port}. If it's Working Notes, open http://${APP_HOST}:${port}/app` : error);
    process.exit(1);
  }
};
