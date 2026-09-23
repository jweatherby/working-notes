import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { trpc } from '$shared/trpc/client';
import { resolvePrintOptions } from '$lib/doc/print-options';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
  const client = trpc(fetch);
  const [doc, brandings] = await Promise.all([
    client.doc.get.query({ id: params.id }),
    client.branding.list.query()
  ]);
  if (!doc.ok) error(404, 'Doc not found');
  const brandingList = brandings.ok ? brandings.value : [];
  const options = resolvePrintOptions(url.searchParams, brandingList);
  const branding = options.brandingId ? await client.branding.get.query({ id: options.brandingId }) : null;
  return {
    doc: doc.value,
    brandings: brandingList,
    options,
    branding: branding?.ok ? branding.value : null
  };
};
