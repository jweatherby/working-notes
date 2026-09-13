<script lang="ts">
  import type { PageData } from './$types';
  import Popup from '$lib/common/Popup.svelte';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import PageForm from '$lib/page/components/PageForm.svelte';
  import { openPopup, closePopup } from '$lib/ui/popup-url';
  import { PAGE_KINDS, type PageKind } from '$shared/types/enums';
  import { PAGE_KIND_FIELDS, type PageSummary } from '$shared/types/pages';
  import { buildTree, flattenTree } from '$shared/utils/hierarchy';
  import { PAGE_KIND_LABELS, formatPropertyValue } from '$lib/page/utils';

  const { data } = $props<{ data: PageData }>();
  const pages = $derived(data.pages as readonly PageSummary[]);

  let kindFilter = $state<PageKind | 'ALL'>('ALL');

  // Sub-pages whose parent is filtered out show at the top level.
  const rows = $derived(
    flattenTree(buildTree(pages.filter((p) => kindFilter === 'ALL' || p.kind === kindFilter), (p) => p.parentId)),
  );

  const details = (page: PageSummary): string =>
    PAGE_KIND_FIELDS[page.kind]
      .flatMap((field) => {
        const value = page.properties[field.key];
        return value === undefined ? [] : [`${field.label}: ${formatPropertyValue(field, value)}`];
      })
      .slice(0, 3)
      .join(' · ');

  const formatDate = (d: Date | string): string => new Date(d).toLocaleDateString('en-CA');

  const handleCreated = () => closePopup({ invalidate: true });
</script>

<svelte:head><title>Wiki</title></svelte:head>

<div class="page">
  <PageHeader title="Wiki" description="Policies, products, software, decisions and anything else worth writing down.">
    <button type="button" class="btn primary" onclick={() => openPopup('new-page')}>Add page</button>
  </PageHeader>

  {#if data.pages.length > 0}
    <div class="toolbar filters">
      <select class="sm" bind:value={kindFilter} aria-label="Filter by kind">
        <option value="ALL">All kinds</option>
        {#each PAGE_KINDS as kind (kind)}
          <option value={kind}>{PAGE_KIND_LABELS[kind]}</option>
        {/each}
      </select>
    </div>

    {#if rows.length > 0}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Kind</th>
              <th>Details</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {#each rows as { item: page, depth } (page.id)}
              <tr>
                <td>
                  <span class="page-name" style="--depth: {depth}">
                    {#if depth > 0}<span class="tree-indent">└</span>{/if}
                    <a href={page.path}>{page.title}</a>
                  </span>
                </td>
                <td><span class="badge">{PAGE_KIND_LABELS[page.kind]}</span></td>
                <td class="text-2">{details(page)}</td>
                <td class="text-2">{formatDate(page.updatedAt)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <EmptyState message="No pages of this kind." />
    {/if}
  {:else}
    <EmptyState message="No pages yet." boxed>
      <button type="button" class="btn sm" onclick={() => openPopup('new-page')}>Add page</button>
    </EmptyState>
  {/if}
</div>

<Popup id="new-page" title="Add page">
  <PageForm onSuccess={handleCreated} onCancel={() => closePopup()} />
</Popup>

<style lang="scss">
  .filters {
    margin-bottom: var(--sp-3);
    select { width: auto; min-width: 140px; }
  }
  .page-name {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    padding-left: calc(var(--depth) * var(--sp-5));
  }
  .tree-indent {
    color: var(--border-strong);
    font-size: var(--fs-sm);
  }
</style>
