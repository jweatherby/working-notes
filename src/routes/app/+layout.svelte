<script lang="ts">
  import AppShell from "$lib/common/AppShell.svelte";
  import QuickFinder from "$lib/common/QuickFinder.svelte";
  import CreateTodoPopup from "$lib/todo/components/CreateTodoPopup.svelte";
  import NewNotebookPopup from "$lib/notebook/components/NewNotebookPopup.svelte";
  import { layoutConfig } from "$lib/stores/layout";

  import type { LayoutData } from "./$types";

  let { children, data } = $props<{ children: any; data: LayoutData }>();
</script>

<!-- The notebook's default branding recolours the accent tokens for everything below, popups included. -->
<div
  class:branded={!!data.brandTheme}
  style:--brand-primary={data.brandTheme?.primary}
  style:--brand-primary-text={data.brandTheme?.primaryText}
>
  <QuickFinder />
  <CreateTodoPopup />
  <NewNotebookPopup />

  <AppShell
    showInfoPanel={!$layoutConfig.hideInfoPanel}
    collapseInfoPanelOnMedium={$layoutConfig.collapseInfoPanel}
    brandIconUrl={data.defaultBrandingIconUrl ?? null}
    notebook={data.notebook}
    notebooks={data.notebooks}
  >
    {@render children()}
  </AppShell>
</div>
