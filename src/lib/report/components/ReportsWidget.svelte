<script lang="ts">
  import { goto } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import type { EntityType } from '$shared/types/enums';

  interface ReportItem {
    readonly id: string;
    readonly title: string;
    readonly updatedAt: Date | string;
  }

  interface Props {
    readonly entityType: string;
    readonly entityId: string;
    readonly reports: readonly ReportItem[];
  }

  const { entityType, entityId, reports }: Props = $props();

  let creating = $state(false);
  let error = $state('');

  const createReport = async (): Promise<void> => {
    creating = true;
    error = '';
    try {
      const result = await trpc().report.create.mutate({
        entityType: entityType as EntityType,
        entityId,
        title: 'Untitled report'
      });
      if (result.ok) await goto(`/app/reports/${result.value.id}`);
      else error = result.error.message;
    } finally {
      creating = false;
    }
  };

  const formatDate = (d: Date | string): string =>
    (typeof d === 'string' ? new Date(d) : d).toLocaleDateString('en-CA');
</script>

<div class="reports-widget">
  <div class="widget-header">
    <h4>Reports</h4>
    <button class="add-btn" data-plain onclick={createReport} disabled={creating} aria-label="New report" title="New report">+</button>
  </div>
  {#if error}
    <p class="error">{error}</p>
  {/if}
  {#if reports.length === 0}
    <p class="muted">No reports yet.</p>
  {:else}
    <ul>
      {#each reports as report (report.id)}
        <li>
          <a href="/app/reports/{report.id}">{report.title}</a>
          <span class="date">{formatDate(report.updatedAt)}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style lang="scss">
  .widget-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    h4 {
      margin: 0;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-muted);
    }
  }
  .add-btn {
    all: unset;
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
    padding: 0 0.25rem;
    color: var(--color-muted);
    &:hover { color: var(--color-primary); }
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.3rem 0;
    font-size: 0.85rem;
    border-bottom: 1px solid var(--color-muted-border);
    a {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  .date {
    color: var(--color-muted);
    font-size: 0.75rem;
    white-space: nowrap;
  }
  .muted {
    color: var(--color-muted);
    font-size: 0.85rem;
    margin: 0;
  }
  .error {
    color: var(--color-danger);
    font-size: 0.8rem;
  }
</style>
