// App-wide chrome data: the current notebook and the others (for the switcher),
// and the default branding icon shown in the nav.

import { getDefaultBranding } from '$api/branding/operations';
import { listNotebooks } from '$api/notebook/operations';
import { getReadyRegistry } from '$shared/db/bootstrap.server';
import { getNotebookStore } from '$shared/notebooks/current.server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const [branding, notebooks] = await Promise.all([
    getReadyRegistry(locals.notebook.id).then((reg) => getDefaultBranding(reg)),
    listNotebooks({ notebooks: getNotebookStore() }, locals.notebook.id)
  ]);
  return {
    defaultBrandingIconUrl: branding.ok ? branding.value?.iconUrl ?? null : null,
    // The notebook's default branding colours the app (see `.branded` in styles/_tokens.scss).
    brandTheme: branding.ok && branding.value
      ? { primary: branding.value.primaryColor, primaryText: branding.value.primaryFontColor }
      : null,
    notebook: locals.notebook,
    notebooks: notebooks.ok ? notebooks.value : []
  };
};
