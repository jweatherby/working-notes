// Serves locally stored files (doc PDFs, branding images) from settings.dataDir/files.
// The storage client rejects keys that resolve outside the files root.

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRegistry } from '$shared/registry.server';

export const GET: RequestHandler = async ({ params }) => {
  const file = await getRegistry().storage.readObject(params.key);
  if (!file) error(404, 'Not found');

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      'content-type': file.contentType,
      'cache-control': 'no-store'
    }
  });
};
