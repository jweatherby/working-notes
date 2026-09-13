<script lang="ts">
  import type { PageData } from './$types';
  import { goto, invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import MilkdownEditor from '$lib/shared/components/MilkdownEditor.svelte';

  const { data }: { data: PageData } = $props();
  const report = $derived(data.report);

  let title = $state(data.report.title);
  let content = $state(data.report.content);
  let brandingId = $state(data.report.brandingId ?? '');
  let mode = $state<'editor' | 'markdown'>('editor');
  let saving = $state(false);
  let saved = $state(false);
  let error = $state('');
  let confirmDelete = $state(false);

  const effectiveBrandingId = $derived(brandingId || data.defaultBrandingId || '');
  const activeBranding = $derived(data.brandings.find((b) => b.id === effectiveBrandingId) ?? null);

  const handleSave = async (): Promise<void> => {
    saving = true;
    error = '';
    try {
      const result = await trpc().report.update.mutate({
        id: report.id,
        title: title.trim() || 'Untitled report',
        content,
        brandingId: brandingId || null
      });
      if (!result.ok) {
        error = result.error.message;
        return;
      }
      saved = true;
      setTimeout(() => { saved = false; }, 2000);
      await invalidateAll();
    } finally {
      saving = false;
    }
  };

  const handleDelete = async (): Promise<void> => {
    const result = await trpc().report.remove.mutate({ id: report.id });
    if (result.ok) await goto(report.entityName ? report.entityPath : '/app/reports');
    else error = result.error.message;
  };

  const CHART_EXAMPLE = [
    '```chart',
    '{',
    '  "type": "bar",',
    '  "title": "Velocity",',
    '  "labels": ["Sprint 1", "Sprint 2", "Sprint 3"],',
    '  "series": [{ "label": "Points", "values": [21, 34, 29] }]',
    '}',
    '```'
  ].join('\n');
</script>

<svelte:head><title>{report.title} - Report</title></svelte:head>

<nav aria-label="breadcrumb">
  <ul>
    <li><a href="/app/reports">Reports</a></li>
    {#if report.entityName}
      <li><a href={report.entityPath}>{report.entityName}</a></li>
    {/if}
    <li>{report.title}</li>
  </ul>
</nav>

<div class="report-toolbar">
  <input class="title-input" bind:value={title} aria-label="Report title" />
  <label class="branding-picker">
    Branding
    <select bind:value={brandingId}>
      <option value="">
        {data.defaultBrandingId ? `Default (${data.brandings.find((b) => b.id === data.defaultBrandingId)?.name})` : 'None'}
      </option>
      {#each data.brandings as b (b.id)}
        <option value={b.id}>{b.name}</option>
      {/each}
    </select>
  </label>
  <div class="actions">
    {#if saved}<span class="saved">Saved</span>{/if}
    <button onclick={handleSave} disabled={saving} aria-busy={saving}>Save</button>
    <a href="/app/reports/{report.id}/print" target="_blank" rel="noopener" role="button" class="outline">Print / PDF</a>
  </div>
</div>

{#if error}
  <pre class="error">{error}</pre>
{/if}

<div class="mode-tabs">
  <button class:active={mode === 'editor'} data-plain onclick={() => { mode = 'editor'; }}>Editor</button>
  <button class:active={mode === 'markdown'} data-plain onclick={() => { mode = 'markdown'; }}>Markdown</button>
</div>

{#if mode === 'editor'}
  {#key effectiveBrandingId}
    <MilkdownEditor
      value={content}
      onChange={(md) => { content = md; }}
      branding={activeBranding}
    />
  {/key}
{:else}
  <textarea class="markdown-input" bind:value={content} rows={24} spellcheck="false"></textarea>
{/if}

<details class="chart-help">
  <summary>Chart syntax</summary>
  <p>Add a fenced <code>chart</code> block. Types: <code>bar</code>, <code>line</code>, <code>radar</code>; up to 6 series, each with one value per label. Optional <code>title</code>, <code>min</code>, <code>max</code>.</p>
  <pre>{CHART_EXAMPLE}</pre>
</details>

<div class="danger-zone">
  {#if confirmDelete}
    <span>Delete this report?</span>
    <button class="outline secondary" onclick={handleDelete}>Yes, delete</button>
    <button class="outline secondary" onclick={() => { confirmDelete = false; }}>Cancel</button>
  {:else}
    <button class="outline secondary" onclick={() => { confirmDelete = true; }}>Delete report</button>
  {/if}
</div>

<style lang="scss">
  .report-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .title-input {
    flex: 1;
    min-width: 16rem;
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
  .branding-picker {
    font-size: 0.8rem;
    select {
      margin: 0;
    }
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    button, a {
      margin: 0;
    }
  }
  .saved {
    font-size: 0.8rem;
    color: var(--color-success);
  }
  .error {
    color: var(--color-danger);
    border: 1px solid var(--color-danger);
    background: none;
    white-space: pre-wrap;
    font-size: 0.8rem;
  }
  .mode-tabs {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-muted-border);
    button {
      padding: 0.3rem 0;
      font-size: 0.85rem;
      color: var(--color-muted);
      border-bottom: 2px solid transparent;
      &.active {
        color: var(--color-primary);
        border-bottom-color: var(--color-primary);
      }
    }
  }
  .markdown-input {
    width: 100%;
    font-family: monospace;
    font-size: 0.85rem;
    min-height: 400px;
  }
  .chart-help {
    margin-top: 1.5rem;
    font-size: 0.85rem;
    pre {
      font-size: 0.8rem;
    }
  }
  .danger-zone {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 2rem;
    font-size: 0.85rem;
    button {
      margin: 0;
    }
  }
</style>
