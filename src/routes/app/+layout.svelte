<script lang="ts">
  import AppShell from "$lib/common/AppShell.svelte";
  import QuickFinder from "$lib/common/QuickFinder.svelte";
  import CreateTodoPopup from "$lib/todo/components/CreateTodoPopup.svelte";
  import { layoutConfig } from "$lib/stores/layout";

  import type { LayoutData } from "./$types";

  let { children, data } = $props<{ children: any; data: LayoutData }>();
</script>

<QuickFinder />
<CreateTodoPopup />

<AppShell
  showInfoPanel={true}
  collapseInfoPanelOnMedium={$layoutConfig.collapseInfoPanel}
  brandIconUrl={data.defaultBrandingIconUrl ?? null}
>
  {@render children()}
</AppShell>
